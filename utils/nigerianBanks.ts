/**
 * Nigerian Banks API Utilities
 * Handles fetching Nigerian banks list and account number verification using Paystack API
 * Documentation: https://paystack.com/docs/api/
 */

import Constants from 'expo-constants';

// Paystack API Configuration
// Base URL: https://api.paystack.co
// Documentation: https://paystack.com/docs/api/
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Get Paystack secret key from environment variables
 * Note: Paystack uses secret keys (not public keys) for server-side operations
 */
function getPaystackSecretKey(): string {
  const secretKey = Constants.expoConfig?.extra?.paystackSecretKey || 
                   process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY ||
                   process.env.PAYSTACK_SECRET_KEY ||
                   '';
  
  if (!secretKey) {
    console.warn('Paystack secret key not found. Please set PAYSTACK_SECRET_KEY in your .env file.');
  }
  
  return secretKey;
}

/**
 * Get Paystack base URL
 */
function getPaystackBaseUrl(): string {
  return PAYSTACK_BASE_URL;
}

export interface NigerianBank {
  name: string;
  code: string;
  slug?: string;
}

/**
 * Fetch list of Nigerian banks from Paystack API
 * Endpoint: GET /bank
 * Documentation: https://paystack.com/docs/api/miscellaneous/#list-banks
 */
export async function fetchNigerianBanks(): Promise<NigerianBank[]> {
  const secretKey = getPaystackSecretKey();
  const baseUrl = getPaystackBaseUrl();
  
  if (!secretKey) {
    throw new Error(
      'Paystack secret key not configured. Please set PAYSTACK_SECRET_KEY in your .env file. ' +
      'Get your API keys from: https://dashboard.paystack.com/#/settings/developer'
    );
  }

  console.log(`Using Paystack base URL: ${baseUrl}`);
  console.log(`API Key present: ${secretKey ? 'Yes (length: ' + secretKey.length + ')' : 'No'}`);

  try {
    const url = `${baseUrl}/bank`;
    console.log(`Fetching banks from Paystack: GET ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`, // Paystack uses Bearer token format
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Paystack API response received');
      
      // Paystack returns banks in data.data array
      let banks: any[] = [];
      
      if (data.status && data.data && Array.isArray(data.data)) {
        banks = data.data;
      } else if (Array.isArray(data)) {
        banks = data;
      }

      if (banks.length > 0) {
        console.log(`✅ Found ${banks.length} banks from Paystack API`);
        
        // Paystack bank object structure: { name, code, slug, longcode, gateway, pay_with_bank, active, is_deleted, country, currency, type }
        const mappedBanks = banks
          .filter((bank: any) => bank.active !== false && bank.is_deleted !== true) // Filter out inactive/deleted banks
          .map((bank: any) => ({
            name: bank.name,
            code: bank.code,
            slug: bank.slug,
          }))
          .filter((bank: any) => bank.name && bank.code); // Ensure required fields exist
        
        if (mappedBanks.length > 0) {
          // Add test bank at the beginning for testing purposes
          // Paystack test mode allows unlimited resolves with bank code "001"
          const testBank: NigerianBank = {
            name: 'Test Bank (001) - Unlimited Testing',
            code: '001',
            slug: 'test-bank',
          };
          
          // Check if test bank already exists in the list
          const hasTestBank = mappedBanks.some(bank => bank.code === '001');
          
          // Prepend test bank if it doesn't exist, or move it to the top if it does
          if (!hasTestBank) {
            return [testBank, ...mappedBanks];
          } else {
            // Remove existing test bank and add our highlighted one at the top
            const filteredBanks = mappedBanks.filter(bank => bank.code !== '001');
            return [testBank, ...filteredBanks];
          }
        }
      }
      
      throw new Error('Paystack API returned success but no banks found in response');
    } else {
      // Handle error response
      let errorData: any = {};
      try {
        const text = await response.text();
        if (text) {
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { message: text };
          }
        }
      } catch {
        errorData = {};
      }
      
      console.error(`❌ Paystack API returned status ${response.status}:`, errorData);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Paystack API authentication failed. Please verify your PAYSTACK_SECRET_KEY is correct. ' +
          'Get your API keys from: https://dashboard.paystack.com/#/settings/developer'
        );
      }
      
      throw new Error(
        `Paystack API error (${response.status}): ${errorData.message || 'Failed to fetch banks'}`
      );
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request to Paystack API timed out. Please check your internet connection and try again.');
    }
    
    console.error('Failed to fetch banks from Paystack:', error);
    throw new Error(
      `Failed to fetch banks from Paystack API: ${error.message}. ` +
      'Please check your API key and internet connection.'
    );
  }
}

// Cache for verified accounts to avoid repeated API calls
// Key format: "accountNumber-bankCode"
const accountVerificationCache = new Map<string, {
  accountName: string;
  timestamp: number;
  expiresAt: number;
}>();

// Cache duration: 24 hours (to avoid hitting rate limits)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Get cached account verification result
 */
