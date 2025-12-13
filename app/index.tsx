/**
 * Landing Page

 */

import { BridgeFiLogo } from '@/components/ui/BridgeFiLogo';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { hasWallet } from '@/utils/walletStorage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function LandingPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isAuthenticated, ready } = useAuth();
  const [checkingWallet, setCheckingWallet] = useState(true);

  useEffect(() => {
    checkWalletAndRedirect();
  }, [ready, isAuthenticated]);

  const checkWalletAndRedirect = async () => {
    if (!ready) return;
    
    try {
      const walletExists = await hasWallet();
      if (walletExists && isAuthenticated) {
        //@ts-ignore
        router.replace('/dashboard');
        return;
      } else if (walletExists && !isAuthenticated) {
        //@ts-ignore
        router.replace('/connect');
        return;
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    } finally {
      setCheckingWallet(false);
    }
  };

  const handleGetStarted = () => {
    //@ts-ignore
    router.push('/wallet-setup');
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
          Loading...
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
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <BridgeFiLogo size={80} variant="gradient" showText />
        </View>
       
        
      
        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            size="large"
            fullWidth
          />
        </View>
      </View>

     
      {/* Trust Indicators */}
      <View style={styles.trustSection}>
        <Text
          style={[
            styles.trustTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Built on Mantle Blockchain
        </Text>
        <Text
          style={[
            styles.trustSubtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Low fees • High throughput • EVM compatible
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 48,
    marginTop: 48,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  benefits: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  benefitItem: {
    alignItems: 'center',
    flex: 1,
  },
  benefitIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ctaContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  features: {
    marginBottom: 48,
    gap: 16,
  },
  featureCard: {
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  trustSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 48,
  },
  trustTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  trustSubtitle: {
    fontSize: 14,
    textAlign: 'center',
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

