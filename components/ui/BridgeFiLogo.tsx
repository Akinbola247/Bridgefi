/**
 * BridgeFi Logo Component
 * Stylish "B" logo with gradient effects
 */

import { BridgeFiColors } from '@/constants/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface BridgeFiLogoProps {
  size?: number;
  variant?: 'gradient' | 'solid' | 'outline';
  showText?: boolean;
}

export function BridgeFiLogo({ 
  size = 48, 
  variant = 'gradient',
  showText = false 
}: BridgeFiLogoProps) {
  const logoSize = size;
  const fontSize = logoSize * 0.6;
  const borderWidth = logoSize * 0.08;

  const renderLogo = () => {
    switch (variant) {
      case 'gradient':
        return (
          <View
            style={[
              styles.logoContainer,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize * 0.25,
                backgroundColor: BridgeFiColors.gradient.purple,
                // Create gradient effect with multiple layers
              },
            ]}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: logoSize * 0.25,
                  backgroundColor: BridgeFiColors.gradient.indigo,
                  opacity: 0.7,
                },
              ]}
            />
            <Text
              style={[
                styles.logoText,
                {
                  fontSize,
                  color: '#FFFFFF',
                },
              ]}
            >
              B
            </Text>
          </View>
        );
      case 'solid':
        return (
          <View
            style={[
              styles.logoContainer,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize * 0.25,
                backgroundColor: BridgeFiColors.primary.main,
              },
            ]}
          >
            <Text
              style={[
                styles.logoText,
                {
                  fontSize,
                  color: BridgeFiColors.primary.contrast,
                },
              ]}
            >
              B
            </Text>
          </View>
        );
      case 'outline':
        return (
          <View
            style={[
              styles.logoContainer,
              {
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize * 0.25,
                borderWidth: borderWidth,
                borderColor: BridgeFiColors.primary.main,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.logoText,
                {
                  fontSize,
                  color: BridgeFiColors.primary.main,
                },
              ]}
            >
              B
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderLogo()}
      {showText && (
        <Text style={[styles.brandText, { fontSize: logoSize * 0.3 }]}>
          BridgeFi
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  brandText: {
    marginTop: 8,
    fontWeight: '700',
    color: BridgeFiColors.text.primary,
    letterSpacing: 1,
  },
});

