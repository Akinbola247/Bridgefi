/**
 * Onramp Payment Method Selection
 * User chooses payment method and completes payment
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Complete web browser authentication when done
WebBrowser.maybeCompleteAuthSession();

type PaymentMethod = 'card' | 'bank' | 'apple_pay';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  fee: string;
  speed: string;
  limit: string;
  icon: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Instant payment with card',
    fee: '2.9%',
    speed: 'Instant',
    limit: '$5,000 daily',
    icon: '💳',
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Direct bank transfer',
    fee: '0.5%',
    speed: '1-2 business days',
    limit: '$25,000 daily',
    icon: '🏦',
  },
  {
    id: 'apple_pay',
    name: 'Apple Pay / Google Pay',
    description: 'Quick mobile payment',
    fee: '1.5%',
    speed: 'Instant',
    limit: '$2,500 daily',
    icon: '📱',
  },
];

export default function OnrampPaymentPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const ngnAmount = params.ngnAmount as string;
  const usdcAmount = params.usdcAmount as string;
  const exchangeRate = params.exchangeRate as string;
  const paymentLink = params.paymentLink as string;
  const reference = params.reference as string;
  const quoteId = params.quoteId as string;

  const handlePayNow = async () => {
    if (!paymentLink) {
      Alert.alert('Error', 'Payment link not available');
      return;
    }

    try {
      setIsLoading(true);
      
      // Open Paystack payment page
      const result = await WebBrowser.openBrowserAsync(paymentLink, {
        showTitle: true,
        toolbarColor: BridgeFiColors.primary.main,
        enableBarCollapsing: false,
      });

      // After payment page closes, navigate to processing
      // Processing page will verify payment and wait for USDC transfer
      router.push({
        //@ts-ignore
        pathname: '/onramp/processing',
        params: {
          quoteId,
          reference,
          ngnAmount,
          usdcAmount,
          exchangeRate,
        },
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to open payment page. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPaymentLink = () => {
    if (paymentLink) {
      Linking.openURL(paymentLink);
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
      <BackButton style={styles.backButtonTop} />
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Choose Payment Method
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Complete payment with Paystack
        </Text>
      </View>

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
            Amount to Pay
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
            You will receive
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
        {exchangeRate && (
          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryLabel,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Exchange Rate
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              1 USDC = ₦{parseFloat(exchangeRate).toFixed(2)}
            </Text>
          </View>
        )}
      </Card>

      {/* Payment Instructions */}
      <Card style={styles.instructionsCard}>
        <Text
          style={[
            styles.instructionsTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Payment Instructions
        </Text>
        <Text
          style={[
            styles.instructionsText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          1. Click &quot;Pay with Paystack&quot; below{'\n'}
          2. On Paystack, choose your payment method:{'\n'}
             • Card: Instant payment with credit/debit card{'\n'}
             • Bank Transfer: Direct bank transfer (1-2 business days){'\n'}
             • USSD: Quick payment via mobile banking{'\n'}
          3. Complete payment on Paystack{'\n'}
          4. Return to this app - USDC will be sent automatically{'\n'}
          5. Transaction typically completes in 1-2 minutes
        </Text>
      </Card>

      {/* Payment Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? "Opening Payment..." : "Pay with Paystack"}
          onPress={handlePayNow}
          size="large"
          fullWidth
          disabled={!paymentLink || isLoading}
          loading={isLoading}
        />
        {paymentLink && (
          <Button
            title="Open Payment Link in Browser"
            onPress={handleOpenPaymentLink}
            variant="ghost"
            size="medium"
            fullWidth
            style={styles.secondaryButton}
          />
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
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
  instructionsCard: {
    marginBottom: 24,
    backgroundColor: BridgeFiColors.primary.main + '10',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    marginTop: 12,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  backButtonTop: {
    marginBottom: 16,
  },
});

