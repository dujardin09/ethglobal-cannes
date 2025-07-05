// Swap-related types and interfaces

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
  balance?: string;
}

export interface SwapQuote {
  id: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  fee: string;
  route: SwapRoute[];
  estimatedGas: string;
  validUntil: number; // timestamp
}

export interface SwapRoute {
  poolAddress: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;
}

export interface SwapParams {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: string;
  minAmountOut: string;
  recipient?: string;
  deadline?: number;
}

export interface SwapTransaction {
  id: string;
  hash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  quote: SwapQuote;
  timestamp: number;
  errorMessage?: string;
}

export interface KittyPunchPool {
  address: string;
  token0: Token;
  token1: Token;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
}

// Common Flow tokens for the emulator/testnet
export const FLOW_TOKENS: Record<string, Token> = {
  FLOW: {
    address: '0x0ae53cb6e3f42a79',
    name: 'Flow Token',
    symbol: 'FLOW',
    decimals: 8,
    logoUrl: 'https://cryptologos.cc/logos/flow-flow-logo.png'
  },
  FUSD: {
    address: '0xf233dcee88fe0abe',
    name: 'Flow USD',
    symbol: 'FUSD',
    decimals: 8,
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  // Mock tokens for demo purposes
  USDC: {
    address: '0x0000000000000001',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  USDT: {
    address: '0x0000000000000002',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  }
};
