/**
 * Spend Crypto Main Page
 * User selects how they want to spend crypto
 */

import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SpendPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const spendOptions = [
    {
      id: 'crypto-address',
      title: 'Send to Crypto Address',
      description: 'Send crypto to any wallet address on Mantle network',
      icon: '🔗',
      route: '/spend/crypto-address',
      color: 'rgba(99, 102, 241, 0.15)',
    },
    {
      id: 'bank-account',
      title: 'Send to Bank Account Number',
      description: 'Send to a Nigerian bank account using account number',
      icon: '🏦',
      route: '/spend/bank-account',
      color: 'rgba(139, 92, 246, 0.15)',
    },
  ];

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
          Spend Crypto
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Choose how you want to send your crypto
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {spendOptions.map((option) => (
          <Card key={option.id} style={styles.optionCard}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                {
                  backgroundColor: isDark 
                    ? option.color.replace('0.15', '0.1')
                    : option.color.replace('0.15', '0.08'),
                },
              ]}
              onPress={() => {
                //@ts-ignore
                router.push(option.route);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <Text style={styles.optionArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </Card>
        ))}
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
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    marginBottom: 0,
  },
  optionButton: {
    padding: 20,
    borderRadius: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionArrow: {
    fontSize: 20,
    color: BridgeFiColors.text.secondary,
    marginLeft: 8,
  },
});

