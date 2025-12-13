/**
 * Send Crypto to Address Page
 * Allows users to send crypto to any wallet address
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { ethers } from 'ethers';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


const MANTLE_SEPOLIA_RPC_URL = 'https://rpc.sepolia.mantle.xyz';

export default function SendToCryptoAddressPage() {
  const router = useRouter();
  const { address } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<'MNT' | 'USDC'>('MNT');
  const [isLoading, setIsLoading] = useState(false);
  const [addressError, setAddressError] = useState('');

  // USDC token address on Mantle Sepolia
  const USDC_TOKEN_ADDRESS = '0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F';

  const validateAddress = (addr: string): boolean => {
    try {
      return ethers.utils.isAddress(addr);
    } catch {
      return false;
    }
  };

  const handleAddressChange = (text: string) => {
    setRecipientAddress(text);
    if (text && !validateAddress(text)) {
      setAddressError('Invalid wallet address');
    } else {
      setAddressError('');
    }
  };

  const handleContinue = async () => {
    if (!recipientAddress || !validateAddress(recipientAddress)) {
      Alert.alert('Error', 'Please enter a valid wallet address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      // Navigate to confirmation page
      router.push({
        //@ts-ignore
        pathname: '/spend/confirm',
        params: {
          type: 'crypto-address',
          recipientAddress: recipientAddress,
          amount: amount,
          token: selectedToken,
          usdcTokenAddress: USDC_TOKEN_ADDRESS,
        },
      });
    } catch (error) {
      console.error('Failed to continue:', error);
      Alert.alert('Error', 'Failed to proceed. Please try again.');
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
          router.push('/spend');
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
          Send to Crypto Address
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Send crypto to any wallet address on Mantle network
        </Text>
      </View>

      {/* Token Selection */}
      <Card style={styles.tokenCard}>
        <Text
          style={[
            styles.label,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Select Token
        </Text>
        <View style={styles.tokenOptions}>
          <TouchableOpacity
            style={[
              styles.tokenOption,
              selectedToken === 'MNT' && {
                backgroundColor: BridgeFiColors.primary.main + '20',
                borderColor: BridgeFiColors.primary.main,
              },
            ]}
            onPress={() => setSelectedToken('MNT')}
          >
            <Text
              style={[
                styles.tokenOptionText,
                {
                  color: selectedToken === 'MNT'
                    ? BridgeFiColors.primary.main
                    : isDark
                    ? BridgeFiColors.text.inverse
                    : BridgeFiColors.text.primary,
                },
              ]}
            >
              MNT
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tokenOption,
              selectedToken === 'USDC' && {
                backgroundColor: BridgeFiColors.primary.main + '20',
                borderColor: BridgeFiColors.primary.main,
              },
            ]}
            onPress={() => setSelectedToken('USDC')}
          >
            <Text
              style={[
                styles.tokenOptionText,
                {
                  color: selectedToken === 'USDC'
                    ? BridgeFiColors.primary.main
                    : isDark
                    ? BridgeFiColors.text.inverse
                    : BridgeFiColors.text.primary,
                },
              ]}
            >
              USDC
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Amount Input */}
      <Card style={styles.inputCard}>
        <Text
          style={[
            styles.label,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Amount
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
          <View style={styles.currencyLabel}>
            <Text
              style={[
                styles.currencyText,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              {selectedToken}
            </Text>
          </View>
        </View>
      </Card>

      {/* Recipient Address */}
      <Card style={styles.inputCard}>
        <Text
          style={[
            styles.label,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Recipient Address
        </Text>
        <Input
          placeholder="0x..."
          value={recipientAddress}
          onChangeText={handleAddressChange}
          error={addressError}
          style={styles.addressInput}
          containerStyle={styles.inputContainer}
        />
        <Text
          style={[
            styles.helperText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Enter the wallet address on Mantle network
        </Text>
      </Card>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? 'Processing...' : 'Continue'}
          onPress={handleContinue}
          size="large"
          fullWidth
          disabled={!recipientAddress || !amount || !!addressError || isLoading}
          loading={isLoading}
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
  tokenCard: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tokenOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  tokenOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BridgeFiColors.border.light,
    alignItems: 'center',
  },
  tokenOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputCard: {
    marginBottom: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  currencyLabel: {
    paddingLeft: 16,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  addressInput: {
    fontFamily: 'monospace',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 24,
  },
});

