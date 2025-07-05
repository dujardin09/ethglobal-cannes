# KittyPunch Swap Integration Guide

This document explains how to integrate the KittyPunch swap functionality into the AI agent.

## Overview

The swap functionality is implemented as:
1. **Backend Service** (`src/services/swap.ts`) - Core swap logic and blockchain interaction
2. **API Routes** (`src/app/api/swap/*`) - REST endpoints for the agent to call
3. **API Client** (`src/lib/swap-api.ts`) - Convenient wrapper for API calls
4. **React Context** (`src/contexts/SwapContext.tsx`) - State management for UI
5. **UI Components** (`src/components/SwapInterface.tsx`) - User interface

## API Endpoints

### Get Available Tokens
```
GET /api/tokens
Response: { tokens: Token[] }
```

### Get Token Balances
```
GET /api/tokens/balances?userAddress={address}
Response: { balances: Record<string, string> }
```

### Get Swap Quote
```
POST /api/swap/quote
Body: {
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: string
}
Response: { quote: SwapQuote }
```

### Execute Swap
```
POST /api/swap/execute
Body: {
  quoteId: string,
  userAddress: string,
  slippageTolerance?: number
}
Response: { transaction: SwapTransaction }
```

### Get Transaction Status
```
GET /api/swap/transaction/{transactionId}
Response: { transaction: SwapTransaction }
```

## Agent Integration Examples

### 1. Simple Swap
```typescript
import { SwapAPIClient } from '@/lib/swap-api';

// Perform a complete swap
const transaction = await SwapAPIClient.performSwap(
  'A.1654653399040a61.FlowToken', // FLOW token
  'A.b19436aae4d94622.FiatToken',  // USDC token
  '10.0',                          // Amount in FLOW
  '0x1234567890123456',            // User address
  0.5                              // 0.5% slippage tolerance
);

console.log('Swap completed:', transaction);
```

### 2. Get Quote First, Execute Later
```typescript
// Get a quote
const quote = await SwapAPIClient.getSwapQuote(
  'A.1654653399040a61.FlowToken',
  'A.b19436aae4d94622.FiatToken',
  '10.0'
);

// Show quote to user or validate
console.log(`You will receive approximately ${quote.amountOut} USDC`);
console.log(`Price impact: ${quote.priceImpact}%`);

// Execute if acceptable
if (quote.priceImpact < 2.0) {
  const transaction = await SwapAPIClient.executeSwap(
    quote.id,
    userAddress,
    0.5
  );
}
```

### 3. Check User Balances
```typescript
const balances = await SwapAPIClient.getTokenBalances(userAddress);

console.log('User balances:');
for (const [tokenAddress, balance] of Object.entries(balances)) {
  console.log(`${tokenAddress}: ${balance}`);
}
```

### 4. Find Best Route
```typescript
const route = await SwapAPIClient.getBestSwapRoute(
  tokenInAddress,
  tokenOutAddress,
  amountIn
);

console.log('Best route found:');
console.log(`Price impact: ${route.priceImpact}%`);
console.log(`Estimated output: ${route.estimatedOutput}`);
console.log(`Route: ${route.route.join(' -> ')}`);
```

## Available Tokens

Currently supported tokens on Flow (emulator):
- **FLOW** - Native Flow token (`A.1654653399040a61.FlowToken`)
- **USDC** - USD Coin (`A.b19436aae4d94622.FiatToken`)
- **USDT** - Tether USD (`A.cf0e2f2f682f7e4e.TeleportedTetherToken`)
- **FUSD** - Flow USD (`A.3c5959b568896393.FUSD`)

## Error Handling

All API methods throw errors that should be caught:

```typescript
try {
  const quote = await SwapAPIClient.getSwapQuote(tokenIn, tokenOut, amount);
  // Handle success
} catch (error) {
  console.error('Swap quote failed:', error.message);
  // Handle error - show user message, retry, etc.
}
```

## Integration with Chat Agent

The agent can use these methods to:

1. **Answer balance queries**: Use `getTokenBalances()` when user asks about their tokens
2. **Provide swap quotes**: Use `getSwapQuote()` for "How much USDC for 10 FLOW?"
3. **Execute swaps**: Use `performSwap()` when user confirms a trade
4. **Track transactions**: Use `getTransactionStatus()` to update user on progress

### Example Agent Response Flow

```typescript
// User: "Swap 10 FLOW for USDC"
async function handleSwapRequest(message: string, userAddress: string) {
  try {
    // Parse the request
    const amount = '10.0';
    const tokenIn = 'A.1654653399040a61.FlowToken';
    const tokenOut = 'A.b19436aae4d94622.FiatToken';
    
    // Get quote
    const quote = await SwapAPIClient.getSwapQuote(tokenIn, tokenOut, amount);
    
    // Ask for confirmation
    const confirmationMessage = `
      I can swap ${amount} FLOW for approximately ${quote.amountOut} USDC.
      Price impact: ${quote.priceImpact}%
      Fee: ${quote.fee} FLOW
      
      Should I proceed with this swap?
    `;
    
    return confirmationMessage;
  } catch (error) {
    return `Sorry, I couldn't get a quote for this swap: ${error.message}`;
  }
}

// User confirms: "Yes, do it"
async function executeConfirmedSwap(quoteId: string, userAddress: string) {
  try {
    const transaction = await SwapAPIClient.executeSwap(quoteId, userAddress);
    
    return `Swap executed! Transaction ID: ${transaction.id}. Status: ${transaction.status}`;
  } catch (error) {
    return `Swap failed: ${error.message}`;
  }
}
```

## Next Steps for Agent Integration

1. **Parse user messages** to identify swap requests
2. **Extract token symbols and amounts** from natural language
3. **Map token symbols to addresses** using the available tokens list
4. **Validate user balances** before attempting swaps
5. **Handle confirmations** and execute swaps when approved
6. **Provide status updates** and transaction tracking

The swap functionality is now ready for the AI agent to use!
