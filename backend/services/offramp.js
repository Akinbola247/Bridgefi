/**
 * Off-Ramp Service
 * Handles USDC → NGN conversion flow
 */

const paystackService = require('./paystack');
const exchangeRateService = require('./exchangeRate');
const transactionHistory = require('./transactionHistory');

// Quote storage. using simple in-memory storage for now
const quotes = new Map();

// Mock transfer history (for verification in mock mode)
const mockTransfers = new Map();

// Helper function to log quote stats
function logQuoteStats() {
  console.log(`📊 Quote storage stats: ${quotes.size} quotes in memory`);
  if (quotes.size > 0) {
    const quoteIds = Array.from(quotes.keys());
    console.log(`   Quote IDs: ${quoteIds.slice(0, 5).join(', ')}${quoteIds.length > 5 ? '...' : ''}`);
  }
}

/**
 * Initiate off-ramp transaction
 */
async function initiateOfframp(usdcAmount, bankAccount, bankCode, accountName) {
  // Validate inputs
  const usdc = parseFloat(usdcAmount);
  if (isNaN(usdc) || usdc <= 0) {
    throw new Error('Invalid USDC amount');
  }

  if (!bankAccount || !bankCode || !accountName) {
    throw new Error('Missing bank account details');
  }

  // Get exchange rate
  const rate = await exchangeRateService.getUSDCToNGNRate();
  const ngnAmount = usdc * rate.usdcToNgn;

  // Calculate fees (if any)
  const fees = 0; // No fees for now, can add later
  const finalNgnAmount = ngnAmount - fees;

  // Generate unique reference
  const reference = `OFFRAMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store quote
  quotes.set(reference, {
    usdcAmount: usdc,
    ngnAmount: finalNgnAmount,
    bankAccount: bankAccount,
    bankCode: bankCode,
    accountName: accountName,
    rate: rate.usdcToNgn,
    timestamp: Date.now(),
    status: 'pending',
    txHash: null,
    userAddress: null, // Will be set when executing
  });

  console.log(`✅ Quote created: ${reference} (${quotes.size} quotes in memory)`);
  logQuoteStats();

  return {
    quoteId: reference,
    usdcAmount: usdc,
    ngnAmount: finalNgnAmount,
    exchangeRate: rate.usdcToNgn,
    bankAccount: bankAccount,
    accountName: accountName,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
}

/**
 * Execute off-ramp after USDC is received
 */
async function executeOfframp(quoteId, txHash, quoteData = null) {
  console.log(`🔍 Looking for quote: ${quoteId}`);
  logQuoteStats();
  
  let quote = quotes.get(quoteId);
  let userAddress = null;
  
  // If quote not found in memory (e.g., server restarted), try to recreate from quoteData
  if (!quote) {
    console.log(`⚠️ Quote ${quoteId} not found in memory`);
    
    if (quoteData && quoteData.bankAccount && quoteData.bankCode && quoteData.accountName) {
      console.log(`🔄 Recreating quote from provided data...`);
      console.log(`   Quote data:`, {
        usdcAmount: quoteData.usdcAmount,
        bankAccount: quoteData.bankAccount,
        bankCode: quoteData.bankCode,
        accountName: quoteData.accountName,
      });
      
      // Recreate quote from provided data
      // We need to recalculate NGN amount from USDC amount
      const rate = await exchangeRateService.getUSDCToNGNRate();
      const ngnAmount = quoteData.usdcAmount * rate.usdcToNgn;
      
      quote = {
        usdcAmount: quoteData.usdcAmount,
        ngnAmount: ngnAmount,
        bankAccount: quoteData.bankAccount,
        bankCode: quoteData.bankCode,
        accountName: quoteData.accountName,
        rate: rate.usdcToNgn,
        timestamp: Date.now(),
        status: 'pending',
        txHash: null,
        userAddress: quoteData.userAddress || null,
      };
      
      // Store the recreated quote
      quotes.set(quoteId, quote);
      console.log(`✅ Quote ${quoteId} recreated successfully (NGN: ₦${ngnAmount.toFixed(2)})`);
    } else {
      console.error(`❌ Quote ${quoteId} not found and insufficient quote data provided`);
      console.error(`   Quote data received:`, quoteData);
      console.error(`   Available quotes:`, Array.from(quotes.keys()));
      throw new Error(`Transaction ${quoteId} not found. If the server was restarted, the quote may have been lost. Please try initiating a new transaction.`);
    }
  } else {
    console.log(`✅ Quote ${quoteId} found in memory`);
  }

  // Get user address from quoteData if not in quote
  userAddress = quote.userAddress || (quoteData && quoteData.userAddress) || null;

  if (quote.status !== 'pending' && quote.status !== 'processing') {
    throw new Error(`Quote already processed with status: ${quote.status}`);
  }

  // Verify transaction 
  // For now, using the txHash
  quote.txHash = txHash;
  quote.status = 'processing';
  
  // Record transaction (use quoteId as transaction ID to ensure we can update it later)
  if (userAddress) {
    // Check if transaction already exists
    const existingTx = transactionHistory.getTransactionById(quoteId);
    if (existingTx) {
      // Update existing transaction
      try {
        transactionHistory.updateTransactionStatus(quoteId, 'processing', {
          txHash: txHash,
          metadata: {
            ngnAmount: quote.ngnAmount,
            bankAccount: quote.bankAccount,
            bankCode: quote.bankCode,
            accountName: quote.accountName,
            exchangeRate: quote.rate,
          },
        });
        console.log(`✅ Updated existing transaction: ${quoteId}`);
      } catch (updateError) {
        console.warn('Could not update transaction:', updateError);
      }
    } else {
      // Record new transaction
      try {
        transactionHistory.recordTransaction({
          id: quoteId, // Use quoteId as transaction ID
          type: 'offramp',
          userAddress: userAddress,
          amount: quote.usdcAmount,
          currency: 'USDC',
          status: 'processing',
          txHash: txHash,
          reference: quoteId,
          metadata: {
            ngnAmount: quote.ngnAmount,
            bankAccount: quote.bankAccount,
            bankCode: quote.bankCode,
            accountName: quote.accountName,
            exchangeRate: quote.rate,
          },
        });
        console.log(`✅ Recorded new transaction: ${quoteId}`);
      } catch (txError) {
        console.warn('Could not record transaction:', txError);
        // Continue anyway - transaction recording is not critical for the flow
      }
    }
  }

  try {
    // Create transfer recipient
    console.log(`📝 Creating transfer recipient for account ${quote.bankAccount}, bank ${quote.bankCode}`);
    const recipient = await paystackService.createTransferRecipient(
      quote.bankAccount,
      quote.bankCode,
      quote.accountName
    );

    if (!recipient.data || !recipient.data.recipient_code) {
      console.error('❌ Invalid recipient response:', recipient);
      throw new Error('Failed to create transfer recipient: Invalid response from Paystack');
    }

    console.log(`✅ Transfer recipient created: ${recipient.data.recipient_code}`);

    // Initiate transfer
    console.log(`💸 Initiating transfer of ₦${quote.ngnAmount} to recipient ${recipient.data.recipient_code}`);
    const transfer = await paystackService.initiateTransfer(
      recipient.data.recipient_code,
      quote.ngnAmount,
      quoteId,
      'USDC to NGN conversion'
    );

    if (!transfer.data) {
      console.error('❌ Invalid transfer response:', transfer);
      throw new Error('Failed to initiate transfer: Invalid response from Paystack');
    }

    const transferRef = transfer.data.reference || transfer.data.transfer_code;
    console.log(`✅ Transfer initiated: ${transferRef}`);

    quote.status = 'completed';
    quote.transferReference = transferRef;

    // Update transaction status
    if (userAddress) {
      const existingTx = transactionHistory.getTransactionById(quoteId);
      if (existingTx) {
        try {
          transactionHistory.updateTransactionStatus(
            quoteId,
            'completed',
            {
              txHash: txHash,
              reference: transferRef,
              metadata: {
                transferReference: transferRef,
                ngnAmount: quote.ngnAmount,
              },
            }
          );
          console.log(`✅ Updated transaction status to completed: ${quoteId}`);
        } catch (txError) {
          console.warn('Could not update transaction status:', txError);
          // Don't fail the whole operation if transaction update fails
        }
      } else {
        // Transaction doesn't exist, record it as completed
        try {
          transactionHistory.recordTransaction({
            id: quoteId,
            type: 'offramp',
            userAddress: userAddress,
            amount: quote.usdcAmount,
            currency: 'USDC',
            status: 'completed',
            txHash: txHash,
            reference: quoteId,
            metadata: {
              ngnAmount: quote.ngnAmount,
              bankAccount: quote.bankAccount,
              bankCode: quote.bankCode,
              accountName: quote.accountName,
              exchangeRate: quote.rate,
              transferReference: transferRef,
            },
          });
          console.log(`✅ Recorded transaction as completed: ${quoteId}`);
        } catch (recordError) {
          console.warn('Could not record transaction:', recordError);
          // Don't fail the whole operation if transaction recording fails
        }
      }
    }

    // Store mock transfer for verification in mock mode
    const MOCK_MODE = process.env.MOCK_PAYSTACK_TRANSFERS === 'true' || process.env.NODE_ENV === 'test';
    if (MOCK_MODE) {
      mockTransfers.set(transferRef, {
        quoteId: quoteId,
        transferReference: transferRef,
        ngnAmount: quote.ngnAmount,
        usdcAmount: quote.usdcAmount,
        bankAccount: quote.bankAccount,
        bankCode: quote.bankCode,
        accountName: quote.accountName,
        txHash: txHash,
        status: transfer.data.status || 'pending',
        createdAt: new Date().toISOString(),
        isMock: true,
      });
      console.log(`📝 Mock transfer stored: ${transferRef} (${mockTransfers.size} total mock transfers)`);
    }

    return {
      success: true,
      transferReference: quote.transferReference,
      ngnAmount: quote.ngnAmount,
      status: transfer.data.status || 'pending',
    };
  } catch (error) {
    console.error('❌ Offramp execution error:', error);
    quote.status = 'failed';
    quote.error = error.message;
    
    // Update transaction status
    if (userAddress) {
      const existingTx = transactionHistory.getTransactionById(quoteId);
      if (existingTx) {
        try {
          transactionHistory.updateTransactionStatus(
            quoteId,
            'failed',
            {
              metadata: {
                error: error.message,
              },
            }
          );
        } catch (txError) {
          console.warn('Could not update transaction status:', txError);
        }
      } else {
        // Record as failed if it doesn't exist
        try {
          transactionHistory.recordTransaction({
            id: quoteId,
            type: 'offramp',
            userAddress: userAddress,
            amount: quote.usdcAmount,
            currency: 'USDC',
            status: 'failed',
            txHash: txHash,
            reference: quoteId,
            metadata: {
              ngnAmount: quote.ngnAmount,
              bankAccount: quote.bankAccount,
              bankCode: quote.bankCode,
              accountName: quote.accountName,
              exchangeRate: quote.rate,
              error: error.message,
            },
          });
        } catch (recordError) {
          console.warn('Could not record failed transaction:', recordError);
        }
      }
    }
    
    // Re-throw error so caller can handle refund
    throw error;
  }
}

/**
 * Refund USDC to user when bank transfer fails
 */
async function refundUSDC(userAddress, usdcAmount, txHash, reason) {
  if (!userAddress || !usdcAmount) {
    throw new Error('Missing required parameters for refund');
  }

  const { ethers } = require('ethers');
  const MANTLE_RPC_URL = process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
  const USDC_TOKEN_ADDRESS = process.env.USDC_TOKEN_ADDRESS || '0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F';
  const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

  if (!TREASURY_PRIVATE_KEY) {
    throw new Error('Treasury private key not configured');
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(MANTLE_RPC_URL);
    const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);

    // Create USDC contract instance
    const ERC20_ABI = [
      'function transfer(address to, uint256 amount) external returns (bool)',
      'function balanceOf(address account) external view returns (uint256)',
    ];
    const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, wallet);

    // Convert USDC amount to wei (18 decimals)
    const amountWei = ethers.utils.parseEther(usdcAmount.toString());

    // Check treasury balance
    const balance = await usdcContract.balanceOf(wallet.address);
    if (balance.lt(amountWei)) {
      throw new Error('Insufficient treasury balance for refund');
    }

    // Send USDC back to user
    const refundTx = await usdcContract.transfer(userAddress, amountWei);
    console.log(`💰 Refunding ${usdcAmount} USDC to ${userAddress}, TX: ${refundTx.hash}, Reason: ${reason}`);

    // Wait for confirmation
    await refundTx.wait(1);

    return {
      success: true,
      txHash: refundTx.hash,
      usdcAmount: usdcAmount,
      reason: reason,
    };
  } catch (error) {
    console.error('Error refunding USDC:', error);
    throw new Error(`Failed to refund USDC: ${error.message}`);
  }
}

/**
 * Get quote status
 */
function getQuoteStatus(quoteId) {
  const quote = quotes.get(quoteId);
  if (!quote) {
    return null;
  }

  return {
    quoteId: quoteId,
    status: quote.status,
    usdcAmount: quote.usdcAmount,
    ngnAmount: quote.ngnAmount,
    txHash: quote.txHash,
    transferReference: quote.transferReference,
  };
}

/**
 * Get mock transfer details (for verification in mock mode)
 */
function getMockTransfer(transferReference) {
  return mockTransfers.get(transferReference) || null;
}

/**
 * Get all mock transfers (for verification in mock mode)
 */
function getAllMockTransfers() {
  return Array.from(mockTransfers.values()).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
}

module.exports = {
  initiateOfframp,
  executeOfframp,
  getQuoteStatus,
  getMockTransfer,
  getAllMockTransfers,
  refundUSDC,
};

