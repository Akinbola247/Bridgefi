# BridgeFi Backend API

Backend service for handling on-ramp (NGN → USDC) and off-ramp (USDC → NGN) transactions.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## Environment Variables

All environment variables are documented in `.env.example`. Copy it to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your actual configuration
```

### Required Variables

**Server:**
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

**Mantle Network:**
- `MANTLE_RPC_URL` - Mantle network RPC endpoint
- `USDC_TOKEN_ADDRESS` - USDC token contract address

**Treasury Wallet:**
- `TREASURY_PRIVATE_KEY` - Private key of wallet holding USDC (⚠️ CRITICAL)
- `TREASURY_ADDRESS` - Treasury wallet address (optional, for reference)

**Paystack:**
- `PAYSTACK_SECRET_KEY` - Your Paystack secret key (REQUIRED)
- `PAYSTACK_PUBLIC_KEY` - Your Paystack public key (REQUIRED)
- `PAYSTACK_BASE_URL` - Paystack API base URL (optional)
- `MOCK_PAYSTACK_TRANSFERS` - Set to `true` to simulate transfers (for testing without Business account)

**Exchange Rates:**
- `EXCHANGE_RATE_MARGIN` - Margin percentage (default: 0.02 = 2%)
- `RATE_UPDATE_INTERVAL` - Update interval in ms (default: 30000)

**Webhooks:**
- `WEBHOOK_SECRET` - Secret for verifying Paystack webhooks

**Transaction Limits (Optional):**
- `MIN_ONRAMP_AMOUNT_NGN` - Minimum on-ramp amount
- `MAX_ONRAMP_AMOUNT_NGN` - Maximum on-ramp amount
- `MIN_OFFRAMP_AMOUNT_USDC` - Minimum off-ramp amount
- `MAX_OFFRAMP_AMOUNT_USDC` - Maximum off-ramp amount

See `.env.example` for detailed descriptions and examples.

## API Endpoints

### Exchange Rate
- `GET /api/exchange-rate` - Get current USDC/NGN exchange rate

### On-Ramp (NGN → USDC)
- `POST /api/onramp/initiate` - Initiate on-ramp transaction
- `POST /api/onramp/verify` - Verify payment and send USDC

### Off-Ramp (USDC → NGN)
- `POST /api/offramp/initiate` - Create off-ramp quote
- `POST /api/offramp/execute` - Execute off-ramp after USDC received

### Webhooks
- `POST /api/webhooks/paystack` - Paystack webhook handler

## Webhook Setup

See `WEBHOOK_SETUP.md` for detailed instructions on configuring Paystack webhooks.

**Quick setup:**
- `WEBHOOK_SECRET` can be the same as `PAYSTACK_SECRET_KEY` (recommended)
- Or leave it empty - the code will automatically use `PAYSTACK_SECRET_KEY`
- Configure webhook URL in Paystack dashboard: `https://your-backend.com/api/webhooks/paystack`

## Testing

For testing with test Naira:
- Use Paystack test mode (keys starting with `sk_test_`)
- Test bank code: `001` (unlimited resolves)
- Test account numbers: `0000000001`, `0000000002`, etc. (10-digit numbers starting with zeros)

### Mock Mode (For Testing Without Business Account)

If you get the error "You cannot initiate third party payouts as a starter business", enable mock mode:

```env
MOCK_PAYSTACK_TRANSFERS=true
```

This simulates transfers without requiring a Paystack Business/Enterprise account. See `PAYSTACK_ACCOUNT_LIMITATION.md` for details.

### Webhook Testing
- Use [ngrok](https://ngrok.com) to expose local server for webhook testing





