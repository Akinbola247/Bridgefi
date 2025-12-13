/**
 * KYC Layout
 * Handles nested routing for KYC flow
 */

import { Stack } from 'expo-router';

export default function KYCLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'KYC Verification' }} />
      <Stack.Screen name="verify" options={{ title: 'Verify Identity' }} />
      <Stack.Screen name="status" options={{ title: 'Verification Status' }} />
    </Stack>
  );
}

