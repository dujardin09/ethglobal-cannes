import { Token, SwapQuote, SwapTransaction } from '@/types/swap';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export class SwapAPIClient {
  /**
   * Get all available tokens
   */
  static async getAvailableTokens(): Promise<Token[]> {
    const response = await fetch(`${API_BASE_URL}/api/tokens`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch tokens');
    }
    
    return data.tokens;
  }

  /**
   * Get token balances for a user
   */
  static async getTokenBalances(userAddress: string): Promise<Record<string, string>> {
    const response = await fetch(`${API_BASE_URL}/api/tokens/balances?userAddress=${encodeURIComponent(userAddress)}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch balances');
    }
    
    return data.balances;
  }

  /**
   * Get a swap quote
   */
  static async getSwapQuote(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string
  ): Promise<SwapQuote> {
    const response = await fetch(`${API_BASE_URL}/api/swap/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenInAddress,
        tokenOutAddress,
        amountIn,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get quote');
    }
    
    return data.quote;
  }

  /**
   * Execute a swap
   */
  static async executeSwap(
    quoteId: string,
    userAddress: string,
    slippageTolerance: number = 0.5
  ): Promise<SwapTransaction> {
    const response = await fetch(`${API_BASE_URL}/api/swap/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteId,
        userAddress,
        slippageTolerance,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to execute swap');
    }
    
    return data.transaction;
  }

  /**
   * Get transaction status
   */
  static async getTransactionStatus(transactionId: string): Promise<SwapTransaction> {
    const response = await fetch(`${API_BASE_URL}/api/swap/transaction/${transactionId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get transaction status');
    }
    
    return data.transaction;
  }

  /**
   * Helper method to perform a complete swap flow
   */
  static async performSwap(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string,
    userAddress: string,
    slippageTolerance: number = 0.5
  ): Promise<SwapTransaction> {
    // Get quote
    const quote = await this.getSwapQuote(tokenInAddress, tokenOutAddress, amountIn);
    
    // Execute swap
    const transaction = await this.executeSwap(quote.id, userAddress, slippageTolerance);
    
    return transaction;
  }

  /**
   * Get the best available swap route for given tokens and amount
   */
  static async getBestSwapRoute(
    tokenInAddress: string,
    tokenOutAddress: string,
    amountIn: string
  ): Promise<{
    quote: SwapQuote;
    priceImpact: number;
    estimatedOutput: string;
    route: string[];
  }> {
    const quote = await this.getSwapQuote(tokenInAddress, tokenOutAddress, amountIn);
    
    return {
      quote,
      priceImpact: quote.priceImpact,
      estimatedOutput: quote.amountOut,
      route: quote.route.map(r => r.poolAddress)
    };
  }
}

// Export individual functions for easier use
export const {
  getAvailableTokens,
  getTokenBalances,
  getSwapQuote,
  executeSwap,
  getTransactionStatus,
  performSwap,
  getBestSwapRoute
} = SwapAPIClient;