function getCachedVerification(accountNumber: string, bankCode: string): { accountName: string } | null {
  const cacheKey = `${accountNumber}-${bankCode}`;
  const cached = accountVerificationCache.get(cacheKey);
  
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`✅ Using cached verification for account ${accountNumber}`);
    return { accountName: cached.accountName };
  }
  
  // Remove expired cache entry
  if (cached) {
    accountVerificationCache.delete(cacheKey);
  }
  
  return null;
}

/**
 * Cache account verification result
 */
function setCachedVerification(accountNumber: string, bankCode: string, accountName: string): void {
  const cacheKey = `${accountNumber}-${bankCode}`;
  const now = Date.now();
  accountVerificationCache.set(cacheKey, {
    accountName,
    timestamp: now,
    expiresAt: now + CACHE_DURATION_MS,
  });
  console.log(`💾 Cached verification for account ${accountNumber}`);
}

/**
 * Verify Nigerian bank account number using Paystack API
 * Resolves account number to get account name
 * Endpoint: GET /bank/resolve
 * Documentation: https://paystack.com/docs/api/verification/#resolve-account-number
 * 
 * @param accountNumber - 10-digit NUBAN account number
 * @param bankCode - Bank code (e.g., '044' for Access Bank, '001' for test mode)
 * @returns Object with valid status and account name if valid
 */
export async function verifyAccountNumber(
  accountNumber: string,
  bankCode: string
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  const secretKey = getPaystackSecretKey();
  
  if (!secretKey) {
    return {
      valid: false,
      error: 'API key not configured. Please set PAYSTACK_SECRET_KEY in your environment variables.',
    };
  }

  // Check cache first
  const cached = getCachedVerification(accountNumber, bankCode);
  if (cached) {
    return {
      valid: true,
      accountName: cached.accountName,
    };
  }

  try {
    const baseUrl = getPaystackBaseUrl();
    // Paystack uses GET method with query parameters for /bank/resolve
    // Format: GET /bank/resolve?account_number=ACCOUNT&bank_code=CODE
    const url = `${baseUrl}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
    
    console.log(`Validating account via Paystack: GET ${url}`);
    console.log(`Account: ${accountNumber}, Bank Code: ${bankCode}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`, // Paystack uses Bearer token format
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Account validation response:', data);
      
      // Paystack returns: { status: true, message: "Account number resolved", data: { account_number, account_name, bank_id } }
      if (data.status && data.data) {
        const accountData = data.data;
        if (accountData.account_name) {
          // Cache the successful verification
          setCachedVerification(accountNumber, bankCode, accountData.account_name);
          return {
            valid: true,
            accountName: accountData.account_name,
          };
        }
      }
      
      return {
        valid: false,
        error: 'Account validation succeeded but account name not found in response',
      };
    } else {
      // Handle error response
      let errorData: any = {};
      try {
        const text = await response.text();
        if (text) {
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { message: text };
          }
        }
      } catch {
        errorData = {};
      }
      
      console.warn(`Account validation returned status ${response.status}:`, errorData);
      
      // Handle rate limiting (429) - Paystack test mode has daily limits
      if (response.status === 429) {
        const errorMessage = errorData.message || 'Rate limit exceeded';
        
        // Check if we have cached data to use
        const cached = getCachedVerification(accountNumber, bankCode);
        if (cached) {
          console.log('⚠️ Rate limit hit, but using cached verification');
          return {
            valid: true,
            accountName: cached.accountName,
          };
        }
        
        // Provide helpful error message for rate limits
        return {
          valid: false,
          error: `${errorMessage}\n\n💡 Tip: For testing, use test bank code "001" or wait until tomorrow. The account verification is cached for 24 hours to avoid hitting limits.`,
        };
      }
      
      // Paystack returns status: false and message for invalid accounts
      if (response.status === 400 || (errorData.status === false)) {
        return {
          valid: false,
          error: errorData.message || 'Invalid account number or bank code',
        };
      }
      
      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: 'Paystack API authentication failed. Please verify your API key.',
        };
      }
      
      return {
        valid: false,
        error: errorData.message || `Failed to verify account number (Status: ${response.status})`,
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        valid: false,
        error: 'Request timed out. Please check your internet connection and try again.',
      };
    }
    
    console.error('Account validation error:', error);
    return {
      valid: false,
      error: error.message || 'Network error during account validation',
    };
  }
}

/**
 * Clear the account verification cache
 * Useful for testing or when forcing fresh API calls
 */
export function clearAccountVerificationCache(): void {
  accountVerificationCache.clear();
  console.log('🗑️ Account verification cache cleared');
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: accountVerificationCache.size,
    entries: Array.from(accountVerificationCache.keys()),
  };
}

/**
 * Validate NUBAN (Nigerian Uniform Bank Account Number) format
 * Basic validation - checks if it's 10 digits
 */
export function validateNUBANFormat(accountNumber: string): boolean {
  // NUBAN accounts are exactly 10 digits
  return /^\d{10}$/.test(accountNumber);
}

/**
 * Get bank by code
 */
export function getBankByCode(banks: NigerianBank[], code: string): NigerianBank | undefined {
  return banks.find((bank) => bank.code === code);
}

/**
 * Get bank by name
 */
export function getBankByName(banks: NigerianBank[], name: string): NigerianBank | undefined {
  return banks.find((bank) => bank.name.toLowerCase() === name.toLowerCase());
}
