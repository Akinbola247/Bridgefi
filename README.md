# BridgeFi - Comprehensive Developer Guide

BridgeFi is a cross-platform mobile application built with Expo that enables seamless conversion between Nigerian Naira (NGN) and USDC on the Mantle blockchain network. The platform provides on-ramp (NGN → USDC) and off-ramp (USDC → NGN) services with Paystack integration.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Key Features & Processes](#key-features--processes)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Architecture Overview

BridgeFi consists of two main components:

1. **Frontend (Expo/React Native)**: Cross-platform mobile app built with Expo Router, TypeScript, and React Native
2. **Backend (Node.js/Express)**: RESTful API server handling blockchain transactions, Paystack integration, and exchange rate management

### Technology Stack

**Frontend:**
- Expo SDK ~54.0
- React Native 0.81.5
- TypeScript 5.9.2
- Expo Router (file-based routing)
- Ethers.js 5.7.2 (blockchain interactions)
- React Navigation
- AsyncStorage (wallet storage)

**Backend:**
- Node.js
- Express.js 4.18.2
- Ethers.js 5.7.2
- Axios 1.6.0
- Paystack API integration

**Blockchain:**
- Mantle Network (Sepolia testnet)
- USDC token (ERC-20)
- MNT (native token)

## Project Structure

```
Bridgefi/
├── app/                          # Expo Router pages (file-based routing)
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # Landing page
│   ├── (tabs)/                  # Tab navigation screens
│   ├── dashboard.tsx            # Main dashboard
│   ├── wallet-setup.tsx         # Wallet creation/import
│   ├── connect.tsx              # Wallet connection
│   ├── onramp/                  # On-ramp flow (NGN → USDC)
│   │   ├── index.tsx            # On-ramp entry
│   │   ├── payment.tsx          # Payment page
│   │   └── processing.tsx        # Payment processing
│   ├── spend/                   # Off-ramp flow (USDC → NGN)
│   │   ├── index.tsx            # Off-ramp entry
│   │   ├── bank-account.tsx     # Bank account input
│   │   ├── crypto-address.tsx   # Crypto address input
│   │   ├── confirm.tsx          # Transaction confirmation
│   │   └── processing.tsx        # Transaction processing
│   ├── transactions.tsx          # Transaction history
│   ├── profile.tsx              # User profile
│   └── kyc/                     # KYC flow
├── backend/                      # Backend API server
│   ├── server.js                # Express server entry point
│   ├── services/
│   │   ├── onramp.js            # On-ramp service logic
│   │   ├── offramp.js           # Off-ramp service logic
│   │   ├── paystack.js          # Paystack API integration
│   │   ├── exchangeRate.js     # Exchange rate fetching
│   │   └── transactionHistory.js # Transaction storage
│   └── package.json
├── components/                   # Reusable React components
│   ├── ui/                      # UI components (Button, Card, Input, etc.)
│   └── ...
├── utils/                        # Utility functions
│   ├── onrampOfframp.ts         # API client for on/off-ramp
│   ├── tokenTransfer.ts         # Blockchain transaction utilities
│   ├── walletUtils.ts           # Wallet management
│   ├── walletStorage.ts         # Wallet persistence
│   └── nigerianBanks.ts         # Nigerian bank list
├── hooks/                        # React hooks
│   ├── useAuth.ts               # Authentication hook
│   └── ...
├── constants/                    # App constants
│   ├── colors.ts                # Color palette
│   └── theme.ts                 # Theme configuration
├── app.config.js                # Expo configuration
├── package.json                 # Frontend dependencies
└── README.md                    # This file
```

## Prerequisites

Before setting up BridgeFi, ensure you have:

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or **yarn**)
- **Expo CLI** (install globally: `npm install -g expo-cli`)
- **Git**
- **Paystack Account** (test or live keys)
- **Mantle Network Wallet** with testnet MNT and USDC for testing
- **Code Editor** (VS Code recommended)

### Mobile Development

For mobile development, you'll also need:

- **iOS**: macOS with Xcode 14+ (for iOS Simulator)
- **Android**: Android Studio with Android SDK (for Android Emulator)
- Or use **Expo Go** app on a physical device

## Setup Instructions

### Frontend Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/Akinbola247/Bridgefi.git
   cd Bridgefi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   Create a `.env` file in the root directory:
   ```bash
   touch .env
   ```

