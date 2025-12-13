/**
 * Spend Crypto Layout
 * Handles nested routing for spend crypto flow
 */

import { Stack } from 'expo-router';

export default function SpendLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="crypto-address" options={{ headerShown: false }} />
      <Stack.Screen name="bank-account" options={{ headerShown: false }} />
      <Stack.Screen name="bank" options={{ headerShown: false }} />
      <Stack.Screen name="confirm" options={{ headerShown: false }} />
      <Stack.Screen name="processing" options={{ headerShown: false }} />
    </Stack>
  );
}

