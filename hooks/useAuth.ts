/**
 * Authentication Hook
 * Platform-specific implementation
 * - useAuth.native.ts for iOS/Android (uses stored wallet)
 * - useAuth.web.ts for web (uses stored wallet)
 * 
 * Expo automatically selects the correct file based on platform at runtime.
 */

// Type definitions
export interface AuthUser {
  wallet: {
    address: string;
    chainId: number | null;
  };
}

export interface UseAuthReturn {
  ready: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  connectWallet: () => Promise<void>;
  linkWallet: () => Promise<void>;
  unlinkWallet: () => Promise<void>;
  address: string | null;
  chainId: number | null;
  getPrivateKey: () => Promise<string | null>;
  signTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  allWallets?: any[];
  currentAccountIndex?: number;
  network?: string;
}

// For TypeScript, we'll export from native as default
// At runtime, Expo's resolver will pick the correct platform file
export { useAuth } from './useAuth.native';
