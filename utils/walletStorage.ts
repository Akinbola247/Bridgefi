/**
 * Wallet Storage Utilities
 * Handles storing and retrieving wallet data from AsyncStorage
 * Supports multiple accounts from the same seed phrase
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WALLETS_STORAGE_KEY = '@bridgefi_wallets';
const CURRENT_ACCOUNT_INDEX_KEY = '@bridgefi_current_account_index';

export interface StoredWallet {
  id: string; // Unique ID for the account
  privateKey: string;
  address: string;
  accountIndex: number; // Derivation path index
  mnemonic?: string; // Only stored for the first account (master)
  createdAt: number;
}

export interface WalletStorage {
  wallets: StoredWallet[];
  currentAccountIndex: number;
}

/**
 * Save wallet data to local storage
 */
export async function saveWallet(wallet: StoredWallet): Promise<void> {
  try {
    const storage = await loadWalletStorage();
    const existingIndex = storage.wallets.findIndex(w => w.id === wallet.id);
    
    if (existingIndex >= 0) {
      storage.wallets[existingIndex] = wallet;
    } else {
      storage.wallets.push(wallet);
    }
    
    await AsyncStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(storage.wallets));
  } catch (error) {
    console.error('Failed to save wallet:', error);
    throw new Error('Failed to save wallet to storage');
  }
}

/**
 * Load all wallets from storage
 */
export async function loadWalletStorage(): Promise<WalletStorage> {
  try {
    const walletsData = await AsyncStorage.getItem(WALLETS_STORAGE_KEY);
    const currentIndexData = await AsyncStorage.getItem(CURRENT_ACCOUNT_INDEX_KEY);
    
    const wallets = walletsData ? JSON.parse(walletsData) : [];
    const currentAccountIndex = currentIndexData ? parseInt(currentIndexData, 10) : 0;
    
    return {
      wallets,
      currentAccountIndex,
    };
  } catch (error) {
    console.error('Failed to load wallet storage:', error);
    return {
      wallets: [],
      currentAccountIndex: 0,
    };
  }
}

/**
 * Load current active wallet
 */
export async function loadWallet(): Promise<StoredWallet | null> {
  try {
    const storage = await loadWalletStorage();
    if (storage.wallets.length === 0) {
      return null;
    }
    
    const currentIndex = storage.currentAccountIndex;
    if (currentIndex >= 0 && currentIndex < storage.wallets.length) {
      return storage.wallets[currentIndex];
    }
    
    return storage.wallets[0];
  } catch (error) {
    console.error('Failed to load wallet:', error);
    return null;
  }
}

/**
 * Load wallet by index
 */
export async function loadWalletByIndex(index: number): Promise<StoredWallet | null> {
  try {
    const storage = await loadWalletStorage();
    if (index >= 0 && index < storage.wallets.length) {
      return storage.wallets[index];
    }
    return null;
  } catch (error) {
    console.error('Failed to load wallet by index:', error);
    return null;
  }
}

/**
 * Get all wallets
 */
export async function getAllWallets(): Promise<StoredWallet[]> {
  try {
    const storage = await loadWalletStorage();
    return storage.wallets;
  } catch (error) {
    console.error('Failed to get all wallets:', error);
    return [];
  }
}

/**
 * Set current active account index
 */
export async function setCurrentAccountIndex(index: number): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENT_ACCOUNT_INDEX_KEY, index.toString());
  } catch (error) {
    console.error('Failed to set current account index:', error);
    throw new Error('Failed to set current account index');
  }
}

/**
 * Get current account index
 */
export async function getCurrentAccountIndex(): Promise<number> {
  try {
    const indexData = await AsyncStorage.getItem(CURRENT_ACCOUNT_INDEX_KEY);
    return indexData ? parseInt(indexData, 10) : 0;
  } catch (error) {
    console.error('Failed to get current account index:', error);
    return 0;
  }
}

/**
 * Check if a wallet exists in storage
 */
export async function hasWallet(): Promise<boolean> {
  try {
    const storage = await loadWalletStorage();
    return storage.wallets.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a wallet by ID
 */
export async function deleteWallet(walletId: string): Promise<void> {
  try {
    const storage = await loadWalletStorage();
    const filteredWallets = storage.wallets.filter(w => w.id !== walletId);
    
    if (filteredWallets.length === 0) {
      // If deleting last wallet, clear everything
      await clearWallet();
      return;
    }
    
    // If deleting current account, switch to first account
    const deletedIndex = storage.wallets.findIndex(w => w.id === walletId);
    if (deletedIndex === storage.currentAccountIndex) {
      await setCurrentAccountIndex(0);
    } else if (deletedIndex < storage.currentAccountIndex) {
      // Adjust current index if needed
      await setCurrentAccountIndex(storage.currentAccountIndex - 1);
    }
    
    await AsyncStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(filteredWallets));
  } catch (error) {
    console.error('Failed to delete wallet:', error);
    throw new Error('Failed to delete wallet');
  }
}

/**
 * Clear all wallet data from storage
 */
export async function clearWallet(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALLETS_STORAGE_KEY);
    await AsyncStorage.removeItem(CURRENT_ACCOUNT_INDEX_KEY);
  } catch (error) {
    console.error('Failed to clear wallet:', error);
    throw new Error('Failed to clear wallet from storage');
  }
}

/**
 * Get wallet address from storage
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const wallet = await loadWallet();
    return wallet?.address || null;
  } catch (error) {
    console.error('Failed to get wallet address:', error);
    return null;
  }
}

/**
 * Get master mnemonic (from first account)
 */
export async function getMasterMnemonic(): Promise<string | null> {
  try {
    const storage = await loadWalletStorage();
    const masterWallet = storage.wallets.find(w => w.mnemonic);
    return masterWallet?.mnemonic || null;
  } catch (err) {
    console.error('Failed to get master mnemonic:', err);
    return null;
  }
}
