/**
 * Spend Crypto Processing Page
 * Dual-stage progress tracking: blockchain confirmation and bank transfer (for bank transfers)
 * Single-stage for crypto address transfers
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { executeOfframp, getTreasuryAddress } from '@/utils/onrampOfframp';
import { sendMNT, sendUSDC, waitForTransaction } from '@/utils/tokenTransfer';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// USDC token address on Mantle Sepolia
const USDC_TOKEN_ADDRESS = '0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F';

type ProcessingStage = 'blockchain' | 'bank_transfer' | 'complete' | 'failed';
type ProcessingStatus = 'idle' | 'sending' | 'confirming' | 'executing' | 'done' | 'error';

export default function SpendProcessingPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getPrivateKey, address } = useAuth();
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('blockchain');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [confirmations, setConfirmations] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [transferReference, setTransferReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [treasuryAddress, setTreasuryAddress] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const type = params.type as string;
  const isBankTransfer = params.isBankTransfer === 'true' || type === 'bank-account';
  const quoteId = params.quoteId as string;
  const amount = params.amount as string;
  const token = params.token as string;
  const usdcAmount = params.usdcAmount as string || amount;
  const ngnAmount = params.ngnAmount as string;
  const bankAccount = params.accountNumber as string;
  const bankName = params.bankName as string || params.bank as string;
  const bankCode = params.bankCode as string;
  const accountName = params.accountName as string;
  const recipientAddress = params.recipientAddress as string;
  const usdcTokenAddress = params.usdcTokenAddress as string || USDC_TOKEN_ADDRESS;

  const REQUIRED_CONFIRMATIONS = 1; // Reduced for faster testing

  // Fetch treasury address on mount (only for bank transfers)
  useEffect(() => {
    if (!isBankTransfer) return;

    const fetchTreasuryAddress = async () => {
      console.log('🔍 Fetching treasury address...');
      
      // First check environment variable 
      const configAddress = Constants.expoConfig?.extra?.treasuryAddress;
      const envAddress = process.env.EXPO_PUBLIC_TREASURY_ADDRESS;
      
      const finalAddress = configAddress || envAddress;
      
      // Validate address format
      if (finalAddress && 
          finalAddress !== '0x0000000000000000000000000000000000000000' && 
          finalAddress.trim() !== '' &&
          finalAddress.startsWith('0x') &&
          finalAddress.length === 42) {
        console.log('Using treasury address from environment:', finalAddress.trim());
        setTreasuryAddress(finalAddress.trim());
        return;
      }

      // If not in env, try to get from backend
      try {
        console.log('📡 Fetching treasury address from backend API...');
        const address = await getTreasuryAddress();
        if (address && address !== '0x0000000000000000000000000000000000000000' && address.startsWith('0x') && address.length === 42) {
          console.log('✅ Using treasury address from backend:', address);
          setTreasuryAddress(address.trim());
        } else {
          throw new Error('Backend returned invalid treasury address');
        }
      } catch (fetchError: any) {
        console.warn('⚠️ Failed to fetch treasury address from backend:', fetchError.message);
        setError('Treasury address not configured. Please set EXPO_PUBLIC_TREASURY_ADDRESS in your .env file.');
      }
    };

    fetchTreasuryAddress();
  }, [isBankTransfer]);

  // Execute transaction
  const executeTransaction = useCallback(async () => {
    try {
      setStatus('sending');
      setError(null);

      // Get user's private key
      const privateKey = await getPrivateKey();
      if (!privateKey) {
        throw new Error('Wallet not found. Please connect your wallet.');
      }

      let tx: { hash: string };

      if (isBankTransfer) {
        // For bank transfers, send USDC to treasury wallet
        if (!treasuryAddress || treasuryAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error('Treasury address not configured. Please set EXPO_PUBLIC_TREASURY_ADDRESS in your .env file.');
        }
        console.log(`📤 Sending ${usdcAmount} USDC to treasury: ${treasuryAddress}`);
        tx = await sendUSDC(privateKey, treasuryAddress, usdcAmount, USDC_TOKEN_ADDRESS);
      } else {
        // For crypto address transfers, send directly to recipient
        if (token === 'MNT') {
          tx = await sendMNT(privateKey, recipientAddress, amount);
        } else if (token === 'USDC') {
          tx = await sendUSDC(privateKey, recipientAddress, amount, usdcTokenAddress);
        } else {
          throw new Error('Invalid token type');
        }
      }
      
      setTxHash(tx.hash);
      setStatus('confirming');
      console.log(`✅ Transaction sent: ${tx.hash}`);
    } catch (error: any) {
      console.error('Failed to send transaction:', error);
      setError(error.message || 'Failed to send transaction. Please try again.');
      setStatus('error');
      setCurrentStage('failed');
    }
  }, [isBankTransfer, treasuryAddress, usdcAmount, getPrivateKey, token, recipientAddress, amount, usdcTokenAddress]);

  // Monitor transaction confirmations
  const monitorTransaction = useCallback(async () => {
    if (!txHash) return;

    try {
      // Wait for transaction confirmation
      const receipt = await waitForTransaction(txHash, REQUIRED_CONFIRMATIONS);
      
      if (receipt.status === 1) {
        console.log(`✅ Transaction confirmed: ${txHash}`);
        setConfirmations(REQUIRED_CONFIRMATIONS);
        setStatus('done');
        
        if (isBankTransfer) {
          // Move to bank transfer stage
          setTimeout(() => {
            setCurrentStage('bank_transfer');
          }, 1000);
        } else {
          // For crypto address, transaction is complete
          setTimeout(() => {
            setCurrentStage('complete');
          }, 1000);
        }
      } else {
        throw new Error('Transaction failed on blockchain');
      }
    } catch (error: any) {
      console.error('Transaction monitoring error:', error);
      setError(error.message || 'Failed to confirm transaction');
      setStatus('error');
      setCurrentStage('failed');
    }
  }, [txHash, isBankTransfer]);

  // Execute bank transfer after blockchain confirmation
  const executeBankTransfer = useCallback(async () => {
    if (!txHash || !quoteId) return;

    try {
      setStatus('executing');
      console.log(`🏦 Executing bank transfer for quote: ${quoteId}`);

      // Prepare quote data as fallback (in case quote was lost from memory)
      const quoteData = {
        usdcAmount: parseFloat(usdcAmount || '0'),
        bankAccount: bankAccount || '',
        bankCode: bankCode || '',
        accountName: accountName || '',
        userAddress: address || '',
      };

      // Call backend to execute bank transfer
      const result = await executeOfframp(quoteId, txHash, quoteData);

      if (result.success && result.transferReference) {
        setTransferReference(result.transferReference);
        console.log(`✅ Bank transfer initiated: ${result.transferReference}`);
        setStatus('done');
        setTimeout(() => {
          setCurrentStage('complete');
        }, 2000);
      } else {
        throw new Error('Bank transfer failed');
      }
    } catch (error: any) {
      console.error('Bank transfer error:', error);
      setError(error.message || 'Failed to execute bank transfer. Please contact support.');
      setStatus('error');
      setCurrentStage('failed');
    }
  }, [quoteId, txHash, usdcAmount, bankAccount, bankCode, accountName]);

  // Execute transaction when ready (for bank transfers, wait for treasury address)
  useEffect(() => {
    if (currentStage === 'blockchain' && status === 'idle' && !txHash) {
      if (isBankTransfer && !treasuryAddress && !error) {
        console.log('⏳ Waiting for treasury address to be loaded...');
        return;
      }
      console.log('🚀 Starting transaction...');
      executeTransaction();
    }
  }, [currentStage, status, txHash, treasuryAddress, executeTransaction, isBankTransfer, error]);

  // Monitor transaction confirmations
  useEffect(() => {
    if (txHash && status === 'confirming') {
      monitorTransaction();
    }
  }, [txHash, status, monitorTransaction]);

  // Execute bank transfer after blockchain confirmation
  useEffect(() => {
    if (currentStage === 'bank_transfer' && status === 'done' && txHash && !transferReference) {
      executeBankTransfer();
    }
  }, [currentStage, status, txHash, transferReference, executeBankTransfer]);

  const renderStageContent = () => {
    switch (currentStage) {
      case 'blockchain':
        return (
          <View>
            <View style={styles.stageHeader}>
              <LoadingSpinner size="large" />
              <Text
                style={[
                  styles.stageTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                {status === 'sending' && (isBankTransfer ? 'Sending USDC to Treasury...' : 'Sending Transaction...')}
                {status === 'confirming' && 'Waiting for Network Confirmation'}
                {status === 'error' && 'Transaction Failed'}
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                {status === 'sending' && (isBankTransfer ? 'Sending USDC to treasury wallet' : 'Your transaction is being sent to the blockchain')}
                {status === 'confirming' && 'Your transaction is being confirmed on Mantle blockchain'}
                {status === 'error' && error}
              </Text>
            </View>
            {txHash && (
              <View style={styles.txInfo}>
                <Text
                  style={[
                    styles.txLabel,
                    { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                  ]}
                >
                  Transaction Hash
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    const explorerUrl = `https://explorer.mantle.xyz/tx/${txHash}`;
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.open(explorerUrl, '_blank');
                    } else {
                      await Linking.openURL(explorerUrl);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.txHash,
                      { color: BridgeFiColors.primary.main },
                    ]}
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </Text>
                </TouchableOpacity>
                <View style={styles.confirmationsContainer}>
                  <Text
                    style={[
                      styles.confirmationsText,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    Confirmations: {confirmations} / {REQUIRED_CONFIRMATIONS}
                  </Text>
                  <View style={styles.confirmationsBar}>
                    <View
                      style={[
                        styles.confirmationsFill,
                        {
                          width: `${(confirmations / REQUIRED_CONFIRMATIONS) * 100}%`,
                          backgroundColor: BridgeFiColors.primary.main,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        );

      case 'bank_transfer':
        return (
          <View>
            <View style={styles.stageHeader}>
              <LoadingSpinner size="large" />
              <Text
                style={[
                  styles.stageTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                {status === 'executing' && 'Initiating Bank Transfer...'}
                {status === 'done' && 'Bank Transfer Initiated'}
                {status === 'error' && 'Bank Transfer Failed'}
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                {status === 'executing' && 'Converting USDC to NGN and sending to bank account'}
                {status === 'done' && 'Your NGN transfer has been initiated'}
                {status === 'error' && error}
              </Text>
            </View>
            {transferReference && (
              <Card style={styles.transferInfo}>
                <Text
                  style={[
                    styles.transferLabel,
                    { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                  ]}
                >
                  Transfer Reference
                </Text>
                <Text
                  style={[
                    styles.transferReference,
                    { color: BridgeFiColors.primary.main },
                  ]}
                >
                  {transferReference}
                </Text>
                {ngnAmount && (
                  <Text
                    style={[
                      styles.ngnAmount,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    Amount: ₦{parseFloat(ngnAmount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                )}
              </Card>
            )}
          </View>
        );

      case 'complete':
        return (
          <View>
            <View style={styles.stageHeader}>
              <Text style={[styles.successIcon, { color: BridgeFiColors.success }]}>✓</Text>
              <Text
                style={[
                  styles.stageTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Transaction Completed!
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                {isBankTransfer 
                  ? 'Your USDC has been converted to NGN and sent to the bank account'
                  : 'Your transaction has been successfully processed'}
              </Text>
            </View>
            {txHash && (
              <Card style={styles.completeInfo}>
                <Text
                  style={[
                    styles.completeLabel,
                    { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                  ]}
                >
                  Transaction Hash
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    const explorerUrl = `https://explorer.mantle.xyz/tx/${txHash}`;
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.open(explorerUrl, '_blank');
                    } else {
                      await Linking.openURL(explorerUrl);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.completeHash,
                      { color: BridgeFiColors.primary.main },
                    ]}
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </Text>
                </TouchableOpacity>
                {transferReference && (
                  <>
                    <Text
                      style={[
                        styles.completeLabel,
                        { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                        { marginTop: 16 },
                      ]}
                    >
                      Transfer Reference
                    </Text>
                    <Text
                      style={[
                        styles.completeReference,
                        { color: BridgeFiColors.primary.main },
                      ]}
                    >
                      {transferReference}
                    </Text>
                  </>
                )}
              </Card>
            )}
            <Button
              title="Back to Dashboard"
              onPress={() => router.replace('/dashboard')}
              size="large"
              fullWidth
              style={styles.dashboardButton}
            />
          </View>
        );

      case 'failed':
        return (
          <View>
            <View style={styles.stageHeader}>
              <Text style={[styles.errorIcon, { color: BridgeFiColors.error }]}>✕</Text>
              <Text
                style={[
                  styles.stageTitle,
                  { color: BridgeFiColors.error },
                ]}
              >
                Transaction Failed
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: BridgeFiColors.error },
                ]}
              >
                {error || 'An error occurred while processing your transaction'}
              </Text>
            </View>
            <Button
              title="Try Again"
              onPress={() => router.back()}
              size="large"
              fullWidth
              style={styles.retryButton}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      <BackButton style={styles.backButton} />
      {renderStageContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 24,
  },
  stageHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  stageDescription: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  txInfo: {
    marginTop: 24,
  },
  txLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  txHash: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginBottom: 16,
  },
  confirmationsContainer: {
    marginTop: 8,
  },
  confirmationsText: {
    fontSize: 12,
    marginBottom: 4,
  },
  confirmationsBar: {
    height: 4,
    backgroundColor: BridgeFiColors.border.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confirmationsFill: {
    height: '100%',
    borderRadius: 2,
  },
  transferInfo: {
    marginTop: 24,
    padding: 16,
  },
  transferLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  transferReference: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginBottom: 8,
  },
  ngnAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  completeInfo: {
    marginTop: 24,
    padding: 16,
  },
  completeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  completeHash: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  completeReference: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginTop: 4,
  },
  dashboardButton: {
    marginTop: 32,
  },
  retryButton: {
    marginTop: 32,
  },
});
