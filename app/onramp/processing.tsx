/**
 * Onramp Processing Page
 * Multi-stage progress tracking: payment verification and USDC transfer
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { verifyOnrampPayment } from '@/utils/onrampOfframp';
import { waitForTransaction } from '@/utils/tokenTransfer';
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

type ProcessingStage = 'payment' | 'verifying' | 'blockchain' | 'complete' | 'failed';
type ProcessingStatus = 'idle' | 'checking' | 'confirming' | 'done' | 'error';

export default function OnrampProcessingPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { address } = useAuth();
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('payment');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const quoteId = params.quoteId as string;
  const reference = params.reference as string;
  const ngnAmount = params.ngnAmount as string;
  const usdcAmount = params.usdcAmount as string;
  const exchangeRate = params.exchangeRate as string;

  const REQUIRED_CONFIRMATIONS = 1; // Reduced for faster testing

  // Verify payment and wait for USDC transfer
  const verifyPayment = useCallback(async () => {
    if (!reference) {
      setError('Payment reference not found');
      setStatus('error');
      setCurrentStage('failed');
      return;
    }

    try {
      setStatus('checking');
      setCurrentStage('verifying');
      console.log(`🔍 Verifying payment for reference: ${reference}`);

      // Prepare quote data as fallback (in case quote was lost from memory)
      const quoteData = {
        ngnAmount: parseFloat(ngnAmount || '0'),
        userAddress: address || '', // Get from auth context
      };

      // Poll for payment verification (Paystack payment might take a few seconds)
      let verificationResult = null;
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts = 60 seconds max wait (Paystack can take time)

      while (!verificationResult && attempts < maxAttempts) {
        try {
          verificationResult = await verifyOnrampPayment(reference, quoteData);
          
          if (verificationResult.success && verificationResult.txHash) {
            console.log(`✅ Payment verified, TX: ${verificationResult.txHash}`);
            setTxHash(verificationResult.txHash);
            setStatus('confirming');
            setCurrentStage('blockchain');
            break;
          }
        } catch (error: any) {
          // Payment might not be verified yet, continue polling
          if (error.message.includes('not successful') || 
              error.message.includes('not found') ||
              error.message.includes('Payment not successful')) {
            console.log(`⏳ Payment not verified yet, attempt ${attempts + 1}/${maxAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            attempts++;
            continue;
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      if (!verificationResult || !verificationResult.success) {
        throw new Error('Payment verification timeout. Please check if payment was completed. If payment was successful, USDC will be sent automatically via webhook.');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setError(error.message || 'Failed to verify payment. Please contact support if payment was completed.');
      setStatus('error');
      setCurrentStage('failed');
    }
  }, [reference, ngnAmount, address]);

  // Monitor transaction confirmations
  const monitorTransaction = useCallback(async () => {
    if (!txHash) return;

    try {
      console.log(`📡 Monitoring transaction: ${txHash}`);
      const receipt = await waitForTransaction(txHash, REQUIRED_CONFIRMATIONS);
      
      if (receipt.status === 1) {
        console.log(`✅ Transaction confirmed: ${txHash}`);
        setConfirmations(REQUIRED_CONFIRMATIONS);
        setStatus('done');
        setCurrentStage('complete');
      } else {
        throw new Error('Transaction failed on blockchain');
      }
    } catch (error: any) {
      console.error('Transaction monitoring error:', error);
      setError(error.message || 'Failed to confirm transaction');
      setStatus('error');
      setCurrentStage('failed');
    }
  }, [txHash]);

  // Start verification when component mounts
  useEffect(() => {
    if (currentStage === 'payment' && status === 'idle') {
      console.log('🚀 Starting payment verification...');
      verifyPayment();
    }
  }, [currentStage, status, verifyPayment]);

  // Monitor transaction when txHash is available
  useEffect(() => {
    if (txHash && status === 'confirming') {
      monitorTransaction();
    }
  }, [txHash, status, monitorTransaction]);

  const renderStageContent = () => {
    switch (currentStage) {
      case 'payment':
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
                Waiting for Payment...
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Please complete your payment on Paystack. We will verify it automatically.
              </Text>
            </View>
          </View>
        );

      case 'verifying':
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
                Verifying Payment...
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Confirming your payment with Paystack
              </Text>
            </View>
          </View>
        );

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
                {status === 'confirming' && 'Sending USDC to Your Wallet'}
                {status === 'done' && 'USDC Sent Successfully'}
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                {status === 'confirming' && 'Your USDC is being transferred to your wallet on Mantle blockchain'}
                {status === 'done' && 'Transaction confirmed on blockchain'}
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
                Transaction Complete!
              </Text>
              <Text
                style={[
                  styles.stageDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Your USDC has been successfully sent to your wallet
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
                {usdcAmount && (
                  <Text
                    style={[
                      styles.usdcAmount,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                      { marginTop: 16 },
                    ]}
                  >
                    Amount Received: {parseFloat(usdcAmount).toFixed(6)} USDC
                  </Text>
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
      {currentStage !== 'complete' && currentStage !== 'failed' && (
        <BackButton style={styles.backButton} />
      )}
      
      {/* Transaction Summary */}
      <Card style={styles.summaryCard}>
        <Text
          style={[
            styles.summaryTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Transaction Summary
        </Text>
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            Amount Paid
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            ₦{parseFloat(ngnAmount || '0').toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text
            style={[
              styles.summaryLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            You will Receive
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: BridgeFiColors.success },
            ]}
          >
            {usdcAmount || '0.000000'} USDC
          </Text>
        </View>
        {reference && (
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Payment Reference
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                { fontFamily: 'monospace', fontSize: 12 },
              ]}
            >
              {reference.slice(0, 12)}...
            </Text>
          </View>
        )}
      </Card>

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
  summaryCard: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
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
  usdcAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardButton: {
    marginTop: 32,
  },
  retryButton: {
    marginTop: 32,
  },
});
