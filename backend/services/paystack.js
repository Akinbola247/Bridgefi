/**
 * Paystack Service
 * Handles Paystack API integration for NGN payments and transfers
 */

const axios = require('axios');
const crypto = require('crypto');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

/**
 * Initialize payment (for on-ramp)
 */
async function initializePayment(amount, email, reference, metadata = {}) {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(amount * 100), // Convert to kobo (smallest NGN unit)
        email: email,
        reference: reference,
        currency: 'NGN',
        metadata: metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack initialize payment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initialize payment');
  }
}

/**
 * Verify payment
 */
async function verifyPayment(reference) {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack verify payment error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to verify payment');
  }
}

/**
 * Create transfer recipient (for off-ramp)
 */
async function createTransferRecipient(accountNumber, bankCode, accountName) {
  // Check if mock mode is enabled
  const MOCK_MODE = process.env.MOCK_PAYSTACK_TRANSFERS === 'true' || process.env.NODE_ENV === 'test';
  
  if (MOCK_MODE) {
    console.log('🧪 MOCK MODE: Simulating transfer recipient creation');
    console.log('   Account:', accountNumber);
    console.log('   Bank:', bankCode);
    console.log('   Name:', accountName);
    
    // Simulate successful recipient creation
    return {
      status: true,
      message: 'Recipient created (MOCK MODE)',
      data: {
        active: true,
        createdAt: new Date().toISOString(),
        currency: 'NGN',
        domain: 'test',
        id: Date.now(),
        integration: 0,
        name: accountName || 'Test Account',
        recipient_code: `MOCK_RECIPIENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'nuban',
        updatedAt: new Date().toISOString(),
        is_deleted: false,
        details: {
          account_number: accountNumber,
          account_name: accountName || 'Test Account',
          bank_code: bankCode,
          bank_name: bankCode === '001' ? 'Test Bank' : 'Unknown Bank',
        },
      },
    };
  }

  try {
    // For test bank code 001, use a simplified approach
    // Paystack test mode allows creating recipients without full validation
    const isTestBank = bankCode === '001' || bankCode === '999992';
    
    // For test bank, ensure account number is in correct format
    // Paystack test mode prefers account numbers starting with zeros
    let finalAccountNumber = accountNumber;
    if (isTestBank && !accountNumber.startsWith('0000000')) {
      // Pad with zeros if needed for test accounts
      console.log(`⚠️ Test account ${accountNumber} might not work. Try using 0000000001, 0000000002, etc.`);
    }
    
    const requestBody = {
      type: 'nuban',
      name: accountName || 'Test Account', // Ensure name is provided
      account_number: finalAccountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    };

    // For test accounts, Paystack is more lenient
    if (isTestBank) {
      console.log('🧪 Creating transfer recipient for test bank:', {
        accountNumber: finalAccountNumber,
        bankCode,
        accountName: requestBody.name,
      });
    }

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || 'Failed to create transfer recipient';
    
    console.error('Paystack create recipient error:', {
      message: errorMessage,
      status: error.response?.status,
      data: errorData,
      accountNumber,
      bankCode,
      accountName,
    });

    // Provide more helpful error messages
    if (errorMessage.includes('resolve') || errorMessage.includes('resolve account') || errorMessage.includes('Cannot resolve')) {
      if (bankCode === '001' || bankCode === '999992') {
        throw new Error(
          `Cannot resolve test account ${accountNumber}. ` +
          `For test bank (001), try using account numbers like: ` +
          `0000000001, 0000000002, 0000000123, or any 10-digit number starting with zeros. ` +
          `Also ensure the account name matches what was verified.`
        );
      } else {
        throw new Error(
          `Cannot resolve account ${accountNumber} for bank ${bankCode}. ` +
          `Please verify the account number and bank code are correct.`
        );
      }
    }
    
    if (error.response?.status === 400) {
      throw new Error(`Invalid account details: ${errorMessage}`);
    }

    throw new Error(errorMessage);
  }
}

/**
 * Initiate transfer (for off-ramp)
 */
async function initiateTransfer(recipientCode, amount, reference, reason = 'USDC to NGN conversion') {
  // Check if mock mode is enabled (for testing without Paystack business account)
  const MOCK_MODE = process.env.MOCK_PAYSTACK_TRANSFERS === 'true' || process.env.NODE_ENV === 'test';
  
  if (MOCK_MODE) {
    console.log('🧪 MOCK MODE: Simulating Paystack transfer');
    console.log('   Recipient:', recipientCode);
    console.log('   Amount: ₦' + amount);
    console.log('   Reference:', reference);
    
    // Simulate successful transfer
    return {
      status: true,
      message: 'Transfer queued (MOCK MODE)',
      data: {
        integration: 0,
        domain: 'test',
        amount: Math.round(amount * 100),
        currency: 'NGN',
        source: 'balance',
        reason: reason,
        recipient: recipientCode,
        status: 'pending',
        transfer_code: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo
        recipient: recipientCode,
        reference: reference,
        reason: reason,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || 'Failed to initiate transfer';
    
    console.error('Paystack transfer error:', {
      message: errorMessage,
      status: error.response?.status,
      data: errorData,
    });

    // Check for starter business account error
    if (errorMessage.includes('starter business') || errorMessage.includes('third party payouts')) {
      throw new Error(
        `Paystack Account Limitation: ${errorMessage}. ` +
        `Your Paystack account needs to be upgraded to Business/Enterprise tier to use transfers. ` +
        `For testing, you can enable MOCK_MODE by setting MOCK_PAYSTACK_TRANSFERS=true in your .env file. ` +
        `This will simulate transfers without actually sending money.`
      );
    }

    throw new Error(errorMessage);
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhook(payload, signature) {
  if (!signature) {
    return false;
  }

  const hash = crypto
    .createHmac('sha512', process.env.WEBHOOK_SECRET || PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');

  return hash === signature;
}

module.exports = {
  initializePayment,
  verifyPayment,
  createTransferRecipient,
  initiateTransfer,
  verifyWebhook,
};

