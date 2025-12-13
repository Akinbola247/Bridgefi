/**
 * Wallet Connection Page

 */

import { BackButton } from '@/components/ui/BackButton';
import { BridgeFiLogo } from '@/components/ui/BridgeFiLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { hasWallet } from '@/utils/walletStorage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ConnectPage() {
  const { connectWallet, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    checkWalletExists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkWalletExists = async () => {
    try {
      const walletExists = await hasWallet();
      if (!walletExists) {
        // Redirect to wallet setup if no wallet exists
        //@ts-ignore
        router.replace('/wallet-setup');
        return;
      }
      
      // If wallet exists and user is authenticated, redirect to dashboard
      if (isAuthenticated) {
        //@ts-ignore
        router.replace('/dashboard');
        return;
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    } finally {
      setCheckingWallet(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connectWallet();
      // Navigate to dashboard after successful connection
      //@ts-ignore
      router.replace('/dashboard');
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert(
        'Connection Failed',
        'Unable to connect wallet. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  if (checkingWallet) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
        styles.loadingContainer,
      ]}>
        <LoadingSpinner size="large" />
        <Text
          style={[
            styles.loadingText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Checking wallet...
        </Text>
      </View>
    );
  }
  
  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      <BackButton style={styles.backButtonTop} />
      <View style={styles.logoContainer}>
        <BridgeFiLogo size={64} variant="gradient" />
      </View>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Connect Your Wallet
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Connect your wallet to start using BridgeFi
        </Text>
      </View>

      {/* Educational Information */}
      <Card style={styles.infoCard}>
        <Text
          style={[
            styles.infoTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Why connect a wallet?
        </Text>
        <Text
          style={[
            styles.infoText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          • Receive USDC tokens directly to your wallet{'\n'}
          • Send crypto to bank accounts or wallet addresses{'\n'}
          • Track your on-chain transaction history{'\n'}
          • Maintain full control of your funds
        </Text>
      </Card>

      {/* Network Information */}
      <Card style={styles.networkCard}>
        <View style={styles.networkHeader}>
          <Text
            style={[
              styles.networkTitle,
              { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
            ]}
          >
            Network: Mantle
          </Text>
          <View
            style={[
              styles.networkStatus,
              { backgroundColor: BridgeFiColors.success + '20' },
            ]}
          >
            <View
              style={[
                styles.networkDot,
                { backgroundColor: BridgeFiColors.success },
              ]}
            />
            <Text
              style={[styles.networkStatusText, { color: BridgeFiColors.success }]}
            >
              Supported
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.networkDescription,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          BridgeFi operates on Mantle blockchain for low fees and fast transactions.
          All transactions are processed on the Mantle network.
        </Text>
      </Card>

      {/* Connection Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isConnecting ? 'Connecting...' : 'Connect Wallet'}
          onPress={handleConnect}
          size="large"
          fullWidth
          loading={isConnecting}
          disabled={isConnecting}
        />
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Text
          style={[
            styles.securityText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          🔒 Your wallet connection is secure and private. We never access your private keys.
        </Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  infoCard: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  networkCard: {
    marginBottom: 32,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  networkDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  securityNote: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  backButtonTop: {
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

