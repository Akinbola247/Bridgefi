/**
 * On-Ramp/Off-Ramp API Utilities
 * Handles communication with backend API for NGN ↔ USDC conversions
 */

// Backend API base URL
// In development: http://localhost:3000
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface ExchangeRate {
  usdcToNgn: number;
  ngnToUsdc: number;
  timestamp: number;
  source: string;
}

export interface OnrampQuote {
  quoteId: string;
  ngnAmount: number;
  usdcAmount: number;
  exchangeRate: number;
  paymentLink: string;
  reference: string;
  expiresAt: number;
}

export interface OfframpQuote {
  quoteId: string;
  usdcAmount: number;
  ngnAmount: number;
  exchangeRate: number;
  bankAccount: string;
  accountName: string;
  expiresAt: number;
}

export interface Transaction {
  id: string;
  type: 'onramp' | 'offramp';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string | null;
  reference?: string | null;
  metadata?: any;
}

/**
 * Get treasury address from backend
 */
export async function getTreasuryAddress(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/treasury-address`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch treasury address: ${response.status}`);
    }

    const data = await response.json();
    return data.data.treasuryAddress;
  } catch (error: any) {
    console.error('Error fetching treasury address:', error);
    throw new Error('Failed to fetch treasury address from backend');
  }
}

/**
 * Get current USDC/NGN exchange rate
 */
export async function getExchangeRate(): Promise<ExchangeRate> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/exchange-rate`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('Error fetching exchange rate:', error);
    // Fallback rate
    return {
      usdcToNgn: 1500,
      ngnToUsdc: 1 / 1500,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }
}

/**
 * Initiate on-ramp (NGN → USDC)
 */
export async function initiateOnramp(
  ngnAmount: number,
  userAddress: string
): Promise<OnrampQuote> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/onramp/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ngnAmount,
        userAddress,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initiate onramp');
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('Error initiating onramp:', error);
    throw new Error(error.message || 'Failed to initiate onramp');
  }
}

/**
 * Verify on-ramp payment
 */
export async function verifyOnrampPayment(
  reference: string,
  quoteData?: {
    ngnAmount: number;
    userAddress: string;
  }
): Promise<{
  success: boolean;
  txHash?: string;
  usdcAmount?: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/onramp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference,
        quoteData, // Optional: used as fallback if quote is lost from memory
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify payment');
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    throw new Error(error.message || 'Failed to verify payment');
  }
}

/**
 * Initiate off-ramp (USDC → NGN)
 */
export async function initiateOfframp(
  usdcAmount: number,
  bankAccount: string,
  bankCode: string,
  accountName: string
): Promise<OfframpQuote> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offramp/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usdcAmount,
        bankAccount,
        bankCode,
        accountName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initiate offramp');
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('Error initiating offramp:', error);
    throw new Error(error.message || 'Failed to initiate offramp');
  }
}

/**
 * Execute off-ramp after USDC is sent
 */
export async function executeOfframp(
  quoteId: string,
  txHash: string,
  quoteData?: {
    usdcAmount: number;
    bankAccount: string;
    bankCode: string;
    accountName: string;
  }
): Promise<{
  success: boolean;
  transferReference?: string;
  ngnAmount?: number;
  status?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offramp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteId,
        txHash,
        quoteData, // Optional: used as fallback if quote is lost from memory
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute offramp');
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('Error executing offramp:', error);
    throw new Error(error.message || 'Failed to execute offramp');
  }
}

