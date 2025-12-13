/**
 * KYC Verification Steps
 * Multi-step verification process with progress tracking
 */

import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BridgeFiColors } from '@/constants/colors';

type Step = 1 | 2 | 3;

export default function KYCVerifyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    country: '',
    documentType: '',
    documentNumber: '',
  });
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const progress = (currentStep / 3) * 100;

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      // Submit verification
      try {
        setIsLoading(true);
        // Simulate submission delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        //@ts-ignore
      router.push('/kyc/status');
      } catch (error) {
        console.error('Failed to submit verification:', error);
        Alert.alert('Error', 'Failed to submit verification. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <Text
              style={[
                styles.stepTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Personal Information
            </Text>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            />
            <Input
              label="Date of Birth"
              placeholder="DD/MM/YYYY"
              value={formData.dateOfBirth}
              onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
            />
            <Input
              label="Country"
              placeholder="Select your country"
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
            />
          </View>
        );
      case 2:
        return (
          <View>
            <Text
              style={[
                styles.stepTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Document Upload
            </Text>
            <Card style={styles.uploadCard}>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text
                style={[
                  styles.uploadTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Upload Government ID
              </Text>
              <Text
                style={[
                  styles.uploadDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Supported formats: JPG, PNG, PDF
              </Text>
              <Button
                title="Choose File"
                onPress={() => {
                  // File upload implementation
                  console.log('Upload file');
                }}
                variant="outline"
                style={styles.uploadButton}
              />
            </Card>
            <Input
              label="Document Type"
              placeholder="Passport, Driver's License, etc."
              value={formData.documentType}
              onChangeText={(text) => setFormData({ ...formData, documentType: text })}
            />
            <Input
              label="Document Number"
              placeholder="Enter document number"
              value={formData.documentNumber}
              onChangeText={(text) => setFormData({ ...formData, documentNumber: text })}
            />
          </View>
        );
      case 3:
        return (
          <View>
            <Text
              style={[
                styles.stepTitle,
                { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
              ]}
            >
              Selfie Verification
            </Text>
            <Card style={styles.selfieCard}>
              <Text style={styles.selfieIcon}>📸</Text>
              <Text
                style={[
                  styles.selfieTitle,
                  { color: isDark ? BridgeFiColors.text.inverse : BridgeFiColors.text.primary },
                ]}
              >
                Take a Live Photo
              </Text>
              <Text
                style={[
                  styles.selfieDescription,
                  { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
                ]}
              >
                Please ensure your face is clearly visible and well-lit
              </Text>
              <Button
                title="Open Camera"
                onPress={() => {
                  // Camera implementation
                  console.log('Open camera');
                }}
                variant="outline"
                style={styles.cameraButton}
              />
            </Card>
          </View>
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? BridgeFiColors.background.dark : BridgeFiColors.background.light },
      ]}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: BridgeFiColors.primary.main },
            ]}
          />
        </View>
        <Text
          style={[
            styles.progressText,
            { color: isDark ? BridgeFiColors.text.secondary : BridgeFiColors.text.secondary },
          ]}
        >
          Step {currentStep} of 3
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentStep > 1 && (
          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            style={styles.backButton}
          />
        )}
        <Button
          title={
            isLoading
              ? 'Submitting...'
              : currentStep === 3
              ? 'Submit'
              : 'Next'
          }
          onPress={handleNext}
          style={styles.nextButton}
          fullWidth={currentStep === 1}
          loading={isLoading && currentStep === 3}
          disabled={isLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: BridgeFiColors.gray[200],
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  uploadCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  uploadButton: {
    marginTop: 8,
  },
  selfieCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 20,
  },
  selfieIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  selfieTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  selfieDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraButton: {
    marginTop: 8,
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'transparent',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

