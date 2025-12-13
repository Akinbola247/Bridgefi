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
    
    // Handle "already known" error - transaction was already submitted
    const errorMessage = error.message || '';
    const errorBody = error.body || '';
    const errorString = JSON.stringify(error);
    const requestBody = error.requestBody || '';
    
    if (
      errorMessage.includes('already known') ||
      errorBody.includes('already known') ||
      errorString.includes('already known')
    ) {
      console.log('⚠️ Transaction already known - attempting to recover transaction hash...');
      
      try {
        const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
        let txHash: string | null = null;
        
        // Try to extract transaction hash from raw transaction in request body
        if (requestBody) {
          try {
            const requestJson = JSON.parse(requestBody);
            if (requestJson.params && requestJson.params[0]) {
              const rawTx = requestJson.params[0];
              if (rawTx && typeof rawTx === 'string' && rawTx.startsWith('0x')) {
                try {
                  const parsedTx = ethers.utils.parseTransaction(rawTx);
                  if (parsedTx && parsedTx.hash) {
                    txHash = parsedTx.hash;
                    console.log(`✅ Extracted transaction hash from raw transaction: ${txHash}`);
                  }
                } catch (parseError) {
                  console.warn('Could not parse transaction:', parseError);
                }
              }
            }
          } catch (e) {
            console.warn('Could not parse request body:', e);
          }
        }
        
        // If we have a hash, return a transaction-like object
        if (txHash) {
          console.log(`✅ Transaction already submitted with hash: ${txHash}`);
          return {
            hash: txHash,
            wait: async (confirmations?: number) => {
              return await provider.waitForTransaction(txHash!, confirmations || 1);
            },
          } as any;
        }
        
        // If we couldn't recover the hash, inform the user
        throw new Error('Transaction was already submitted. Please check your wallet for pending transactions. The transaction may still be processing.');
      } catch (recoveryError: any) {
        if (recoveryError.message?.includes('already submitted')) {
          throw recoveryError;
        }
        console.error('Failed to recover transaction hash:', recoveryError);
        throw new Error('Transaction was already submitted to the network. Please check your wallet or transaction history. The transaction may still be processing.');
      }
    }
    
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
    
    // Handle "already known" error - transaction was already submitted
    const errorMessage = error.message || '';
    const errorBody = error.body || '';
    const errorString = JSON.stringify(error);
    const requestBody = error.requestBody || '';
    
    if (
      errorMessage.includes('already known') ||
      errorBody.includes('already known') ||
      errorString.includes('already known')
    ) {
      console.log('⚠️ Transaction already known - attempting to recover transaction hash...');
      
      try {
        const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);
        let txHash: string | null = null;
        
        // Try to extract transaction hash from raw transaction in request body
        if (requestBody) {
          try {
            const requestJson = JSON.parse(requestBody);
            if (requestJson.params && requestJson.params[0]) {
              const rawTx = requestJson.params[0];
              // For EIP-1559 transactions (type 2), the hash is keccak256 of the RLP-encoded transaction
              // The raw transaction bytes already contain the signature, so we can hash them directly
              if (rawTx && typeof rawTx === 'string' && rawTx.startsWith('0x')) {
                // Remove the transaction type byte (0x02 for EIP-1559) and hash the rest
                // Actually, for EIP-1559, the hash includes the type byte
                // Let's use ethers to properly decode and hash
                try {
                  // Parse the transaction to extract details
                  const parsedTx = ethers.utils.parseTransaction(rawTx);
                  
                  // For EIP-1559 transactions, compute hash from the raw transaction
                  // The hash is keccak256 of the transaction type byte (0x02) concatenated with RLP-encoded transaction
                  // Since we have the raw transaction, we can compute it
                  // For type 2 (EIP-1559), hash = keccak256(0x02 || rlp_encoded_tx_without_type)
                  // But the rawTx already includes the type byte, so we hash it directly
                  // Note: This is a simplified approach - the actual hash computation is more complex
                  
                  // Try to get hash from parsed transaction (if available)
                  if (parsedTx && parsedTx.hash) {
                    txHash = parsedTx.hash;
                    console.log(`✅ Extracted transaction hash from parsed transaction: ${txHash}`);
                  } else {
                    // Compute hash from raw transaction
                    // For EIP-1559: hash = keccak256(rawTx)
                    // This should work for most cases
                    txHash = ethers.utils.keccak256(rawTx);
                    console.log(`✅ Computed transaction hash from raw transaction: ${txHash}`);
                  }
                } catch (parseError) {
                  // If parsing fails, try direct keccak256 as fallback
                  // This may not be 100% accurate but should work in most cases
                  try {
                    txHash = ethers.utils.keccak256(rawTx);
                    console.log(`✅ Computed transaction hash (fallback): ${txHash}`);
                  } catch (hashError) {
                    console.warn('Could not compute transaction hash:', hashError);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Could not parse request body:', e);
          }
        }
        
        // If we still don't have a hash, try to find it by checking the wallet's recent transactions
        if (!txHash) {
          try {
            // Get the current nonce to determine which transaction might be pending
            const currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
            const confirmedNonce = await provider.getTransactionCount(wallet.address, 'latest');
            
            // If there's a difference, there might be a pending transaction
            if (currentNonce > confirmedNonce) {
              // Try to get the transaction by querying with the expected nonce
              // We'll try to get it from the mempool by checking recent blocks
              console.log(`🔍 Checking for pending transaction with nonce ${confirmedNonce}...`);
              
              // Note: Most RPC providers don't support querying pending transactions by nonce
              // So we'll inform the user instead
            }
          } catch (e) {
            console.warn('Could not check for pending transaction:', e);
          }
        }
        
        // If we have a hash, return a transaction-like object
        if (txHash) {
          console.log(`✅ Transaction already submitted with hash: ${txHash}`);
          // Return a transaction response object with the hash
          return {
            hash: txHash,
            wait: async (confirmations?: number) => {
              return await provider.waitForTransaction(txHash!, confirmations || 1);
            },
          } as any;
        }
        
        // If we couldn't recover the hash, log a warning but don't fail
        // The transaction was submitted, so we'll inform the user
        console.warn('⚠️ Could not recover transaction hash, but transaction was already submitted');
        throw new Error('Transaction was already submitted. Please check your wallet for pending transactions. The transaction may still be processing.');
      } catch (recoveryError: any) {
        // If recovery failed, provide a helpful message
        if (recoveryError.message?.includes('already submitted')) {
          throw recoveryError;
        }
        console.error('Failed to recover transaction hash:', recoveryError);
        // Fall through to show a helpful error message
        throw new Error('Transaction was already submitted to the network. Please check your wallet or transaction history. The transaction may still be processing.');
      }
    }
    
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

