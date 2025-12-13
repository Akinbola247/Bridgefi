/**
 * Onramp Layout
 * Handles nested routing for onramp flow
 */

import { Stack } from 'expo-router';
import React from 'react';

export default function OnrampLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Buy Crypto' }} />
      <Stack.Screen name="payment" options={{ title: 'Payment Method' }} />
      <Stack.Screen name="processing" options={{ title: 'Processing' }} />
    </Stack>
  );
}

