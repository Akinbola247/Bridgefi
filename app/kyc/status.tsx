/**
 * KYC Status Page
 */

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BridgeFiColors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type KYCStatus = 'processing' | 'approved' | 'rejected';

export default function KYCStatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<KYCStatus>('processing');
  const [currentStage, setCurrentStage] = useState(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stages = [
    'Document Review',
    'Identity Verification',
    'Compliance Check',
    'Final Approval',
  ];

  //@to-do: this Simulate status updates (this would come from API)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'processing') {
        if (currentStage < stages.length - 1) {
          setCurrentStage(currentStage + 1);
        } else {
          // Simulate approval after all stages
          setStatus('approved');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentStage, status]);

  const renderStatusContent = () => {
    switch (status) {
      case 'processing':
        return (
          <View>
            <View style={styles.statusIconContainer}>
              <LoadingSpinner size="large" />
            </View>
            <Text
              style={[
                styles.statusTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Verification in Progress
            </Text>
            <Text
              style={[
                styles.statusDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              We are reviewing your documents. This usually takes 2-4 hours.
            </Text>

            {/* Progress Stages */}
            <Card style={styles.stagesCard}>
              <Text
                style={[
                  styles.stagesTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Current Stage
              </Text>
              {stages.map((stage, index) => (
                <View key={index} style={styles.stageItem}>
                  <View
                    style={[
                      styles.stageIndicator,
                      {
                        backgroundColor:
                          index <= currentStage
                            ? BridgeFiColors.primary.main
                            : BridgeFiColors.gray[300],
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageText,
                      {
                        color:
                          index <= currentStage
                            ? isDark
                              ? BridgeFiColors.text.inverse
                              : BridgeFiColors.text.primary
                            : BridgeFiColors.text.secondary,
                        fontWeight: index === currentStage ? '600' : '400',
                      },
                    ]}
                  >
                    {stage}
                  </Text>
                </View>
              ))}
            </Card>

            <View style={styles.notificationBox}>
              <Text
                style={[
                  styles.notificationText,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                💬 We will notify you when your verification is complete!
              </Text>
            </View>
          </View>
        );
      case 'approved':
        return (
          <View>
            <View style={styles.statusIconContainer}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text
              style={[
                styles.statusTitle,
                { color: BridgeFiColors.success },
              ]}
            >
              Verification Approved!
            </Text>
            <Text
              style={[
                styles.statusDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              Your identity has been verified. You can now use all BridgeFi features.
            </Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Go to Dashboard"
                //@ts-ignore
                onPress={() => router.replace('/dashboard')}
                size="large"
                fullWidth
              />
            </View>
          </View>
        );
      case 'rejected':
        return (
          <View>
            <View style={styles.statusIconContainer}>
              <Text style={styles.errorIcon}>❌</Text>
            </View>
            <Text
              style={[
                styles.statusTitle,
                { color: BridgeFiColors.error },
              ]}
            >
              Verification Rejected
            </Text>
            <Text
              style={[
                styles.statusDescription,
                { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
              ]}
            >
              We could nt verify your identity. Please review the reasons below.
            </Text>
            <Card style={styles.rejectionCard}>
              <Text
                style={[
                  styles.rejectionTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Reasons:
              </Text>
              <Text
                style={[
                  styles.rejectionText,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                • Document image quality is too low{'\n'}
                • Information does not match provided details{'\n'}
                • Document is expired or invalid
              </Text>
            </Card>
            <View style={styles.buttonContainer}>
              <Button
                title="Try Again"
                //@ts-ignore
                onPress={() => router.push('/kyc/verify')}
                size="large"
                fullWidth
              />
            </View>
          </View>
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
      {renderStatusContent()}
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
    alignItems: 'center',
  },
  statusIconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successIcon: {
    fontSize: 64,
  },
  errorIcon: {
    fontSize: 64,
  },
  stagesCard: {
    width: '100%',
    marginBottom: 24,
  },
  stagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  stageText: {
    fontSize: 14,
  },
  notificationBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: BridgeFiColors.info + '10',
    width: '100%',
  },
  notificationText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 24,
  },
  rejectionCard: {
    width: '100%',
    marginBottom: 24,
  },
  rejectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  rejectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
});

