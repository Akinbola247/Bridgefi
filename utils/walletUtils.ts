/**
 * Wallet Management Utilities
 * Handles wallet creation, import, and signing operations
 */

import { ethers } from 'ethers';
import { StoredWallet } from './walletStorage';

// Standard BIP44 derivation path for Ethereum: m/44'/60'/0'/0/accountIndex
const DERIVATION_PATH_PREFIX = "m/44'/60'/0'/0/";

/**
 * Generate a new wallet with mnemonic
 */
export async function createWallet(): Promise<{
  wallet: StoredWallet;
  mnemonic: string;
}> {
  try {
    // Generate a random mnemonic (12 words)
    const mnemonic = ethers.Wallet.createRandom().mnemonic?.phrase;
    
    if (!mnemonic) {
      throw new Error('Failed to generate mnemonic');
    }
    
    // Create wallet from mnemonic (account index 0)
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    
    const walletData: StoredWallet = {
      id: `wallet-${Date.now()}`,
      privateKey: wallet.privateKey,
      address: wallet.address,
      accountIndex: 0,
      mnemonic: mnemonic,
      createdAt: Date.now(),
    };
    
    return {
      wallet: walletData,
      mnemonic: mnemonic,
    };
  } catch (error) {
    console.error('Failed to create wallet:', error);
    throw new Error('Failed to create wallet');
  }
}

/**
 * Derive a new account from mnemonic at the specified index
 */
export async function deriveAccountFromMnemonic(
  mnemonic: string,
  accountIndex: number
): Promise<StoredWallet> {
  try {
    const derivationPath = `${DERIVATION_PATH_PREFIX}${accountIndex}`;
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, derivationPath);
    
    const walletData: StoredWallet = {
      id: `wallet-${Date.now()}-${accountIndex}`,
      privateKey: wallet.privateKey,
      address: wallet.address,
      accountIndex: accountIndex,
      createdAt: Date.now(),
    };
    
    return walletData;
  } catch (error) {
    console.error('Failed to derive account:', error);
    throw new Error('Failed to derive account from mnemonic');
  }
}

/**
 * Import wallet from private key
 */
export async function importWalletFromPrivateKey(privateKey: string): Promise<StoredWallet> {
  try {
    // Validate private key format
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    
    const walletData: StoredWallet = {
      id: `wallet-${Date.now()}`,
      privateKey: wallet.privateKey,
      address: wallet.address,
      accountIndex: -1, // -1 indicates imported wallet (not derived)
      createdAt: Date.now(),
    };
    
    return walletData;
  } catch (error) {
    console.error('Failed to import wallet:', error);
    throw new Error('Invalid private key');
  }
}

/**
 * Import wallet from mnemonic
 */
export async function importWalletFromMnemonic(mnemonic: string): Promise<StoredWallet> {
  try {
    // Create wallet from mnemonic (account index 0)
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    
    const walletData: StoredWallet = {
      id: `wallet-${Date.now()}`,
      privateKey: wallet.privateKey,
      address: wallet.address,
      accountIndex: 0,
      mnemonic: mnemonic,
      createdAt: Date.now(),
    };
    
    return walletData;
  } catch (error) {
    console.error('Failed to import wallet from mnemonic:', error);
    throw new Error('Invalid mnemonic phrase');
  }
}

/**
 * Get wallet instance from stored private key
 */
export function getWalletFromPrivateKey(privateKey: string): ethers.Wallet {
  try {
    return new ethers.Wallet(privateKey);
  } catch (error) {
    console.error('Failed to get wallet from private key:', error);
    throw new Error('Invalid private key');
  }
}

/**
 * Sign a transaction with the stored wallet
 */
export async function signTransaction(
  privateKey: string,
  transaction: ethers.providers.TransactionRequest
): Promise<string> {
  try {
    const wallet = getWalletFromPrivateKey(privateKey);
    const signedTx = await wallet.signTransaction(transaction);
    return signedTx;
  } catch (error) {
    console.error('Failed to sign transaction:', error);
    throw new Error('Failed to sign transaction');
  }
}

/**
 * Sign a message with the stored wallet
 */
export async function signMessage(privateKey: string, message: string): Promise<string> {
  try {
    const wallet = getWalletFromPrivateKey(privateKey);
    const signature = await wallet.signMessage(message);
    return signature;
  } catch (error) {
    console.error('Failed to sign message:', error);
    throw new Error('Failed to sign message');
  }
}

/**
 * Validate private key format
 */
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate mnemonic phrase
 */
export function isValidMnemonic(mnemonic: string): boolean {
  try {
    ethers.Wallet.fromMnemonic(mnemonic);
    return true;
  } catch {
    return false;
  }
}

