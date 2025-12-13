/**
 * Authentication Hook (Web)
 * Uses stored wallet from AsyncStorage (same as native)
 */

import { clearWallet, getAllWallets, getCurrentAccountIndex, hasWallet, loadWallet } from '@/utils/walletStorage';
import { signMessage, signTransaction } from '@/utils/walletUtils';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

// Mantle network chain ID
const MANTLE_CHAIN_ID = 5003;

export function useAuth() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    wallet: {
      address: string;
      chainId: number | null;
    };
  } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0);

  useEffect(() => {
    checkWallet();
    // Listen for account changes (less frequent polling)
    const interval = setInterval(() => {
      checkWallet();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const checkWallet = async () => {
    try {
      const hasStoredWallet = await hasWallet();
      if (hasStoredWallet) {
        const wallet = await loadWallet();
        const wallets = await getAllWallets();
        const currentIdx = await getCurrentAccountIndex();
        
        if (wallet) {
          setAddress(wallet.address);
          setAllWallets(wallets);
          setCurrentAccountIndex(currentIdx);
          setUser({
            wallet: {
              address: wallet.address,
              chainId: MANTLE_CHAIN_ID,
            },
          });
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    } finally {
      setReady(true);
    }
  };

  const connectWallet = async () => {
    try {
      const wallet = await loadWallet();
      if (wallet) {
        setAddress(wallet.address);
        setUser({
          wallet: {
            address: wallet.address,
            chainId: MANTLE_CHAIN_ID,
          },
        });
        setIsAuthenticated(true);
      } else {
        throw new Error('No wallet found');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await clearWallet();
      setAddress(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const getPrivateKey = async (): Promise<string | null> => {
    try {
      const wallet = await loadWallet();
      return wallet?.privateKey || null;
    } catch (error) {
      console.error('Failed to get private key:', error);
      return null;
    }
  };

  const signTransactionWithWallet = async (transaction: ethers.providers.TransactionRequest): Promise<string> => {
    try {
      const privateKey = await getPrivateKey();
      if (!privateKey) {
        throw new Error('No wallet found');
      }
      return await signTransaction(privateKey, transaction);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  };

  const signMessageWithWallet = async (message: string): Promise<string> => {
    try {
      const privateKey = await getPrivateKey();
      if (!privateKey) {
        throw new Error('No wallet found');
      }
      return await signMessage(privateKey, message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  return {
    ready,
    isAuthenticated,
    user,
    login: connectWallet,
    logout,
    connectWallet,
    linkWallet: async () => {},
    unlinkWallet: async () => {},
    address,
    chainId: MANTLE_CHAIN_ID,
    getPrivateKey,
    signTransaction: signTransactionWithWallet,
    signMessage: signMessageWithWallet,
    allWallets,
    currentAccountIndex,
    network: 'Mantle',
  };
}
