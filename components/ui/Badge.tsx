/**
 * Badge Component
 */

import { BridgeFiColors } from '@/constants/colors';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'medium', style }: BadgeProps) {
  const badgeStyles = [
    styles.badge,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
  ];

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  variant_success: {
    backgroundColor: BridgeFiColors.success + '20',
  },
  variant_warning: {
    backgroundColor: BridgeFiColors.warning + '20',
  },
  variant_error: {
    backgroundColor: BridgeFiColors.error + '20',
  },
  variant_info: {
    backgroundColor: BridgeFiColors.info + '20',
  },
  variant_default: {
    backgroundColor: BridgeFiColors.gray[200],
  },
  size_small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  size_medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontWeight: '600',
  },
  text_success: {
    color: BridgeFiColors.success,
  },
  text_warning: {
    color: BridgeFiColors.warning,
  },
  text_error: {
    color: BridgeFiColors.error,
  },
  text_info: {
    color: BridgeFiColors.info,
  },
  text_default: {
    color: BridgeFiColors.gray[700],
  },
  textSize_small: {
    fontSize: 10,
  },
  textSize_medium: {
    fontSize: 12,
  },
});

