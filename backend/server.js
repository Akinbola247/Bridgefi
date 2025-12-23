/**
 * BridgeFi On-Ramp/Off-Ramp Backend API
 * Handles USDC ↔ NGN conversions with Paystack integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const exchangeRateService = require('./services/exchangeRate');
const onrampService = require('./services/onramp');
const offrampService = require('./services/offramp');
const paystackService = require('./services/paystack');
const transactionHistory = require('./services/transactionHistory');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get treasury address (for frontend configuration)
app.get('/api/treasury-address', (req, res) => {
  const treasuryAddress = process.env.TREASURY_ADDRESS;
  if (!treasuryAddress) {
    return res.status(500).json({
      success: false,
      error: 'Treasury address not configured on server',
    });
  }
  res.json({
    success: true,
    data: {
      treasuryAddress: treasuryAddress,
    },
  });
});

// Mock transfer verification endpoints (for testing)
app.get('/api/mock-transfers', (req, res) => {
  const MOCK_MODE = process.env.MOCK_PAYSTACK_TRANSFERS === 'true' || process.env.NODE_ENV === 'test';
  
  if (!MOCK_MODE) {
    return res.status(400).json({
      success: false,
      error: 'Mock mode is not enabled. This endpoint is only available in mock mode.',
    });
  }

  try {
    const transfers = offrampService.getAllMockTransfers();
    res.json({
      success: true,
      data: {
        transfers: transfers,
        count: transfers.length,
        mode: 'mock',
      },
    });
  } catch (error) {
    console.error('Error getting mock transfers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get mock transfers',
    });
  }
});

app.get('/api/mock-transfers/:reference', (req, res) => {
  const MOCK_MODE = process.env.MOCK_PAYSTACK_TRANSFERS === 'true' || process.env.NODE_ENV === 'test';
  
  if (!MOCK_MODE) {
    return res.status(400).json({
      success: false,
      error: 'Mock mode is not enabled. This endpoint is only available in mock mode.',
    });
  }

  try {
    const { reference } = req.params;
    const transfer = offrampService.getMockTransfer(reference);
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Mock transfer not found',
      });
    }

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    console.error('Error getting mock transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get mock transfer',
    });
  }
});

// Exchange Rate Endpoints
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const rate = await exchangeRateService.getUSDCToNGNRate();
    res.json({
      success: true,
      data: {
        usdcToNgn: rate.usdcToNgn,
        ngnToUsdc: rate.ngnToUsdc,
        timestamp: rate.timestamp,
        source: rate.source,
      },
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rate',
    });
  }
});

// On-Ramp Endpoints
app.post('/api/onramp/initiate', async (req, res) => {
  try {
    const { ngnAmount, userAddress } = req.body;

    if (!ngnAmount || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ngnAmount, userAddress',
      });
    }

    const result = await onrampService.initiateOnramp(ngnAmount, userAddress);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error initiating onramp:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate onramp',
    });
  }
});

app.post('/api/onramp/verify', async (req, res) => {
  try {
    const { reference, quoteData } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: reference',
      });
    }

    // quoteData is optional - used as fallback if quote is lost from memory
    const result = await onrampService.verifyPayment(reference, quoteData);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment',
    });
  }
});

// Off-Ramp Endpoints
app.post('/api/offramp/initiate', async (req, res) => {
  try {
    const { usdcAmount, bankAccount, bankCode, accountName } = req.body;

    if (!usdcAmount || !bankAccount || !bankCode || !accountName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: usdcAmount, bankAccount, bankCode, accountName',
      });
    }

    const result = await offrampService.initiateOfframp(
      usdcAmount,
      bankAccount,
      bankCode,
      accountName
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error initiating offramp:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate offramp',
    });
  }
});

app.post('/api/offramp/execute', async (req, res) => {
  try {
    const { quoteId, txHash, quoteData } = req.body;

    if (!quoteId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: quoteId, txHash',
      });
    }

    // quoteData is optional - used as fallback if quote is lost from memory
    const result = await offrampService.executeOfframp(quoteId, txHash, quoteData);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error executing offramp:', error);
    
    // If bank transfer fails and we have user address and USDC amount, attempt refund
    const { quoteId, txHash, quoteData } = req.body;
    if (quoteData && quoteData.userAddress && quoteData.usdcAmount) {
      try {
        console.log(`🔄 Attempting to refund ${quoteData.usdcAmount} USDC to ${quoteData.userAddress}...`);
        const refundResult = await offrampService.refundUSDC(
          quoteData.userAddress,
          quoteData.usdcAmount,
          txHash,
          `Bank transfer failed: ${error.message}`
        );
        console.log(`✅ Refund successful: ${refundResult.txHash}`);
        
        // Return error with refund info
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to execute offramp',
          refund: {
            success: true,
            txHash: refundResult.txHash,
            usdcAmount: refundResult.usdcAmount,
          },
        });
      } catch (refundError) {
        console.error('❌ Refund failed:', refundError);
        // Return original error with refund failure info
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to execute offramp',
          refund: {
            success: false,
            error: refundError.message,
          },
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute offramp',
    });
  }
});

// Refund endpoint (for manual refunds if needed)
app.post('/api/offramp/refund', async (req, res) => {
  try {
    const { userAddress, usdcAmount, txHash, reason } = req.body;

    if (!userAddress || !usdcAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, usdcAmount',
      });
    }

    // Validate userAddress format
    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user address format',
      });
    }

    // Validate usdcAmount is a number
    const amount = parseFloat(usdcAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid USDC amount',
      });
    }

    const result = await offrampService.refundUSDC(
      userAddress,
      amount,
      txHash || null,
      reason || 'Manual refund'
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    // Ensure we always return JSON, not HTML
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process refund',
    });
  }
});

// Transaction History Endpoints
app.get('/api/transactions', async (req, res) => {
  try {
    const { userAddress, type, status, limit = 50, offset = 0 } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userAddress',
      });
    }

    const result = transactionHistory.getUserTransactions(userAddress, {
      type: type || null,
      status: status || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions',
    });
  }
});

// Paystack Webhook
app.post('/api/webhooks/paystack', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'];
    const isValid = paystackService.verifyWebhook(req.body, signature);

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Paystack webhook received:', event.event);

    // Handle payment success
    if (event.event === 'charge.success') {
      await onrampService.handlePaymentSuccess(event.data);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BridgeFi Backend API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize exchange rate service
  exchangeRateService.initialize();
});

