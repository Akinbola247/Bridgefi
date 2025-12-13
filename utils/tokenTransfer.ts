/**
 * Token Transfer Utilities
 * Handles MNT and ERC20 token transfers on Mantle network
 */

import { ethers } from 'ethers';
import ERC20_ABI from './ERC20_ABI.json';


const MANTLE_SEPOLIA_RPC_URL = 'https://rpc.sepolia.mantle.xyz';

/**
 * Send MNT (native token) to an address
 */
export async function sendMNT(
  privateKey: string,
  toAddress: string,
  amount: string
): Promise<ethers.providers.TransactionResponse> {
  try {
    // Create provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Validate address
    if (!ethers.utils.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }

    // Convert amount to wei
    const amountWei = ethers.utils.parseEther(amount);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    if (balance.lt(amountWei)) {
      throw new Error('Insufficient MNT balance');
    }

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: toAddress,
      value: amountWei,
    });

    // Create transaction
    const transaction: ethers.providers.TransactionRequest = {
      to: toAddress,
      value: amountWei,
      gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
    };

    // Send transaction
    const tx = await wallet.sendTransaction(transaction);
    return tx;
  } catch (error: any) {
    console.error('Failed to send MNT:', error);
    throw new Error(error.message || 'Failed to send MNT');
  }
}

/**
 * Send USDC (ERC20 token) to an address
 */
export async function sendUSDC(
  privateKey: string,
  toAddress: string,
  amount: string,
  tokenAddress: string
): Promise<ethers.providers.TransactionResponse> {
  try {
    // Create provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Validate addresses
    if (!ethers.utils.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }
    if (toAddress === ethers.constants.AddressZero) {
      throw new Error('Cannot send to zero address. Please configure a valid treasury address.');
    }
    if (!ethers.utils.isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }

    // Create token contract instance
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Convert amount to wei (18 decimals)
    const amountWei = ethers.utils.parseEther(amount);

    // Check balance
    const balance = await tokenContract.balanceOf(wallet.address);
    if (balance.lt(amountWei)) {
      throw new Error('Insufficient USDC balance');
    }

    // Estimate gas for transfer
    let gasEstimate;
    try {
      gasEstimate = await tokenContract.estimateGas.transfer(toAddress, amountWei);
    } catch (estimateError: any) {
      // Check for common error reasons
      if (estimateError.message?.includes('execution reverted')) {
        if (toAddress === ethers.constants.AddressZero) {
          throw new Error('Cannot send to zero address. Treasury address not configured.');
        }
        throw new Error('Transaction will fail. Check recipient address and your USDC balance.');
      }
      throw estimateError;
    }

    // Execute transfer
    const tx = await tokenContract.transfer(toAddress, amountWei, {
      gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
    });

    return tx;
  } catch (error: any) {
    console.error('Failed to send USDC:', error);
    
    // Provide more helpful error messages
    if (error.message?.includes('zero address')) {
      throw new Error('Treasury address not configured. Please set EXPO_PUBLIC_TREASURY_ADDRESS in your .env file.');
    }
    if (error.message?.includes('Insufficient')) {
      throw new Error('Insufficient USDC balance. Please check your wallet balance.');
    }
    if (error.message?.includes('execution reverted')) {
      throw new Error('Transaction failed. Please verify the treasury address is correct and you have sufficient balance.');
    }
    
    throw new Error(error.message || 'Failed to send USDC');
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  txHash: string,
  confirmations: number = 1
): Promise<ethers.providers.TransactionReceipt> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return receipt;
  } catch (error: any) {
    console.error('Failed to wait for transaction:', error);
    throw new Error(error.message || 'Failed to confirm transaction');
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(txHash: string): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  receipt?: ethers.providers.TransactionReceipt;
}> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { status: 'pending' };
    }

    if (receipt.status === 1) {
      return { status: 'confirmed', receipt };
    } else {
      return { status: 'failed', receipt };
    }
  } catch (error: any) {
    console.error('Failed to get transaction status:', error);
    return { status: 'pending' };
  }
}

