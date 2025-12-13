/**
 * Metro Configuration for Expo
 * Configured for MetaMask SDK compatibility
 * Reference: https://docs.metamask.io/sdk/connect/react-native
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Get node-libs-expo polyfills
const nodeLibs = require("node-libs-expo");

// Add node-libs-expo for Node.js polyfills
config.resolver.extraNodeModules = {
  ...nodeLibs,
  // Ensure crypto is properly mapped
  crypto: nodeLibs.crypto || require.resolve('crypto-browserify'),
};

// Custom resolver to handle node: protocol imports (e.g., node:crypto)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle node: protocol imports (Node.js built-in modules)
  if (moduleName.startsWith('node:')) {
    const module = moduleName.replace('node:', '');
    
    // Map node:crypto to the crypto polyfill
    if (module === 'crypto') {
      const cryptoPath = nodeLibs.crypto || require.resolve('crypto-browserify');
      return {
        filePath: cryptoPath,
        type: 'sourceFile',
      };
    }
    
    // For other node: imports, try to resolve from node-libs-expo
    if (nodeLibs[module]) {
      return {
        filePath: nodeLibs[module],
        type: 'sourceFile',
      };
    }
    
    // If not found in node-libs-expo, try to resolve normally
    // This will fall through to default resolution
  }
  
  // Use default resolution for other modules
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Add support for .cjs files (used by some dependencies)
const defaultSourceExts = config.resolver.sourceExts;
config.resolver.sourceExts = [...defaultSourceExts, 'cjs'];

// Transformer configuration
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;




