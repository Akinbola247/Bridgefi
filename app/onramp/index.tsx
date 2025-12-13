/**
 * Onramp Amount Selection Page
 * User enters fiat amount to convert to USDC
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { getExchangeRate, initiateOnramp, type ExchangeRate } from '@/utils/onrampOfframp';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PROCESSING_FEE_RATE = 0.015; // 1.5% processing fee
const MIN_AMOUNT_NGN = 1000; // Minimum 1000 NGN

export default function OnrampPage() {
  const router = useRouter();
  const { address } = useAuth();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Fetch exchange rate on mount
  useEffect(() => {
    loadExchangeRate();
    // Refresh rate every 30 seconds
    const interval = setInterval(loadExchangeRate, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadExchangeRate = async () => {
    try {
      setIsLoadingRate(true);
      const rate = await getExchangeRate();
      setExchangeRate(rate);
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
      // Use fallback rate
      setExchangeRate({
        usdcToNgn: 1500,
        ngnToUsdc: 1 / 1500,
        timestamp: Date.now(),
        source: 'fallback',
      });
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Calculate receive amount and fees
  const ngnAmount = parseFloat(amount) || 0;
  const processingFee = ngnAmount * PROCESSING_FEE_RATE;
  const totalFees = processingFee;
  const netAmount = ngnAmount - totalFees;
  const receiveAmount = exchangeRate ? netAmount * exchangeRate.ngnToUsdc : 0;

  const quickAmounts = [1000, 5000, 10000, 50000]; // NGN amounts

  const handleContinue = async () => {
    if (!address) {
      Alert.alert('Error', 'Wallet address not found. Please connect your wallet.');
      return;
    }

    if (ngnAmount < MIN_AMOUNT_NGN) {
      Alert.alert('Error', `Minimum amount is ₦${MIN_AMOUNT_NGN.toLocaleString()}`);
      return;
    }

    if (!exchangeRate) {
      Alert.alert('Error', 'Exchange rate not loaded. Please try again.');
      return;
    }

      try {
        setIsLoading(true);
      
      // Initiate onramp with backend
      const quote = await initiateOnramp(ngnAmount, address);

      // Navigate to payment page
      router.push({
        //@ts-ignore
        pathname: '/onramp/payment',
        params: {
          quoteId: quote.quoteId,
          ngnAmount: amount,
          usdcAmount: quote.usdcAmount.toFixed(6),
          exchangeRate: quote.exchangeRate.toFixed(6),
          paymentLink: quote.paymentLink,
          reference: quote.reference,
        },
      });
    } catch (error: any) {
      console.error('Failed to initiate onramp:', error);
      Alert.alert('Error', error.message || 'Failed to initiate transaction. Please try again.');
      } finally {
        setIsLoading(false);
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
      <BackButton
        onPress={() => {
          //@ts-ignore
          router.push('/dashboard');
        }}
        style={styles.backButtonTop}
      />
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Buy Crypto
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Buy USDC with Nigerian Naira (NGN)
        </Text>
      </View>

      {/* Amount Input */}
      <Card style={styles.inputCard}>
        <Text
          style={[
            styles.inputLabel,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          I want to spend
        </Text>
        <View style={styles.amountInputContainer}>
          <Input
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={styles.amountInput}
            containerStyle={styles.inputContainer}
          />
          <View style={styles.currencySelector}>
            <Text
              style={[
                styles.currencyText,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              NGN
            </Text>
          </View>
        </View>

        {/* Quick Amount Buttons */}
        <View style={styles.quickAmounts}>
          {quickAmounts.map((quickAmount) => (
            <TouchableOpacity
              key={quickAmount}
              style={[
                styles.quickAmountButton,
                {
                  backgroundColor:
                    amount === quickAmount.toString()
                      ? BridgeFiColors.primary.main
                      : isDark
                      ? BridgeFiColors.background.cardDark
                      : BridgeFiColors.gray[100],
                },
              ]}
              onPress={() => setAmount(quickAmount.toString())}
            >
              <Text
                style={[
                  styles.quickAmountText,
                  {
                    color:
                      amount === quickAmount.toString()
                        ? BridgeFiColors.primary.contrast
                        : isDark
                        ? BridgeFiColors.text.inverse
                        : BridgeFiColors.text.primary,
                  },
                ]}
              >
                ₦{quickAmount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Receive Calculation */}
      <Card style={styles.receiveCard}>
        {isLoadingRate ? (
          <View style={styles.loadingRateContainer}>
            <LoadingSpinner size="small" />
            <Text
              style={[
                styles.loadingRateText,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Loading exchange rate...
            </Text>
          </View>
        ) : (
          <>
        <View style={styles.receiveHeader}>
          <Text
            style={[
              styles.receiveLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            You will receive
          </Text>
          <Text
            style={[
              styles.receiveAmount,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
                {receiveAmount > 0 ? receiveAmount.toFixed(6) : '0.000000'} USDC
          </Text>
        </View>
            {exchangeRate && (
        <Text
          style={[
            styles.exchangeRate,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
                Exchange rate: 1 USDC = ₦{exchangeRate.usdcToNgn.toFixed(2)} NGN
                {exchangeRate.source !== 'fallback' && ` (${exchangeRate.source})`}
        </Text>
            )}
          </>
        )}
      </Card>

      {/* Fee Breakdown */}
      {ngnAmount > 0 && (
        <Card style={styles.feesCard}>
          <Text
            style={[
              styles.feesTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Fee Breakdown
          </Text>
          <View style={styles.feeRow}>
            <Text
              style={[
                styles.feeLabel,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Processing Fee ({PROCESSING_FEE_RATE * 100}%)
            </Text>
            <Text
              style={[
                styles.feeValue,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              ₦{processingFee.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.feeRow, styles.totalFeeRow]}>
            <Text
              style={[
                styles.totalFeeLabel,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Total Fees
            </Text>
            <Text
              style={[
                styles.totalFeeValue,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              ₦{totalFees.toFixed(2)}
            </Text>
          </View>
        </Card>
      )}

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? "Processing..." : "Continue to Payment"}
          onPress={handleContinue}
          size="large"
          fullWidth
          disabled={ngnAmount < MIN_AMOUNT_NGN || isLoading || isLoadingRate || !address}
          loading={isLoading}
        />
        {ngnAmount > 0 && ngnAmount < MIN_AMOUNT_NGN && (
          <Text
            style={[
              styles.minAmountError,
              { color: BridgeFiColors.error },
            ]}
          >
            Minimum amount is ₦{MIN_AMOUNT_NGN.toLocaleString()}
          </Text>
        )}
        {!address && (
          <Text
            style={[
              styles.minAmountError,
              { color: BridgeFiColors.error },
            ]}
          >
            Please connect your wallet first
          </Text>
        )}
      </View>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  inputCard: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  currencySelector: {
    paddingLeft: 16,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  quickAmountButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiveCard: {
    marginBottom: 20,
  },
  receiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiveLabel: {
    fontSize: 14,
  },
  receiveAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  exchangeRate: {
    fontSize: 12,
  },
  feesCard: {
    marginBottom: 24,
  },
  feesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
  },
  feeValue: {
    fontSize: 14,
  },
  totalFeeRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BridgeFiColors.border.light,
  },
  totalFeeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalFeeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  minAmountError: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingRateText: {
    marginLeft: 8,
    fontSize: 14,
  },
  backButtonTop: {
    marginBottom: 16,
  },
});

