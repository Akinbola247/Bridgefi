/**
 * On-Ramp Service
 * Handles NGN → USDC conversion flow
 */

const { ethers } = require('ethers');
const paystackService = require('./paystack');
const exchangeRateService = require('./exchangeRate');
const transactionHistory = require('./transactionHistory');

const MANTLE_RPC_URL = process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
const USDC_TOKEN_ADDRESS = process.env.USDC_TOKEN_ADDRESS || '0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F';
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

// ERC20 ABI (minimal for transfer)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
];

// Quote storage (in production, use database)
const quotes = new Map();

/**
 * Initiate on-ramp transaction
 */
async function initiateOnramp(ngnAmount, userAddress) {
  // Validate inputs
  const ngn = parseFloat(ngnAmount);
  if (isNaN(ngn) || ngn <= 0) {
    throw new Error('Invalid NGN amount');
  }

  if (!ethers.utils.isAddress(userAddress)) {
    throw new Error('Invalid user address');
  }

  // Get exchange rate
  const rate = await exchangeRateService.getUSDCToNGNRate();
  const usdcAmount = ngn * rate.ngnToUsdc;

  // Calculate fees (if any)
  const fees = 0; // No fees for now, can add later
  const finalUsdcAmount = usdcAmount - fees;

  // Generate unique reference
  const reference = `ONRAMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store quote
  quotes.set(reference, {
    ngnAmount: ngn,
    usdcAmount: finalUsdcAmount,
    userAddress: userAddress,
    rate: rate.ngnToUsdc,
    timestamp: Date.now(),
    status: 'pending',
  });

  // Record transaction
  transactionHistory.recordTransaction({
    type: 'onramp',
    userAddress: userAddress,
    amount: finalUsdcAmount,
    currency: 'USDC',
    status: 'pending',
    reference: reference,
    metadata: {
      ngnAmount: ngn,
      exchangeRate: rate.ngnToUsdc,
    },
  });

  // Initialize Paystack payment
  // Note: will get email from user profile in production
  const userEmail = process.env.ONRAMP_DEFAULT_EMAIL || `user_${userAddress.slice(0, 8)}@bridgefi.app`;
  
  const paymentData = await paystackService.initializePayment(
    ngn,
    userEmail,
    reference,
    {
      userAddress: userAddress,
      usdcAmount: finalUsdcAmount,
      type: 'onramp',
    }
  );

  console.log(`✅ Onramp quote created: ${reference} (${quotes.size} quotes in memory)`);

  return {
    quoteId: reference,
    ngnAmount: ngn,
    usdcAmount: finalUsdcAmount,
    exchangeRate: rate.ngnToUsdc,
    paymentLink: paymentData.data.authorization_url,
    reference: reference,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  };
}

/**
 * Verify payment and send USDC
 */
async function verifyPayment(reference, quoteData = null) {
  let quote = quotes.get(reference);
  
  // If quote not found in memory (e.g., server restarted), try to recreate from quoteData
  if (!quote) {
    if (quoteData && quoteData.userAddress && quoteData.ngnAmount) {
      console.log(`⚠️ Quote ${reference} not found in memory. Recreating from provided data...`);
      
      // Recreate quote from provided data
      // We need to recalculate USDC amount from NGN amount
      const rate = await exchangeRateService.getUSDCToNGNRate();
      const usdcAmount = quoteData.ngnAmount * rate.ngnToUsdc;
      
      quote = {
        ngnAmount: quoteData.ngnAmount,
        usdcAmount: usdcAmount,
        userAddress: quoteData.userAddress,
        rate: rate.ngnToUsdc,
        timestamp: Date.now(),
        status: 'pending',
      };
      
      // Store the recreated quote
      quotes.set(reference, quote);
      console.log(`✅ Quote ${reference} recreated successfully (USDC: ${usdcAmount.toFixed(6)})`);
    } else {
      console.error(`❌ Quote ${reference} not found and insufficient quote data provided`);
      console.error(`   Quote data received:`, quoteData);
      console.error(`   Available quotes:`, Array.from(quotes.keys()));
      throw new Error(`Quote not found. If the server was restarted, the quote may have been lost. Please try initiating a new transaction.`);
    }
  } else {
    console.log(`✅ Quote ${reference} found in memory`);
  }

  // Check if already processed
  if (quote.status === 'completed') {
    return {
      success: true,
      txHash: quote.txHash,
      usdcAmount: quote.usdcAmount,
    };
  }

  // Verify payment with Paystack
  console.log(`🔍 Verifying payment with Paystack for reference: ${reference}`);
  const verification = await paystackService.verifyPayment(reference);

  if (verification.data.status !== 'success') {
    console.log(`⚠️ Payment not successful yet. Status: ${verification.data.status}`);
    throw new Error(`Payment not successful. Status: ${verification.data.status}`);
  }

  console.log(`✅ Payment verified successfully. Sending USDC to ${quote.userAddress}...`);

  // Send USDC to user
  const txHash = await sendUSDCToUser(quote.userAddress, quote.usdcAmount, reference);

  // Update quote status
  quote.status = 'completed';
  quote.txHash = txHash;

  // Update transaction status
  transactionHistory.updateTransactionStatus(
    reference,
    'completed',
    {
      txHash: txHash,
      metadata: {
        usdcAmount: quote.usdcAmount,
        ngnAmount: quote.ngnAmount,
      },
    }
  );

  return {
    success: true,
    txHash: txHash,
    usdcAmount: quote.usdcAmount,
  };
}

/**
 * Handle payment success webhook
 */
async function handlePaymentSuccess(paymentData) {
  const reference = paymentData.reference;

  if (!reference.startsWith('ONRAMP_')) {
    return; // Not an onramp transaction
  }

  try {
    await verifyPayment(reference);
    console.log(`✅ Onramp completed for reference: ${reference}`);
  } catch (error) {
    console.error(`❌ Failed to process onramp for ${reference}:`, error);
  }
}

/**
 * Send USDC to user wallet
 */
async function sendUSDCToUser(userAddress, usdcAmount, reference) {
  if (!TREASURY_PRIVATE_KEY) {
    throw new Error('Treasury private key not configured');
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(MANTLE_RPC_URL);
    const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);

    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, wallet);

    // Convert USDC amount to wei (18 decimals)
    const amountWei = ethers.utils.parseEther(usdcAmount.toString());

    // Check treasury balance
    const balance = await usdcContract.balanceOf(wallet.address);
    if (balance.lt(amountWei)) {
      throw new Error('Insufficient treasury balance');
    }

    // Send USDC
    const tx = await usdcContract.transfer(userAddress, amountWei);
    console.log(`📤 Sending ${usdcAmount} USDC to ${userAddress}, TX: ${tx.hash}`);

    // Wait for confirmation
    await tx.wait(1);

    // Update quote with tx hash
    const quote = quotes.get(reference);
    if (quote) {
      quote.txHash = tx.hash;
    }

    return tx.hash;
  } catch (error) {
    console.error('Error sending USDC:', error);
    throw new Error(`Failed to send USDC: ${error.message}`);
  }
}

module.exports = {
  initiateOnramp,
  verifyPayment,
  handlePaymentSuccess,
};

