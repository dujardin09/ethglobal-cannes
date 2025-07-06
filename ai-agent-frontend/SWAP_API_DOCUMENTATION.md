# KittyPunch Swap API Documentation

## Overview
The KittyPunch Swap API provides a comprehensive set of endpoints for AI agents to perform token swaps on the Flow blockchain. The API now uses **real Flow blockchain integration** with actual Cadence scripts for token balance queries and swap execution.

**Base URL**: `http://localhost:3000/api`

## Flow Blockchain Integration

### Real Features
- ✅ **FLOW Token Balance Queries**: Uses real Cadence scripts to query FLOW token balances from the blockchain
- ✅ **Multi-Token Balance Optimization**: Efficient batch queries for multiple token balances
- ✅ **Network-Aware Contract Management**: Supports emulator, testnet, and mainnet with proper contract addresses
- ✅ **Storage and Fee Estimation**: Real storage usage queries for accurate fee calculations
- ✅ **Transaction Submission**: Real Flow transaction execution with proper error handling

### Mock Features (Ready for Real Integration)
- 🔧 **Non-FLOW Token Balances**: Currently mocked for FUSD, USDC, USDT (ready for real contract integration)
- 🔧 **DEX Integration**: Mock swap quotes and execution (ready for Increment, BloctoSwap, or other DEX integration)

## Available Endpoints

### 1. Get Available Tokens
**GET** `/tokens`

Returns all tokens available for trading.

```bash
curl http://localhost:3000/api/tokens
```

**Response:**
```json
{
  "tokens": [
    {
      "address": "0x0ae53cb6e3f42a79",
      "symbol": "FLOW",
      "name": "Flow Token",
      "decimals": 8
    },
    {
      "address": "0xe223d8a629e49c68",
      "symbol": "USDC",
      "name": "USD Coin",
      "decimals": 6
    }
  ]
}
```

### 2. Get Token Balances
**GET** `/tokens/balances?userAddress={address}`

Returns token balances for a specific user address using **real Flow blockchain queries**.

**Flow Integration Details:**
- Uses optimized multi-token Cadence script for efficient balance retrieval
- Falls back to individual queries if batch query fails
- FLOW token balances are queried from real blockchain contracts
- FUSD, USDC, USDT balances currently mocked (ready for real contract integration)

```bash
curl "http://localhost:3000/api/tokens/balances?userAddress=0x1234567890123456"
```

**Response:**
```json
{
  "balances": {
    "0x0ae53cb6e3f42a79": "1000.00000000",
    "0xf233dcee88fe0abe": "100.00000000",
    "0x0000000000000001": "500.000000",
    "0x0000000000000002": "250.000000"
  },
  "source": "blockchain", // "blockchain" or "mock" to indicate data source
  "network": "testnet"   // "emulator", "testnet", or "mainnet"
}
```

### 3. Get Swap Quote
**POST** `/swap/quote`

Generate a quote for a token swap.

```bash
curl -X POST http://localhost:3000/api/swap/quote \
  -H "Content-Type: application/json" \
  -d '{
    "tokenInAddress": "0x0ae53cb6e3f42a79",
    "tokenOutAddress": "0xe223d8a629e49c68",
    "amountIn": "10.0"
  }'
```

**Request Body:**
```json
{
  "tokenInAddress": "string",
  "tokenOutAddress": "string",
  "amountIn": "string"
}
```

**Response:**
```json
{
  "quote": {
    "id": "quote_1234567890_abc123",
    "tokenIn": {
      "address": "0x0ae53cb6e3f42a79",
      "symbol": "FLOW",
      "name": "Flow Token",
      "decimals": 8
    },
    "tokenOut": {
      "address": "0xe223d8a629e49c68",
      "symbol": "USDC",
      "name": "USD Coin",
      "decimals": 6
    },
    "amountIn": "10.0",
    "amountOut": "49.85",
    "priceImpact": 0.1,
    "fee": "0.03",
    "estimatedGas": "0.001",
    "route": ["0x1000000000000001"],
    "validUntil": 1751727583391
  }
}
```

### 4. Execute Swap
**POST** `/swap/execute`

Execute a swap using a valid quote.

```bash
curl -X POST http://localhost:3000/api/swap/execute \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "quote_1234567890_abc123",
    "userAddress": "0x1234567890123456",
    "slippageTolerance": 0.5
  }'
```

**Request Body:**
```json
{
  "quoteId": "string",
  "userAddress": "string",
  "slippageTolerance": "number" // Optional, defaults to 0.5%
}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx_1234567890_def456",
    "hash": "0xcb2bfea401a47",
    "status": "confirmed",
    "timestamp": 1751727583414,
    "quote": { /* quote object */ }
  }
}
```

### 5. Refresh Quote
**POST** `/swap/quote/refresh`

Refresh an existing quote to extend its validity.

```bash
curl -X POST http://localhost:3000/api/swap/quote/refresh \
  -H "Content-Type: application/json" \
  -d '{"quoteId": "quote_1234567890_abc123"}'
```

### 6. Get Transaction Status
**GET** `/swap/transaction/{transactionId}`

Get the status of a swap transaction.

```bash
curl http://localhost:3000/api/swap/transaction/tx_1234567890_def456
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- **400 Bad Request**: Invalid parameters
- **404 Not Found**: Resource not found (quote, transaction, etc.)
- **500 Internal Server Error**: Server error

**Error Response Format:**
```json
{
  "error": "Error message describing what went wrong"
}
```

## Agent Integration Examples

### Simple Swap Flow
```javascript
// 1. Get available tokens
const tokensResponse = await fetch('/api/tokens');
const { tokens } = await tokensResponse.json();

// 2. Get user balances
const balancesResponse = await fetch(`/api/tokens/balances?userAddress=${userAddress}`);
const { balances } = await balancesResponse.json();

// 3. Get swap quote
const quoteResponse = await fetch('/api/swap/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenInAddress: tokens[0].address,
    tokenOutAddress: tokens[1].address,
    amountIn: '10.0'
  })
});
const { quote } = await quoteResponse.json();

// 4. Execute swap
const executeResponse = await fetch('/api/swap/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteId: quote.id,
    userAddress: userAddress,
    slippageTolerance: 0.5
  })
});
const { transaction } = await executeResponse.json();
```

### Quote Management
```javascript
// Check if quote is expired
const isExpired = Date.now() > quote.validUntil;

if (isExpired) {
  // Refresh the quote
  const refreshResponse = await fetch('/api/swap/quote/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteId: quote.id })
  });
  const { quote: refreshedQuote } = await refreshResponse.json();
}
```

## Important Notes

1. **Quote Expiration**: Quotes are valid for 2 minutes (120 seconds) by default
2. **Mock Implementation**: Current implementation uses mock data for development
3. **Real Integration**: In production, replace with actual Flow blockchain calls
4. **Error Handling**: Always check response status and handle errors appropriately
5. **Rate Limiting**: Consider implementing rate limiting for production use

## Testing

Use the included test script to validate all endpoints:

```bash
node test-swap-api.js
```

This will test all endpoints and provide a comprehensive report of the API functionality.
