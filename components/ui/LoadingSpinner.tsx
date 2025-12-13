/**
 * Loading Spinner Component

 */

import { BridgeFiColors } from '@/constants/colors';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'large', color, fullScreen = false }: LoadingSpinnerProps) {
  const spinnerColor = color || BridgeFiColors.primary.main;

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={spinnerColor} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={spinnerColor} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

