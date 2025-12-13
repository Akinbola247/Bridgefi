/**
 * KYC Introduction Page
 */

import { Button } from '@/components/ui/Button';
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
    View,
} from 'react-native';

export default function KYCIntroPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Identity Verification
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Required for secure and compliant transactions
        </Text>
      </View>

      {/* Security Badge */}
      <View style={styles.badgeContainer}>
        <View
          style={[
            styles.badge,
            { backgroundColor: BridgeFiColors.success + '20' },
          ]}
        >
          <Text style={styles.badgeIcon}>🔒</Text>
          <Text
            style={[styles.badgeText, { color: BridgeFiColors.success }]}
          >
            Secure & Private
          </Text>
        </View>
      </View>

      {/* Requirements Card */}
      <Card style={styles.requirementsCard}>
        <Text
          style={[
            styles.cardTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          What you will need:
        </Text>
        
        <View style={styles.requirementItem}>
          <Text style={styles.requirementIcon}>📄</Text>
          <View style={styles.requirementContent}>
            <Text
              style={[
                styles.requirementTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Government ID
            </Text>
            <Text
              style={[
                styles.requirementDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Passport, Driver License, or National ID
            </Text>
          </View>
        </View>

        <View style={styles.requirementItem}>
          <Text style={styles.requirementIcon}>📸</Text>
          <View style={styles.requirementContent}>
            <Text
              style={[
                styles.requirementTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Selfie Verification
            </Text>
            <Text
              style={[
                styles.requirementDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Live photo for identity confirmation
            </Text>
          </View>
        </View>

        <View style={styles.requirementItem}>
          <Text style={styles.requirementIcon}>⏱️</Text>
          <View style={styles.requirementContent}>
            <Text
              style={[
                styles.requirementTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              5-10 minutes
            </Text>
            <Text
              style={[
                styles.requirementDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Quick and straightforward process
            </Text>
          </View>
        </View>
      </Card>

      {/* Privacy Reassurance */}
      <Card style={styles.privacyCard}>
        <Text
          style={[
            styles.privacyTitle,
            { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
          ]}
        >
          Your Privacy Matters
        </Text>
        <Text
          style={[
            styles.privacyText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          All information is encrypted and stored securely. We comply with international
          KYC/AML regulations to ensure safe transactions for everyone.
        </Text>
      </Card>

      {/* CTA */}
      <View style={styles.buttonContainer}>
        <Button
          title="Start Verification"
          //@ts-ignore
          onPress={() => router.push('/kyc/verify')}
          size="large"
          fullWidth
        />
      </View>

      {/* Estimated Time */}
      <View style={styles.timeEstimate}>
        <Text
          style={[
            styles.timeText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Estimated time: 8 minutes
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
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  badgeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  requirementsCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  requirementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  requirementContent: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  requirementDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  privacyCard: {
    marginBottom: 32,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  timeEstimate: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
  },
});

