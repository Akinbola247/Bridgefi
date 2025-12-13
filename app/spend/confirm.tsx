/**
 * Spend Crypto Confirmation Page
 * Confirms the transaction details before processing
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { sendMNT, sendUSDC } from '@/utils/tokenTransfer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SpendConfirmPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getPrivateKey } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const type = params.type as string;
  const amount = params.amount as string;
  const token = params.token as string;
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    // Handle bank transfers using offramp flow
    if (type === 'bank-account') {
      // Navigate to processing page with offramp quote details
      router.push({
        //@ts-ignore
        pathname: '/spend/processing',
        params: {
          ...params,
          type: type,
          isBankTransfer: 'true',
        },
      });
      return;
    }

    // Handle crypto address transfers (direct blockchain)
    if (type !== 'crypto-address') {
      Alert.alert('Error', 'Invalid transaction type');
      return;
    }

    try {
      setIsLoading(true);

      // Get private key
      const privateKey = await getPrivateKey();
      if (!privateKey) {
        throw new Error('Wallet not found');
      }

      const recipientAddress = params.recipientAddress as string;
      let txHash: string;

      // Execute transaction based on token type
      if (token === 'MNT') {
        const tx = await sendMNT(privateKey, recipientAddress, amount);
        txHash = tx.hash;
      } else if (token === 'USDC') {
        const usdcTokenAddress = params.usdcTokenAddress as string;
        const tx = await sendUSDC(privateKey, recipientAddress, amount, usdcTokenAddress);
        txHash = tx.hash;
      } else {
        throw new Error('Invalid token type');
      }

      // Navigate to processing page with transaction hash
      router.push({
        //@ts-ignore
        pathname: '/spend/processing',
        params: {
          ...params,
          txHash: txHash,
        },
      });
    } catch (error: any) {
      console.error('Transaction failed:', error);
      Alert.alert(
        'Transaction Failed',
        error.message || 'Failed to send transaction. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => setIsLoading(false),
          },
        ]
      );
    }
  };

  const renderDetails = () => {
    switch (type) {
      case 'crypto-address':
        return (
          <View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary }]}>
                Recipient Address
              </Text>
              <Text
                style={[styles.detailValue, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {params.recipientAddress}
              </Text>
            </View>
          </View>
        );
      case 'bank-account':
        return (
          <View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary }]}>
                Bank
              </Text>
              <Text style={[styles.detailValue, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}>
                {params.bank}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary }]}>
                Account Number
              </Text>
              <Text style={[styles.detailValue, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}>
                {params.accountNumber}
              </Text>
            </View>
            {params.accountName && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary }]}>
                  Account Name
                </Text>
                <Text style={[styles.detailValue, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}>
                  {params.accountName}
                </Text>
              </View>
            )}
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
      <BackButton
        onPress={() => {
          router.back();
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
          Confirm Transaction
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Please review the details before confirming
        </Text>
      </View>

      {/* Transaction Details */}
      <Card style={styles.detailsCard}>
        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Transaction Details
        </Text>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary }]}>
            Amount
          </Text>
          <Text style={[styles.detailValue, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}>
            {amount} {token}
          </Text>
        </View>

        {renderDetails()}
      </Card>

      {/* Warning */}
      <Card style={styles.warningCard}>
        <Text style={[styles.warningText, { color: BridgeFiColors.warning }]}>
          ⚠️ Please verify all details are correct. Transactions cannot be reversed once confirmed.
        </Text>
      </Card>

      {/* Confirm Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? 'Processing...' : 'Confirm & Send'}
          onPress={handleConfirm}
          size="large"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        />
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
  backButtonTop: {
    marginBottom: 16,
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
  detailsCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  warningCard: {
    marginBottom: 24,
    backgroundColor: BridgeFiColors.warning + '20',
    padding: 16,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 24,
  },
});

