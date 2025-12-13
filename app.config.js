/**
 * Expo App Configuration
 * Reads environment variables from .env file
 */

require('dotenv').config();

module.exports = {
  expo: {
    name: 'Bridgefi',
    slug: 'Bridgefi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'bridgefi',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      // Paystack API Configuration
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY || '',
      // Backend API Configuration
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000',
      treasuryAddress: process.env.EXPO_PUBLIC_TREASURY_ADDRESS || '',
      // Legacy Juicyway (kept for backward compatibility)
      juicywayApiKey: process.env.JUICYWAY_API_KEY || process.env.EXPO_PUBLIC_JUICYWAY_API_KEY || '',
      juicywayBaseUrl: process.env.JUICYWAY_BASE_URL || process.env.EXPO_PUBLIC_JUICYWAY_BASE_URL || 'https://api-sandbox.spendjuice.com',
    },
  },
};