4. **Configure environment variables** (see [Environment Variables](#environment-variables) section):
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
   EXPO_PUBLIC_TREASURY_ADDRESS=0x...
   ```

5. **Start the development server**:
   ```bash
   npm start
   # or
   npx expo start
   ```

6. **Run on your preferred platform**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app on your phone

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure environment variables** (see [Environment Variables](#environment-variables) section):
   ```env
   PORT=3000
   MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
   USDC_TOKEN_ADDRESS=0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F
   TREASURY_PRIVATE_KEY=0x...
   TREASURY_ADDRESS=0x...
   PAYSTACK_SECRET_KEY=sk_test_...
   PAYSTACK_PUBLIC_KEY=pk_test_...
   ```

5. **Start the backend server**:
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

6. **Verify server is running**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

## Environment Variables

### Frontend (.env)

Create a `.env` file in the root directory:

```env
# Backend API Configuration
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000

# Treasury Address (for off-ramp transactions)
EXPO_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryAddress

# Paystack Configuration (optional, mainly for reference)
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...

# Legacy Juicyway (optional, for backward compatibility)
EXPO_PUBLIC_JUICYWAY_API_KEY=...
EXPO_PUBLIC_JUICYWAY_BASE_URL=https://api-sandbox.spendjuice.com
```

**Note**: In Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

### Backend (.env)

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Mantle Network Configuration
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
USDC_TOKEN_ADDRESS=0x0D2aFc5b522aFFdd2E55a541acEc556611A0196F

# Treasury Wallet (CRITICAL - Keep secure!)
TREASURY_PRIVATE_KEY=0xYourPrivateKey
TREASURY_ADDRESS=0xYourTreasuryAddress

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_BASE_URL=https://api.paystack.co

# Mock Mode (for testing without Business account)
MOCK_PAYSTACK_TRANSFERS=false

# Exchange Rate Configuration
EXCHANGE_RATE_MARGIN=0.02
RATE_UPDATE_INTERVAL=30000

# Webhook Security
WEBHOOK_SECRET=your_webhook_secret

# Transaction Limits (Optional)
MIN_ONRAMP_AMOUNT_NGN=1000
MAX_ONRAMP_AMOUNT_NGN=1000000
MIN_OFFRAMP_AMOUNT_USDC=1
MAX_OFFRAMP_AMOUNT_USDC=1000
```

### Environment Variable Descriptions

#### Frontend Variables

- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL. Use `http://localhost:3000` for local development, or your deployed backend URL for production.
- `EXPO_PUBLIC_TREASURY_ADDRESS`: Treasury wallet address where USDC is sent during off-ramp transactions.
- `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY`: Paystack public key (optional, mainly for reference).

#### Backend Variables

**Server:**
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (`development` or `production`)

**Mantle Network:**
- `MANTLE_RPC_URL`: Mantle network RPC endpoint
- `USDC_TOKEN_ADDRESS`: USDC token contract address on Mantle

**Treasury Wallet:**
- `TREASURY_PRIVATE_KEY`: Private key of wallet holding USDC (⚠️ **CRITICAL - Keep secure!**)
- `TREASURY_ADDRESS`: Treasury wallet address (optional, for reference)

**Paystack:**
- `PAYSTACK_SECRET_KEY`: Paystack secret key (required)
- `PAYSTACK_PUBLIC_KEY`: Paystack public key (required)
- `PAYSTACK_BASE_URL`: Paystack API base URL (default: `https://api.paystack.co`)
- `MOCK_PAYSTACK_TRANSFERS`: Set to `true` to simulate transfers (for testing without Business account)

**Exchange Rates:**
- `EXCHANGE_RATE_MARGIN`: Margin percentage (default: 0.02 = 2%)
- `RATE_UPDATE_INTERVAL`: Update interval in milliseconds (default: 30000 = 30 seconds)

**Webhooks:**
- `WEBHOOK_SECRET`: Secret for verifying Paystack webhooks (can be same as `PAYSTACK_SECRET_KEY`)

**Transaction Limits:**
- `MIN_ONRAMP_AMOUNT_NGN`: Minimum on-ramp amount in NGN
- `MAX_ONRAMP_AMOUNT_NGN`: Maximum on-ramp amount in NGN
- `MIN_OFFRAMP_AMOUNT_USDC`: Minimum off-ramp amount in USDC
- `MAX_OFFRAMP_AMOUNT_USDC`: Maximum off-ramp amount in USDC

## Development Workflow

### Running the Application

1. **Start the backend server** (in `backend/` directory):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend** (in root directory):
   ```bash
   npm start
   ```

3. **Open the app**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go app

### Development Commands

**Frontend:**
```bash
npm start              # Start Expo development server
npm run android        # Start Android emulator
npm run ios            # Start iOS simulator
npm run web            # Start web browser
npm run lint           # Run ESLint
```

**Backend:**
```bash
npm start              # Start server (production mode)
npm run dev            # Start server with nodemon (development mode)
```

### Code Structure Guidelines

1. **File-based Routing**: Expo Router uses file-based routing. Files in `app/` directory automatically become routes.
   - `app/index.tsx` → `/`
   - `app/dashboard.tsx` → `/dashboard`
   - `app/onramp/index.tsx` → `/onramp`

2. **Component Organization**: 
   - Reusable UI components go in `components/ui/`
   - Page-specific components can be co-located with pages
   - Hooks go in `hooks/`

3. **TypeScript**: The project uses TypeScript. Always type your functions and components.

4. **Styling**: Use StyleSheet API for React Native styling. Colors are defined in `constants/colors.ts`.

## Key Features & Processes

### 1. Wallet Management

**Wallet Creation:**
- Users can create a new wallet with a 12-word mnemonic phrase
- Wallets are stored securely using AsyncStorage
- Support for multiple accounts derived from the same mnemonic

**Wallet Import:**
- Import existing wallet via private key
- Import existing wallet via mnemonic phrase

**Account Management:**
- Support for multiple accounts from the same mnemonic
- Account switching functionality
- BIP44 derivation path: `m/44'/60'/0'/0/accountIndex`

**Implementation Files:**
- `app/wallet-setup.tsx`: Wallet creation/import UI
- `utils/walletUtils.ts`: Wallet creation and management logic
- `utils/walletStorage.ts`: Wallet persistence layer

### 2. On-Ramp Process (NGN → USDC)

**Flow:**
1. User enters NGN amount
2. System fetches current exchange rate
3. System calculates USDC amount (with margin)
4. User is redirected to Paystack payment page
5. User completes payment
6. Backend verifies payment with Paystack
7. Backend sends USDC from treasury to user's wallet
8. Transaction is recorded

**Key Files:**
- `app/onramp/index.tsx`: On-ramp entry point
- `app/onramp/payment.tsx`: Paystack payment page
- `app/onramp/processing.tsx`: Payment verification and USDC transfer
- `backend/services/onramp.js`: Backend on-ramp logic
- `utils/onrampOfframp.ts`: Frontend API client

**API Endpoints:**
- `POST /api/onramp/initiate`: Create on-ramp quote
- `POST /api/onramp/verify`: Verify payment and send USDC

### 3. Off-Ramp Process (USDC → NGN)

**Flow:**
1. User enters USDC amount and bank details
2. System fetches current exchange rate
3. System calculates NGN amount (with margin)
4. User confirms transaction
5. User sends USDC to treasury wallet
6. System waits for blockchain confirmation
7. Backend creates Paystack transfer recipient
8. Backend initiates bank transfer via Paystack
9. Transaction is recorded

**Key Files:**
- `app/spend/index.tsx`: Off-ramp entry point
- `app/spend/bank-account.tsx`: Bank account input
- `app/spend/crypto-address.tsx`: Crypto address input (for direct transfers)
- `app/spend/confirm.tsx`: Transaction confirmation
- `app/spend/processing.tsx`: Transaction processing and bank transfer
- `backend/services/offramp.js`: Backend off-ramp logic

**API Endpoints:**
- `POST /api/offramp/initiate`: Create off-ramp quote
- `POST /api/offramp/execute`: Execute bank transfer after USDC received

### 4. Exchange Rate Management

**Rate Sources:**
- Binance API (primary)
- CoinGecko API (fallback)

**Rate Updates:**
- Rates are cached and updated every 30 seconds (configurable)
- Margin is applied to rates (default: 2%)

**Implementation:**
- `backend/services/exchangeRate.js`: Exchange rate fetching and caching
- `GET /api/exchange-rate`: Get current exchange rate

### 5. Transaction History

**Features:**
- View all transactions (on-ramp and off-ramp)
- Filter by type and status
- Transaction details (amount, status, timestamp, txHash)

**Implementation:**
- `app/transactions.tsx`: Transaction history UI
- `backend/services/transactionHistory.js`: Transaction storage and retrieval
- `GET /api/transactions`: Get user transactions

## API Documentation

### Base URL

- **Development**: `http://localhost:3000`
- **Production**: coming soon

### Authentication

Currently, the API uses wallet addresses for user identification. No authentication tokens are required.

### Endpoints

#### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Exchange Rate

```http
GET /api/exchange-rate
```

**Response:**
```json
{
  "success": true,
  "data": {
    "usdcToNgn": 1500.00,
    "ngnToUsdc": 0.000667,
    "timestamp": 1704067200000,
    "source": "Binance"
  }
}
```

#### Treasury Address

```http
GET /api/treasury-address
```

**Response:**
```json
{
  "success": true,
  "data": {
    "treasuryAddress": "0x..."
  }
}
```

#### On-Ramp Initiate

```http
POST /api/onramp/initiate
Content-Type: application/json

{
  "ngnAmount": 10000,
  "userAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quoteId": "ONRAMP_1234567890_abc123",
    "ngnAmount": 10000,
    "usdcAmount": 6.67,
    "exchangeRate": 0.000667,
    "paymentLink": "https://paystack.com/pay/...",
    "reference": "ONRAMP_1234567890_abc123",
    "expiresAt": 1704068100000
  }
}
```

#### On-Ramp Verify

```http
POST /api/onramp/verify
Content-Type: application/json

{
  "reference": "ONRAMP_1234567890_abc123",
  "quoteData": {
    "ngnAmount": 10000,
    "userAddress": "0x..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "txHash": "0x...",
    "usdcAmount": 6.67
  }
}
```

#### Off-Ramp Initiate

```http
POST /api/offramp/initiate
Content-Type: application/json

{
  "usdcAmount": 10,
  "bankAccount": "0123456789",
  "bankCode": "058",
  "accountName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quoteId": "OFFRAMP_1234567890_xyz789",
    "usdcAmount": 10,
    "ngnAmount": 15000,
    "exchangeRate": 1500,
    "bankAccount": "0123456789",
    "accountName": "John Doe",
    "expiresAt": 1704068100000
  }
}
```

#### Off-Ramp Execute

```http
POST /api/offramp/execute
Content-Type: application/json

{
  "quoteId": "OFFRAMP_1234567890_xyz789",
  "txHash": "0x...",
  "quoteData": {
    "usdcAmount": 10,
    "bankAccount": "0123456789",
    "bankCode": "058",
    "accountName": "John Doe",
    "userAddress": "0x..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "transferReference": "TRF_...",
    "ngnAmount": 15000,
    "status": "pending"
  }
}
```

#### Get Transactions

```http
GET /api/transactions?userAddress=0x...&type=onramp&status=completed&limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_123",
        "type": "onramp",
        "amount": 6.67,
        "currency": "USDC",
        "status": "completed",
        "timestamp": 1704067200000,
        "txHash": "0x...",
        "reference": "ONRAMP_...",
        "metadata": {
          "ngnAmount": 10000,
          "exchangeRate": 0.000667
        }
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

#### Paystack Webhook

```http
POST /api/webhooks/paystack
X-Paystack-Signature: <signature>

{
  "event": "charge.success",
  "data": {
    "reference": "ONRAMP_...",
    ...
  }
}
```

**Response:**
```json
{
  "success": true
}
```

## Testing

### Backend Testing

1. **Test Exchange Rate Endpoint**:
   ```bash
   curl http://localhost:3000/api/exchange-rate
   ```

2. **Test On-Ramp Initiate**:
   ```bash
   curl -X POST http://localhost:3000/api/onramp/initiate \
     -H "Content-Type: application/json" \
     -d '{"ngnAmount": 10000, "userAddress": "0x..."}'
   ```

3. **Test Off-Ramp Initiate**:
   ```bash
   curl -X POST http://localhost:3000/api/offramp/initiate \
     -H "Content-Type: application/json" \
     -d '{"usdcAmount": 10, "bankAccount": "0123456789", "bankCode": "058", "accountName": "Test User"}'
   ```

### Paystack Testing

**Test Mode:**
- Use Paystack test keys (starting with `sk_test_` and `pk_test_`)
- Test bank code: `001` (unlimited resolves)
- Test account numbers: `0000000001`, `0000000002`, etc. (10-digit numbers starting with zeros)

**Mock Mode:**
If you get the error "You cannot initiate third party payouts as a starter business", enable mock mode:

```env
MOCK_PAYSTACK_TRANSFERS=true
```

This simulates transfers without requiring a Paystack Business/Enterprise account.

### Webhook Testing

1. **Use ngrok to expose local server**:
   ```bash
   ngrok http 3000
   ```

2. **Configure webhook URL in Paystack dashboard**:
   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/paystack
   ```

3. **Test webhook**:
   - Make a test payment
   - Check backend logs for webhook events

### Frontend Testing

1. **Test Wallet Creation**:
   - Navigate to wallet setup
   - Create a new wallet
   - Save the mnemonic phrase
   - Verify wallet is created

2. **Test On-Ramp Flow**:
   - Navigate to on-ramp
   - Enter NGN amount
   - Complete Paystack payment
   - Verify USDC is received

3. **Test Off-Ramp Flow**:
   - Navigate to spend
   - Enter USDC amount and bank details
   - Confirm and send USDC
   - Verify bank transfer is initiated

## Deployment

### Backend Deployment

1. **Choose a hosting platform** (Heroku, Railway, AWS, etc.)

2. **Set environment variables** on your hosting platform

3. **Deploy**:
   ```bash
   # Example for Heroku
   heroku create bridgefi-backend
   git push heroku main
   ```

4. **Update frontend API URL**:
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.com
   ```

### Frontend Deployment

1. **Build for production**:
   ```bash
   # For iOS
   eas build --platform ios

   # For Android
   eas build --platform android

   # For web
   npx expo export:web
   ```

2. **Submit to app stores**:
   ```bash
   # iOS
   eas submit --platform ios

   # Android
   eas submit --platform android
   ```

3. **Deploy web version**:
   - Deploy the `web-build/` directory to your hosting platform
   - Or use Expo hosting

### Environment Configuration

**Production Environment Variables:**

Backend:
```env
NODE_ENV=production
PORT=3000
MANTLE_RPC_URL=https://rpc.mantle.xyz
USDC_TOKEN_ADDRESS=0x...
TREASURY_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
MOCK_PAYSTACK_TRANSFERS=false
```

Frontend:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.com
EXPO_PUBLIC_TREASURY_ADDRESS=0x...
```

## Troubleshooting

### Common Issues

#### 1. Backend Server Not Starting

**Issue**: Server fails to start or crashes immediately.

**Solutions:**
- Check if port 3000 is already in use: `lsof -i :3000`
- Verify all required environment variables are set
- Check `TREASURY_PRIVATE_KEY` is valid
- Ensure `MANTLE_RPC_URL` is correct

#### 2. Frontend Can't Connect to Backend

**Issue**: API calls fail with connection errors.

**Solutions:**
- Verify `EXPO_PUBLIC_API_BASE_URL` is correct
- For iOS simulator, use `http://localhost:3000`
- For Android emulator, use `http://10.0.2.2:3000`
- For physical device, use your computer's local IP: `http://192.168.x.x:3000`
- Check backend server is running
- Check firewall settings

#### 3. Paystack Payment Fails

**Issue**: Payment initialization or verification fails.

**Solutions:**
- Verify `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` are correct
- Check you're using test keys for test mode
- Verify account has sufficient balance (for transfers)
- Check Paystack dashboard for error logs

#### 4. USDC Transfer Fails

**Issue**: USDC transfer from treasury fails.

**Solutions:**
- Verify `TREASURY_PRIVATE_KEY` is correct
- Check treasury wallet has sufficient USDC balance
- Verify `USDC_TOKEN_ADDRESS` is correct
- Check `MANTLE_RPC_URL` is accessible
- Verify transaction gas estimation

#### 5. Exchange Rate Not Updating

**Issue**: Exchange rate is stale or not updating.

**Solutions:**
- Check `RATE_UPDATE_INTERVAL` is set correctly
- Verify rate source APIs are accessible
- Check backend logs for rate fetch errors
- Restart backend server

#### 6. Wallet Not Persisting

**Issue**: Wallet is lost after app restart.

**Solutions:**
- Check AsyncStorage permissions
- Verify wallet storage implementation
- Check for storage quota issues
- Verify `walletStorage.ts` is working correctly

#### 7. Transaction Not Confirming

**Issue**: Blockchain transaction stays pending.

**Solutions:**
- Check network connectivity
- Verify RPC endpoint is working
- Check transaction on Mantle explorer
- Increase confirmation wait time
- Verify transaction was actually sent

### Debugging Tips

1. **Enable Debug Logging**:
   - Check browser console (web)
   - Check Metro bundler logs (mobile)
   - Check backend server logs

2. **Use Blockchain Explorer**:
   - Mantle Sepolia: https://explorer.sepolia.mantle.xyz
   - Check transaction status and details

3. **Test API Endpoints**:
   - Use Postman or curl to test backend endpoints
   - Verify request/response formats

4. **Check Environment Variables**:
   - Verify all required variables are set
   - Check variable names are correct (case-sensitive)
   - Ensure no extra spaces or quotes





