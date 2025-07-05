/**
 * KittyPunch Swap Agent Helper Library
 * Simplified interface for AI agents to interact with the swap API
 */

export interface AgentSwapConfig {
  baseUrl?: string;
  defaultSlippage?: number;
}

export class KittyPunchAgent {
  private baseUrl: string;
  private defaultSlippage: number;

  constructor(config: AgentSwapConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000/api';
    this.defaultSlippage = config.defaultSlippage || 0.5;
  }

  /**
   * Get all available tokens for trading
   */
  async getAvailableTokens() {
    const response = await fetch(`${this.baseUrl}/tokens`);
    if (!response.ok) {
      throw new Error(`Failed to get tokens: ${response.statusText}`);
    }
    const data = await response.json();
    return data.tokens;
  }

  /**
   * Get token balances for a user
   */
  async getUserBalances(userAddress: string) {
    const response = await fetch(`${this.baseUrl}/tokens/balances?userAddress=${userAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to get balances: ${response.statusText}`);
    }
    const data = await response.json();
    return data.balances;
  }

  /**
   * Get a swap quote
   */
  async getSwapQuote(tokenInAddress: string, tokenOutAddress: string, amountIn: string) {
    const response = await fetch(`${this.baseUrl}/swap/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenInAddress,
        tokenOutAddress,
        amountIn
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get quote: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.quote;
  }

  /**
   * Execute a swap
   */
  async executeSwap(quoteId: string, userAddress: string, slippageTolerance?: number) {
    const response = await fetch(`${this.baseUrl}/swap/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId,
        userAddress,
        slippageTolerance: slippageTolerance || this.defaultSlippage
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to execute swap: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.transaction;
  }

  /**
   * Complete swap flow: get quote and execute in one call
   */
  async performSwap(
    tokenInAddress: string, 
    tokenOutAddress: string, 
    amountIn: string, 
    userAddress: string,
    slippageTolerance?: number
  ) {
    // Get quote
    const quote = await this.getSwapQuote(tokenInAddress, tokenOutAddress, amountIn);
    
    // Execute swap
    const transaction = await this.executeSwap(quote.id, userAddress, slippageTolerance);
    
    return {
      quote,
      transaction
    };
  }

  /**
   * Check if user has sufficient balance for a swap
   */
  async checkSufficientBalance(userAddress: string, tokenAddress: string, requiredAmount: string): Promise<boolean> {
    const balances = await this.getUserBalances(userAddress);
    const currentBalance = parseFloat(balances[tokenAddress] || '0');
    const required = parseFloat(requiredAmount);
    
    return currentBalance >= required;
  }

  /**
   * Find the best swap route (currently returns direct swap, can be enhanced)
   */
  async findBestRoute(tokenInAddress: string, tokenOutAddress: string, amountIn: string) {
    // For now, just return a direct quote
    // In the future, this could compare multiple routes
    return await this.getSwapQuote(tokenInAddress, tokenOutAddress, amountIn);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string) {
    const response = await fetch(`${this.baseUrl}/swap/transaction/${transactionId}`);
    if (!response.ok) {
      throw new Error(`Failed to get transaction: ${response.statusText}`);
    }
    const data = await response.json();
    return data.transaction;
  }

  /**
   * Refresh an expired quote
   */
  async refreshQuote(quoteId: string) {
    const response = await fetch(`${this.baseUrl}/swap/quote/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh quote: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.quote;
  }

  /**
   * Helper method to find token by symbol
   */
  async findTokenBySymbol(symbol: string) {
    const tokens = await this.getAvailableTokens();
    return tokens.find((token: any) => token.symbol.toLowerCase() === symbol.toLowerCase());
  }

  /**
   * Helper method to format token amounts properly
   */
  formatTokenAmount(amount: string, decimals: number = 6): string {
    const num = parseFloat(amount);
    return num.toFixed(Math.min(decimals, 8));
  }
}

// Export singleton instance for easy use
export const swapAgent = new KittyPunchAgent();

// Example usage:
/*
import { swapAgent } from './lib/swap-agent';

// Simple swap
const result = await swapAgent.performSwap(
  '0x0ae53cb6e3f42a79', // FLOW
  '0xe223d8a629e49c68', // USDC  
  '10.0',
  userAddress
);

// Check balance first
const hasBalance = await swapAgent.checkSufficientBalance(
  userAddress,
  '0x0ae53cb6e3f42a79',
  '10.0'
);

if (hasBalance) {
  const transaction = await swapAgent.performSwap(...);
}
*/
