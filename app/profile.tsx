/**
 * Profile Page
 * Manage accounts, view addresses, copy private keys, delete wallet
 */

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAllWallets,
  deleteWallet,
  clearWallet,
  getMasterMnemonic,
  setCurrentAccountIndex,
  getCurrentAccountIndex,
  StoredWallet,
} from '@/utils/walletStorage';
import { deriveAccountFromMnemonic } from '@/utils/walletUtils';
import { saveWallet } from '@/utils/walletStorage';

export default function ProfilePage() {
  const router = useRouter();
  const { address, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [wallets, setWallets] = useState<StoredWallet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setIsLoadingWallets(true);
      const allWallets = await getAllWallets();
      const currentIdx = await getCurrentAccountIndex();
      setWallets(allWallets);
      setCurrentIndex(currentIdx);
    } catch (error) {
      console.error('Failed to load wallets:', error);
    } finally {
      setIsLoadingWallets(false);
    }
  };

  const handleCopyAddress = async (walletAddress: string) => {
    try {
      await Clipboard.setString(walletAddress);
      setCopiedAddress(walletAddress);
      Alert.alert('Copied', 'Address copied to clipboard');
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('Error', 'Failed to copy address');
    }
  };

  const handleCopyPrivateKey = async (privateKey: string) => {
    try {
      await Clipboard.setString(privateKey);
      setCopiedPrivateKey(privateKey);
      Alert.alert('Copied', 'Private key copied to clipboard');
      setTimeout(() => setCopiedPrivateKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy private key:', error);
      Alert.alert('Error', 'Failed to copy private key');
    }
  };

  const handleShowPrivateKey = (wallet: StoredWallet) => {
    Alert.alert(
      'Show Private Key',
      '⚠️ Warning: Never share your private key with anyone. Anyone with access to it can control your wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show',
          style: 'destructive',
          onPress: () => setShowPrivateKey(showPrivateKey === wallet.id ? null : wallet.id),
        },
      ]
    );
  };

  const handleCreateAccount = async () => {
    try {
      setCreatingAccount(true);
      const mnemonic = await getMasterMnemonic();
      if (!mnemonic) {
        Alert.alert('Error', 'No master mnemonic found. Cannot create additional accounts.');
        return;
      }

      // Find the highest account index
      const maxIndex = wallets
        .filter(w => w.accountIndex >= 0)
        .reduce((max, w) => Math.max(max, w.accountIndex), -1);
      
      const newAccountIndex = maxIndex + 1;
      const newWallet = await deriveAccountFromMnemonic(mnemonic, newAccountIndex);
      await saveWallet(newWallet);
      
      Alert.alert('Success', `Account ${newAccountIndex + 1} created successfully!`);
      await loadWallets();
    } catch (error) {
      console.error('Failed to create account:', error);
      Alert.alert('Error', 'Failed to create new account');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleSwitchAccount = async (index: number) => {
    try {
      setSwitchingAccount(wallets[index]?.id || null);
      await setCurrentAccountIndex(index);
      setCurrentIndex(index);
      Alert.alert('Success', 'Account switched successfully');
      // Reload to update the app state
      setTimeout(() => {
        //@ts-ignore
        router.replace('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Failed to switch account:', error);
      Alert.alert('Error', 'Failed to switch account');
    } finally {
      setSwitchingAccount(null);
    }
  };

  const handleDeleteWallet = (wallet: StoredWallet) => {
    if (wallets.length === 1) {
      Alert.alert(
        'Delete Wallet',
        'This is your only wallet. Deleting it will remove all wallet data from this device. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                await clearWallet();
                await logout();
                //@ts-ignore
                router.replace('/wallet-setup');
              } catch (error) {
                console.error('Failed to delete wallet:', error);
                Alert.alert('Error', 'Failed to delete wallet');
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Account',
        `Are you sure you want to delete account ${wallet.accountIndex >= 0 ? wallet.accountIndex + 1 : 'imported'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeletingAccount(wallet.id);
                await deleteWallet(wallet.id);
                await loadWallets();
                Alert.alert('Success', 'Account deleted successfully');
              } catch (error) {
                console.error('Failed to delete account:', error);
                Alert.alert('Error', 'Failed to delete account');
              } finally {
                setDeletingAccount(null);
              }
            },
          },
        ]
      );
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
          Profile
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Manage your accounts and wallet settings
        </Text>
      </View>

      {/* Network Info */}
      <Card style={styles.networkCard}>
        <View style={styles.networkHeader}>
          <Text
            style={[
              styles.networkTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Network
          </Text>
          <View
            style={[
              styles.networkBadge,
              { backgroundColor: BridgeFiColors.primary.main + '20' },
            ]}
          >
            <Text style={[styles.networkBadgeText, { color: BridgeFiColors.primary.main }]}>
              Mantle
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.networkDescription,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          All accounts operate on the Mantle blockchain network
        </Text>
      </Card>

      {/* Accounts List */}
      <View style={styles.accountsSection}>
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Accounts ({wallets.length})
          </Text>
          {wallets.length > 0 && wallets.some(w => w.accountIndex >= 0) && (
            <Button
              title={creatingAccount ? "Creating..." : "+ New Account"}
              onPress={handleCreateAccount}
              size="small"
              variant="outline"
              loading={creatingAccount}
              disabled={creatingAccount}
            />
          )}
        </View>

        {isLoadingWallets ? (
          <Card style={styles.emptyCard}>
            <LoadingSpinner size="large" />
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                { marginTop: 16 },
              ]}
            >
              Loading accounts...
            </Text>
          </Card>
        ) : wallets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text
              style={[
                styles.emptyText,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              No accounts found
            </Text>
          </Card>
        ) : (
          wallets.map((wallet, index) => (
            <Card key={wallet.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.accountInfo}>
                  <Text
                    style={[
                      styles.accountName,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    Account {wallet.accountIndex >= 0 ? wallet.accountIndex + 1 : 'Imported'}
                  </Text>
                  {index === currentIndex && (
                    <View style={[styles.activeBadge, { backgroundColor: BridgeFiColors.success + '20' }]}>
                      <Text style={[styles.activeBadgeText, { color: BridgeFiColors.success }]}>
                        Active
                      </Text>
                    </View>
                  )}
                </View>
                {index !== currentIndex && (
                  <Button
                    title={switchingAccount === wallet.id ? "Switching..." : "Switch"}
                    onPress={() => handleSwitchAccount(index)}
                    size="small"
                    variant="outline"
                    loading={switchingAccount === wallet.id}
                    disabled={switchingAccount === wallet.id}
                  />
                )}
              </View>

              <View style={styles.addressRow}>
                <View style={styles.addressContainer}>
                  <Text
                    style={[
                      styles.addressLabel,
                      { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                    ]}
                  >
                    Address
                  </Text>
                  <Text
                    style={[
                      styles.addressValue,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {wallet.address}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleCopyAddress(wallet.address)}
                  style={styles.copyButton}
                >
                  <Text style={styles.copyIcon}>
                    {copiedAddress === wallet.address ? '✓' : '📋'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.privateKeyRow}>
                <View style={styles.privateKeyContainer}>
                  <Text
                    style={[
                      styles.privateKeyLabel,
                      { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                    ]}
                  >
                    Private Key
                  </Text>
                  {showPrivateKey === wallet.id ? (
                    <Text
                      style={[
                        styles.privateKeyValue,
                        { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {wallet.privateKey}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.privateKeyHidden,
                        { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                      ]}
                    >
                      ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (showPrivateKey === wallet.id) {
                      handleCopyPrivateKey(wallet.privateKey);
                    } else {
                      handleShowPrivateKey(wallet);
                    }
                  }}
                  style={styles.copyButton}
                >
                  <Text style={styles.copyIcon}>
                    {showPrivateKey === wallet.id
                      ? copiedPrivateKey === wallet.privateKey
                        ? '✓'
                        : '📋'
                      : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteWallet(wallet)}
                style={[
                  styles.deleteButton,
                  deletingAccount === wallet.id && styles.deleteButtonDisabled,
                ]}
                disabled={deletingAccount === wallet.id}
              >
                {deletingAccount === wallet.id ? (
                  <Text style={[styles.deleteButtonText, { color: BridgeFiColors.text.secondary }]}>
                    Deleting...
                  </Text>
                ) : (
                  <Text style={[styles.deleteButtonText, { color: BridgeFiColors.error }]}>
                    Delete Account
                  </Text>
                )}
              </TouchableOpacity>
            </Card>
          ))
        )}
      </View>

      {/* Delete All Wallet */}
      <Card style={styles.dangerCard}>
        <Text
          style={[
            styles.dangerTitle,
            { color: BridgeFiColors.error },
          ]}
        >
          Danger Zone
        </Text>
        <Text
          style={[
            styles.dangerDescription,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Permanently delete all wallet data from this device. This action cannot be undone.
        </Text>
        <Button
          title={isLoading ? "Deleting..." : "Delete All Wallets"}
          onPress={() => {
            Alert.alert(
              'Delete All Wallets',
              'Are you sure you want to delete all wallets? This will remove all wallet data from this device and you will need to set up a new wallet.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setIsLoading(true);
                      await clearWallet();
                      await logout();
                      //@ts-ignore
                      router.replace('/wallet-setup');
                    } catch (error) {
                      console.error('Failed to delete all wallets:', error);
                      Alert.alert('Error', 'Failed to delete wallets');
                    } finally {
                      setIsLoading(false);
                    }
                  },
                },
              ]
            );
          }}
          variant="danger"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        />
      </Card>
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
    paddingBottom: 40,
  },
  backButtonTop: {
    marginBottom: 16,
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
  networkCard: {
    marginBottom: 24,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  networkBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  networkBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  networkDescription: {
    fontSize: 14,
  },
  accountsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  accountCard: {
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addressContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  privateKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  privateKeyContainer: {
    flex: 1,
  },
  privateKeyLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  privateKeyValue: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  privateKeyHidden: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
  },
  copyIcon: {
    fontSize: 18,
  },
  deleteButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  dangerCard: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BridgeFiColors.error + '30',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
});

