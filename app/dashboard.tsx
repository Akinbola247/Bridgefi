/**
 * Dashboard Page
 * Central hub for all activities with balance, transactions, and quick actions
 */

import { Badge } from '@/components/ui/Badge';
import { BridgeFiLogo } from '@/components/ui/BridgeFiLogo';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import ERC20_ABI from '@/utils/ERC20_ABI.json';
import { getUserTransactions } from '@/utils/onrampOfframp';
import { setCurrentAccountIndex } from '@/utils/walletStorage';
import { ethers } from 'ethers';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


const MANTLE_SEPOLIA_RPC_URL = 'https://rpc.sepolia.mantle.xyz';


const USDC_TOKEN_ADDRESS = '0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F';

// CoinGecko API for fetching MNT price
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=mantle&vs_currencies=usd';

// ERC20 ABI for balanceOf function
// const ERC20_ABI = [
//   'function balanceOf(address owner) view returns (uint256)',
//   'function decimals() view returns (uint8)',
// ];

// Transaction interface
interface Transaction {
  id: string;
  type: 'onramp' | 'offramp';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string | null;
  reference?: string | null;
  metadata?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const { address, allWallets = [], currentAccountIndex = 0, network = 'Mantle' } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [copied, setCopied] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAddressCopied, setDepositAddressCopied] = useState(false);
  const [mntBalance, setMntBalance] = useState<string>('0');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [totalBalance, setTotalBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Fetch MNT price in USD
  const fetchMntPrice = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch(COINGECKO_API_URL);
      const data = await response.json();
      if (data.mantle && data.mantle.usd) {
        return data.mantle.usd;
      }
      return 0;
    } catch (error) {
      console.error('Failed to fetch MNT price:', error);
      return 0;
    }
  }, []);

  // Fetch user transactions
  const fetchTransactions = useCallback(async () => {
    if (!address) {
      setTransactions([]);
      return;
    }

    setIsLoadingTransactions(true);
    try {
      const result = await getUserTransactions(address, { limit: 5 });
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      // Keep empty array on error
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [address]);

  // Fetch wallet balances using ethers.js
  const fetchBalance = useCallback(async () => {
    if (!address) {
      setMntBalance('0');
      setUsdcBalance('0');
      setTotalBalance('0');
      return;
    }

    setIsLoadingBalance(true);
    try {
      // Fetch MNT price first
      const currentMntPrice = await fetchMntPrice();
      
      // Create provider for Mantle Sepolia network
      const provider = new ethers.providers.JsonRpcProvider(MANTLE_SEPOLIA_RPC_URL);
      
      // Get MNT balance (native token) in wei
      const balanceWei = await provider.getBalance(address);
      
      // Convert from wei to MNT
      const balanceMnt = ethers.utils.formatEther(balanceWei);
      const mntAmount = parseFloat(balanceMnt);
      
      // Format MNT balance for display
      const formattedMntBalance = mntAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
      
      setMntBalance(formattedMntBalance);
      
      // Get USDC token balance
      try {
        const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, provider);
        const usdcBalanceWei = await usdcContract.balanceOf(address);
        
        // Convert from wei to USDC (18 decimals)
        const balanceUsdc = ethers.utils.formatEther(usdcBalanceWei);
        const usdcAmount = parseFloat(balanceUsdc);
        
        // Format USDC balance for display
        const formattedUsdcBalance = usdcAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        });
        
        setUsdcBalance(formattedUsdcBalance);
        
        // Calculate total balance in USD:
        // 1. Convert MNT balance to USD using current price
        // 2. Add USDC balance
        const mntValueUSD = mntAmount * currentMntPrice;
        const totalUSD = mntValueUSD + usdcAmount;
        
        const formattedTotal = totalUSD.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        
        setTotalBalance(formattedTotal);
      } catch (usdcError) {
        console.error('Failed to fetch USDC balance:', usdcError);
        setUsdcBalance('0');
        // Set total to just MNT USD value if USDC fetch fails
        const mntValueUSD = mntAmount * currentMntPrice;
        const formattedTotal = mntValueUSD.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        setTotalBalance(formattedTotal);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setMntBalance('0');
      setUsdcBalance('0');
      setTotalBalance('0');
      // Don't show alert for balance fetch errors, just log them
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, fetchMntPrice]);

  // Fetch MNT price on mount and periodically
  useEffect(() => {
    fetchMntPrice();
    const priceInterval = setInterval(() => {
      fetchMntPrice();
    }, 60000); // Update price every minute
    
    return () => clearInterval(priceInterval);
  }, [fetchMntPrice]);

  // Fetch transactions when address changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fetch balance when address changes
  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(() => {
      fetchBalance();
    }, 180000);
    
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await Clipboard.setString(address);
        setCopied(true);
        // Don't show alert for copy, just visual feedback
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
        Alert.alert('Error', 'Failed to copy address');
      }
    }
  };

  const handleCopyDepositAddress = async () => {
    if (address) {
      try {
        await Clipboard.setString(address);
        setDepositAddressCopied(true);
        Alert.alert('Copied', 'Deposit address copied to clipboard');
        setTimeout(() => setDepositAddressCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy deposit address:', error);
        Alert.alert('Error', 'Failed to copy address');
      }
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
      {/* Modern Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          //@ts-ignore
          onPress={() => router.push('/profile')}
          style={styles.profileSection}
          activeOpacity={0.7}
        >
          <View style={styles.profileAvatar}>
            <BridgeFiLogo size={40} variant="gradient" />
          </View>
          <View style={styles.profileInfo}>
          <Text
            style={[
                styles.profileName,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
              BridgeFi User
          </Text>
          <Text
            style={[
                styles.profileUsername,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
              @bridgefi
          </Text>
        </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
        <TouchableOpacity
          //@ts-ignore
          onPress={() => router.push('/profile')}
            style={[
              styles.profileBackButton,
              {
                backgroundColor: isDark 
                  ? BridgeFiColors.background.cardDark 
                  : BridgeFiColors.gray[100],
              },
            ]}
          >
            <Text style={styles.profileBackIcon}>👤</Text>
        </TouchableOpacity>
        </View>
      </View>

      {/* Network Badge */}
      <View style={styles.networkBadgeContainer}>
        <View style={[styles.networkBadge, { backgroundColor: BridgeFiColors.primary.main + '20' }]}>
          <View style={[styles.networkDot, { backgroundColor: BridgeFiColors.primary.main }]} />
          <Text style={[styles.networkText, { color: BridgeFiColors.primary.main }]}>
            {network} Network
          </Text>
        </View>
      </View>

      {/* Account Selector */}
      {allWallets.length > 1 && (
        <Card style={styles.accountSelectorCard}>
          <TouchableOpacity
            onPress={() => setShowAccountSelector(true)}
            style={styles.accountSelectorButton}
          >
            <View style={styles.accountSelectorInfo}>
              <Text
                style={[
                  styles.accountSelectorLabel,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Active Account
              </Text>
              <Text
                style={[
                  styles.accountSelectorValue,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Account {allWallets[currentAccountIndex]?.accountIndex >= 0 
                  ? allWallets[currentAccountIndex].accountIndex + 1 
                  : 'Imported'}
              </Text>
              <Text
                style={[
                  styles.accountSelectorAddress,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {address}
              </Text>
            </View>
            <Text style={styles.accountSelectorArrow}>▼</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Total Balance Card - Modern Design */}
      <Card style={{
        ...styles.balanceCard,
        backgroundColor: isDark 
          ? 'rgba(99, 102, 241, 0.1)' 
          : 'rgba(99, 102, 241, 0.05)',
        borderWidth: 0,
      }}>
        <Text
          style={[
            styles.balanceLabel,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Total Balance
        </Text>
        {isLoadingBalance ? (
          <View style={styles.balanceLoadingContainer}>
            <LoadingSpinner size="small" />
            <Text
              style={[
                styles.balanceAmount,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary, marginLeft: 8 },
              ]}
            >
              Loading...
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={[
                styles.balanceAmount,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              ${totalBalance}
            </Text>
            <Text
              style={[
                styles.balanceUSD,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Total Assets (USD)
            </Text>
          </>
        )}
        {address && (
          <TouchableOpacity
            style={[
              styles.addressContainer,
              {
                backgroundColor: isDark
                  ? BridgeFiColors.background.cardDark
                  : BridgeFiColors.gray[100],
              },
            ]}
            onPress={handleCopyAddress}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.addressLabel,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </Text>
            <Text
              style={[
                styles.copyIcon,
                { color: copied ? BridgeFiColors.success : BridgeFiColors.primary.main },
              ]}
            >
              {copied ? '✓' : '📋'}
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Asset Balances */}
      <View style={styles.assetBalancesContainer}>
        <Card style={styles.assetCard}>
          <Text
            style={[
              styles.assetLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            MNT Balance
          </Text>
          {isLoadingBalance ? (
            <LoadingSpinner size="small" />
          ) : (
            <Text
              style={[
                styles.assetAmount,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              {mntBalance} MNT
            </Text>
          )}
        </Card>

        <Card style={styles.assetCard}>
          <Text
            style={[
              styles.assetLabel,
              { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
            ]}
          >
            USDC Balance
          </Text>
          {isLoadingBalance ? (
            <LoadingSpinner size="small" />
          ) : (
            <Text
              style={[
                styles.assetAmount,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              {usdcBalance} USDC
            </Text>
          )}
        </Card>
      </View>


      {/* Quick Actions - Modern Design */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark 
                ? 'rgba(139, 92, 246, 0.15)' 
                : 'rgba(139, 92, 246, 0.1)',
            },
          ]}
          onPress={() => setShowDepositModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text
            style={[
              styles.actionTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Deposit Crypto
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark 
                ? 'rgba(59, 130, 246, 0.15)' 
                : 'rgba(59, 130, 246, 0.1)',
            },
          ]}
          onPress={() => {
          //@ts-ignore
            router.push('/spend');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.actionIcon}>💸</Text>
          <Text
            style={[
              styles.actionTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Spend Crypto
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transactionsSection}>
        <View style={styles.transactionsHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Recent Transactions
          </Text>
          {/* @ts-ignore */}
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text
              style={[
                styles.viewAll,
                { color: BridgeFiColors.primary.main },
              ]}
            >
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {isLoadingTransactions ? (
          <Card style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <LoadingSpinner size="small" />
              <Text
                style={[
                  styles.transactionType,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Loading transactions...
              </Text>
            </View>
          </Card>
        ) : transactions.length === 0 ? (
          <Card style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text
                style={[
                  styles.transactionType,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                No transactions yet
              </Text>
            </View>
          </Card>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <Text
                    style={[
                      styles.transactionType,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    {tx.type === 'onramp' ? 'Buy' : 'Sell'} {tx.currency}
                  </Text>
                  <Text
                    style={[
                      styles.transactionDate,
                      { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                    ]}
                  >
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionAmountText,
                      {
                        color:
                          tx.type === 'onramp'
                            ? BridgeFiColors.success
                            : BridgeFiColors.text.primary,
                      },
                    ]}
                  >
                    {tx.type === 'onramp' ? '+' : '-'}{tx.amount.toFixed(2)}
                  </Text>
                  <Badge
                    label={tx.status}
                    variant={
                      tx.status === 'completed'
                        ? 'success'
                        : tx.status === 'pending' || tx.status === 'processing'
                        ? 'warning'
                        : 'error'
                    }
                    size="small"
                  />
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Deposit Options Modal */}
      <Modal
        visible={showDepositModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDepositModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: isDark ? BridgeFiColors.background.cardDark : BridgeFiColors.background.light },
          ]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Deposit Crypto
              </Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Text style={[styles.modalClose, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* Buy with Card/Bank Option */}
            <TouchableOpacity
              style={[
                styles.depositOption,
                {
                  backgroundColor: isDark 
                    ? 'rgba(139, 92, 246, 0.15)' 
                    : 'rgba(139, 92, 246, 0.1)',
                  borderColor: isDark 
                    ? 'rgba(139, 92, 246, 0.3)' 
                    : 'rgba(139, 92, 246, 0.2)',
                },
              ]}
              onPress={() => {
                setShowDepositModal(false);
                //@ts-ignore
                router.push('/onramp');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.depositOptionContent}>
                <Text style={styles.depositOptionIcon}>💳</Text>
                <View style={styles.depositOptionText}>
                  <Text
                    style={[
                      styles.depositOptionTitle,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    Buy with Card or Bank Transfer
                  </Text>
                  <Text
                    style={[
                      styles.depositOptionDescription,
                      { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                    ]}
                  >
                    Purchase USDC directly with your card or bank account
                  </Text>
                </View>
                <Text style={styles.depositOptionArrow}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Deposit by Address Option */}
            <TouchableOpacity
              style={[
                styles.depositOption,
                {
                  backgroundColor: isDark 
                    ? 'rgba(59, 130, 246, 0.15)' 
                    : 'rgba(59, 130, 246, 0.1)',
                  borderColor: isDark 
                    ? 'rgba(59, 130, 246, 0.3)' 
                    : 'rgba(59, 130, 246, 0.2)',
                },
              ]}
              onPress={() => {
                // Show address copy section
              }}
              activeOpacity={0.7}
            >
              <View style={styles.depositOptionContent}>
                <Text style={styles.depositOptionIcon}>📥</Text>
                <View style={styles.depositOptionText}>
                  <Text
                    style={[
                      styles.depositOptionTitle,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    Deposit Crypto by Address
                  </Text>
                  <Text
                    style={[
                      styles.depositOptionDescription,
                      { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                    ]}
                  >
                    Copy your wallet address to receive crypto
                  </Text>
                </View>
                <Text style={styles.depositOptionArrow}>→</Text>
              </View>
            </TouchableOpacity>

            {/* Deposit Address Section */}
            {address && (
              <Card style={styles.depositAddressCard}>
                <Text
                  style={[
                    styles.depositAddressTitle,
                    { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                  ]}
                >
                  Your Deposit Address
                </Text>
                <Text
                  style={[
                    styles.depositAddressWarning,
                    { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                  ]}
                >
                  Only send USDC on {network} network to this address
                </Text>
                <TouchableOpacity
                  style={[
                    styles.depositAddressContainer,
                    {
                      backgroundColor: isDark
                        ? BridgeFiColors.background.dark
                        : BridgeFiColors.gray[100],
                      borderColor: depositAddressCopied 
                        ? BridgeFiColors.success 
                        : BridgeFiColors.border.light,
                    },
                  ]}
                  onPress={handleCopyDepositAddress}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.depositAddressText,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {address}
                  </Text>
                  <Text
                    style={[
                      styles.depositCopyIcon,
                      { 
                        color: depositAddressCopied ? BridgeFiColors.success : BridgeFiColors.primary.main,
                        fontSize: 18,
                      },
                    ]}
                  >
                    {depositAddressCopied ? '✓' : '📋'}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.depositAddressNote,
                    { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                  ]}
                >
                  Tap to copy address
                </Text>
              </Card>
            )}
          </View>
        </View>
      </Modal>

      {/* Account Selector Modal */}
      <Modal
        visible={showAccountSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAccountSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: isDark ? BridgeFiColors.background.cardDark : BridgeFiColors.background.light },
          ]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Select Account
              </Text>
              <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
                <Text style={[styles.modalClose, { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {allWallets.map((wallet, index) => (
                <TouchableOpacity
                  key={wallet.id}
                  onPress={async () => {
                    try {
                      setSwitchingAccount(true);
                      await setCurrentAccountIndex(index);
                      setShowAccountSelector(false);
                      // Reload page
                      setTimeout(() => {
                        //@ts-ignore
                        router.replace('/dashboard');
                      }, 300);
                    } catch (error) {
                      console.error('Failed to switch account:', error);
                      Alert.alert('Error', 'Failed to switch account');
                    } finally {
                      setSwitchingAccount(false);
                    }
                  }}
                  style={[
                    styles.accountOption,
                    index === currentAccountIndex && {
                      backgroundColor: BridgeFiColors.primary.main + '20',
                      borderColor: BridgeFiColors.primary.main,
                    },
                  ]}
                >
                  <View style={styles.accountOptionInfo}>
                    <Text
                      style={[
                        styles.accountOptionName,
                        { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                      ]}
                    >
                      Account {wallet.accountIndex >= 0 ? wallet.accountIndex + 1 : 'Imported'}
                    </Text>
                    <Text
                      style={[
                        styles.accountOptionAddress,
                        { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {wallet.address}
                    </Text>
                  </View>
                  {switchingAccount && index === currentAccountIndex ? (
                    <LoadingSpinner size="small" />
                  ) : index === currentAccountIndex ? (
                    <Text style={[styles.accountOptionCheck, { color: BridgeFiColors.primary.main }]}>
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 16,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
    paddingBottom: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBackIcon: {
    fontSize: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    padding: 8,
  },
  profileIcon: {
    fontSize: 24,
  },
  kycBadge: {
    marginTop: 8,
  },
  networkBadgeContainer: {
    marginBottom: 16,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  networkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountSelectorCard: {
    marginBottom: 16,
  },
  accountSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  accountSelectorInfo: {
    flex: 1,
  },
  accountSelectorLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  accountSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountSelectorAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  accountSelectorArrow: {
    fontSize: 16,
    color: BridgeFiColors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    fontWeight: '300',
  },
  accountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BridgeFiColors.border.light,
    marginBottom: 12,
  },
  accountOptionInfo: {
    flex: 1,
  },
  accountOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountOptionAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  accountOptionCheck: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceCard: {
    marginBottom: 24,
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -1,
  },
  balanceUSD: {
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  addressContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copyIcon: {
    fontSize: 16,
  },
  depositCard: {
    marginBottom: 24,
    padding: 20,
    borderWidth: 1,
  },
  depositContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  depositIconContainer: {
    marginRight: 16,
  },
  depositIcon: {
    fontSize: 40,
  },
  depositTextContainer: {
    flex: 1,
  },
  depositTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  depositDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  depositAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BridgeFiColors.border.light,
    gap: 8,
  },
  depositAddressLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  depositCopyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: BridgeFiColors.primary.main,
  },
  depositCopyIcon: {
    color: BridgeFiColors.primary.contrast,
    fontSize: 12,
    fontWeight: '600',
  },
  depositBenefits: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BridgeFiColors.border.light,
  },
  benefitItem: {
    alignItems: 'center',
    flex: 1,
  },
  benefitIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  transactionsSection: {
    marginBottom: 24,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  depositOption: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  depositOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  depositOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  depositOptionText: {
    flex: 1,
  },
  depositOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  depositOptionDescription: {
    fontSize: 12,
  },
  depositOptionArrow: {
    fontSize: 20,
    color: BridgeFiColors.text.secondary,
  },
  depositAddressCard: {
    marginTop: 8,
  },
  depositAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  depositAddressWarning: {
    fontSize: 12,
    marginBottom: 12,
  },
  depositAddressText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  depositAddressNote: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  balanceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  assetBalancesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  assetCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  assetLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
    opacity: 0.8,
  },
  assetAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
});

