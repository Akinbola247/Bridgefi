/**
 * Send to Bank Account Number Page
 * Allows users to send crypto to Nigerian bank account using account number
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  fetchNigerianBanks,
  validateNUBANFormat,
  verifyAccountNumber,
  type NigerianBank,
} from '@/utils/nigerianBanks';
import { initiateOfframp } from '@/utils/onrampOfframp';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SendToBankAccountPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [selectedBank, setSelectedBank] = useState<NigerianBank | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<'MNT' | 'USDC'>('USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [banks, setBanks] = useState<NigerianBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<NigerianBank[]>([]);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [isAccountConfirmed, setIsAccountConfirmed] = useState(false);

  // Fetch banks on mount
  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setIsLoadingBanks(true);
      const fetchedBanks = await fetchNigerianBanks();
      setBanks(fetchedBanks);
      setFilteredBanks(fetchedBanks);
    } catch (error: any) {
      console.error('Failed to load banks:', error);
      const errorMessage = error?.message || 'Failed to load banks from Paystack API. Please check your API configuration.';
      Alert.alert(
        'Error Loading Banks',
        errorMessage + '\n\nPlease verify:\n• Your PAYSTACK_SECRET_KEY is set correctly\n• Your API key has proper permissions\n• You have an active internet connection',
        [{ text: 'OK' }]
      );
      // Don't set banks - user cannot proceed without valid bank list
    } finally {
      setIsLoadingBanks(false);
    }
  };

  // Filter banks based on search query
  useEffect(() => {
    if (!bankSearchQuery.trim()) {
      setFilteredBanks(banks);
    } else {
      const query = bankSearchQuery.toLowerCase().trim();
      const filtered = banks.filter((bank) =>
        bank.name.toLowerCase().includes(query) ||
        bank.code.toLowerCase().includes(query) ||
        (bank.slug && bank.slug.toLowerCase().includes(query))
      );
      setFilteredBanks(filtered);
    }
  }, [bankSearchQuery, banks]);

  const verifyAccount = useCallback(async () => {
    if (!validateNUBANFormat(accountNumber) || !selectedBank) {
      setAccountError('Please enter a valid 10-digit account number');
      setIsAccountConfirmed(false);
      return;
    }

    try {
      setIsVerifyingAccount(true);
      setAccountError('');
      setIsAccountConfirmed(false);

      const result = await verifyAccountNumber(accountNumber, selectedBank.code);

      if (result.valid && result.accountName) {
        setAccountName(result.accountName);
        setAccountError('');
        setIsAccountConfirmed(true); // Auto-confirm when verified
      } else {
        setAccountName('');
        setAccountError(result.error || 'Account number could not be verified');
        setIsAccountConfirmed(false);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setAccountError('Failed to verify account. Please check and try again.');
      setIsAccountConfirmed(false);
    } finally {
      setIsVerifyingAccount(false);
    }
  }, [accountNumber, selectedBank]);

  // Verify account number when both account number and bank are provided
  // Increased debounce time to prevent multiple rapid API calls
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      // Only auto-verify if account name is not already set (to avoid unnecessary calls)
      if (!accountName) {
        const timeoutId = setTimeout(() => {
          verifyAccount(); // Auto-verify
        }, 1000); // Increased debounce to 1 second to reduce API calls

        return () => clearTimeout(timeoutId);
      }
    } else {
      setAccountError('');
      setAccountName('');
      setIsAccountConfirmed(false);
    }
  }, [accountNumber, selectedBank, verifyAccount, accountName]);

  const handleContinue = async () => {
    if (!accountNumber || !validateNUBANFormat(accountNumber)) {
      Alert.alert('Error', 'Please enter a valid 10-digit account number');
      return;
    }

    if (!selectedBank) {
      Alert.alert('Error', 'Please select a bank');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Require account verification before proceeding
    if (!accountName || accountError) {
      Alert.alert(
        'Account Not Verified',
        'Please wait for the account number to be verified before proceeding.',
        [{ text: 'OK' }]
      );
      return;
    }

    // For bank transfers, only USDC is supported (converts to NGN)
    if (selectedToken !== 'USDC') {
      Alert.alert(
        'Token Not Supported',
        'Bank transfers currently only support USDC. Please select USDC to send to a bank account.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsLoading(true);
      
      const usdcAmount = parseFloat(amount);
      
      // Initiate offramp with backend (USDC → NGN conversion)
      const quote = await initiateOfframp(
        usdcAmount,
        accountNumber,
        selectedBank.code,
        accountName
      );

      // Navigate to confirmation page with offramp quote details
      router.push({
        //@ts-ignore
        pathname: '/spend/confirm',
        params: {
          type: 'bank-account',
          quoteId: quote.quoteId,
          accountNumber: accountNumber,
          accountName: accountName,
          bank: selectedBank.name,
          bankCode: selectedBank.code,
          amount: amount,
          usdcAmount: amount,
          ngnAmount: quote.ngnAmount.toFixed(2),
          exchangeRate: quote.exchangeRate.toFixed(2),
          token: selectedToken,
        },
      });
    } catch (error: any) {
      console.error('Failed to initiate offramp:', error);
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
          Send to Bank Account
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Send crypto to a Nigerian bank account using account number
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

      {/* Bank Selection */}
      <Card style={styles.inputCard}>
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Select Bank
          </Text>
          <Text
            style={[
              styles.helperText,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            💡 Tip: Use &quot;Test Bank (001)&quot; for unlimited testing
          </Text>
        </View>
        {isLoadingBanks ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
            <Text
              style={[
                styles.loadingText,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Loading banks...
            </Text>
          </View>
        ) : (
          <>
            {/* Bank Search Input */}
            <Input
              placeholder="Search banks..."
              value={bankSearchQuery}
              onChangeText={setBankSearchQuery}
              style={styles.searchInput}
              containerStyle={styles.searchContainer}
            />
            {filteredBanks.length === 0 && bankSearchQuery.trim() && (
              <Text
                style={[
                  styles.noResultsText,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                No banks found matching &quot;{bankSearchQuery}&quot;
              </Text>
            )}
            <ScrollView style={styles.bankList} nestedScrollEnabled>
              {filteredBanks.map((bank, index) => (
                <TouchableOpacity
                  key={`${bank.code}-${bank.name}-${index}`}
                  style={[
                    styles.bankOption,
                    selectedBank?.code === bank.code && {
                      backgroundColor: BridgeFiColors.primary.main + '20',
                      borderColor: BridgeFiColors.primary.main,
                    },
                  ]}
                  onPress={() => setSelectedBank(bank)}
                >
                  <Text
                    style={[
                      styles.bankOptionText,
                      {
                        color: selectedBank?.code === bank.code
                          ? BridgeFiColors.primary.main
                          : isDark
                          ? BridgeFiColors.text.inverse
                          : BridgeFiColors.text.primary,
                      },
                    ]}
                  >
                    {bank.name}
                  </Text>
                  {selectedBank?.code === bank.code && (
                    <Text style={[styles.checkmark, { color: BridgeFiColors.primary.main }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </Card>

      {/* Account Number */}
      <Card style={styles.inputCard}>
        <Text
          style={[
            styles.label,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Account Number
        </Text>
        <View style={styles.accountInputContainer}>
          <Input
            placeholder="1234567890"
            value={accountNumber}
            onChangeText={(text) => {
              setAccountNumber(text);
              setAccountError('');
            }}
            keyboardType="number-pad"
            maxLength={10}
            error={accountError}
            style={styles.accountInput}
            containerStyle={styles.inputContainer}
          />
          {isVerifyingAccount && (
            <View style={styles.verifyingIndicator}>
              <LoadingSpinner size="small" />
            </View>
          )}
        </View>
        {accountName && !accountError && (
          <View style={styles.verifiedAccountContainer}>
            <Text style={[styles.verifiedText, { color: BridgeFiColors.success }]}>
              ✓ Verified: {accountName}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.helperText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          {accountNumber.length === 10 && selectedBank
            ? 'Verifying account number...'
            : '10-digit Nigerian bank account number'}
        </Text>
      </Card>

      {/* Account Confirmation Card */}
      {accountName && !accountError && accountNumber.length === 10 && selectedBank && (
        <Card style={styles.confirmationCard}>
          <Text
            style={[
              styles.label,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Account Confirmation
          </Text>
          <View style={styles.confirmationDetails}>
            <View style={styles.confirmationRow}>
              <Text
                style={[
                  styles.confirmationLabel,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Bank:
              </Text>
              <Text
                style={[
                  styles.confirmationValue,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                {selectedBank.name}
              </Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text
                style={[
                  styles.confirmationLabel,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Account Number:
              </Text>
              <Text
                style={[
                  styles.confirmationValue,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                {accountNumber}
              </Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text
                style={[
                  styles.confirmationLabel,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Account Name:
              </Text>
              <Text
                style={[
                  styles.confirmationValue,
                  {
                    color: isAccountConfirmed
                      ? BridgeFiColors.success
                      : isDark
                      ? BridgeFiColors.text.inverse
                      : BridgeFiColors.text.primary,
                    fontWeight: isAccountConfirmed ? '600' : '400',
                  },
                ]}
              >
                {accountName}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? 'Processing...' : 'Continue'}
          onPress={handleContinue}
          size="large"
          fullWidth
          disabled={
            !accountNumber ||
            !selectedBank ||
            !amount ||
            isLoading ||
            !validateNUBANFormat(accountNumber) ||
            !accountName ||
            !!accountError ||
            isVerifyingAccount
          }
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
  labelContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  bankList: {
    maxHeight: 200,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  bankOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BridgeFiColors.border.light,
    marginBottom: 8,
  },
  bankOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  accountInput: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  accountInputContainer: {
    position: 'relative',
  },
  verifyingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  verifiedAccountContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: BridgeFiColors.success + '20',
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationCard: {
    marginBottom: 20,
    borderWidth: 2,
    borderColor: BridgeFiColors.primary.main + '40',
  },
  confirmationDetails: {
    marginBottom: 16,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BridgeFiColors.border.light,
  },
  confirmationLabel: {
    fontSize: 14,
    flex: 1,
  },
  confirmationValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  confirmedBadge: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: BridgeFiColors.success + '20',
    alignItems: 'center',
  },
  confirmedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 24,
  },
});

