import * as fcl from '@onflow/fcl';
import { 
  Token, 
  SwapQuote, 
  SwapParams, 
  SwapTransaction, 
  KittyPunchPool,
  FLOW_TOKENS 
} from '@/types/swap';

class KittyPunchSwapService {
  private pools: KittyPunchPool[] = [];
  private quotes: Map<string, SwapQuote> = new Map();
  private transactions: Map<string, SwapTransaction> = new Map();

  constructor() {
    this.initializeMockPools();
  }

  // Initialize mock pools for demo purposes
  private initializeMockPools() {
    this.pools = [
      {
        address: '0x1000000000000001',
        token0: FLOW_TOKENS.FLOW,
        token1: FLOW_TOKENS.USDC,
        fee: 3000, // 0.3%
        liquidity: '1000000000000',
        sqrtPriceX96: '79228162514264337593543950336'
      },
      {
        address: '0x1000000000000002',
        token0: FLOW_TOKENS.FLOW,
        token1: FLOW_TOKENS.USDT,
        fee: 3000,
        liquidity: '800000000000',
        sqrtPriceX96: '79228162514264337593543950336'
      },
      {
        address: '0x1000000000000003',
        token0: FLOW_TOKENS.USDC,
        token1: FLOW_TOKENS.USDT,
        fee: 500, // 0.05%
        liquidity: '500000000000',
        sqrtPriceX96: '79228162514264337593543950336'
      },
      {
        address: '0x1000000000000004',
        token0: FLOW_TOKENS.FLOW,
        token1: FLOW_TOKENS.FUSD,
        fee: 3000, // 0.3%
        liquidity: '600000000000',
        sqrtPriceX96: '79228162514264337593543950336'
      }
    ];
  }

  // Get all available tokens
  getAvailableTokens(): Token[] {
    return Object.values(FLOW_TOKENS);
  }

  // Get available pools for debugging
  getAvailablePools(): KittyPunchPool[] {
    return this.pools;
  }

  // Get token balance for a user
  async getTokenBalance(userAddress: string, tokenAddress: string): Promise<string> {
    try {
      // Mock implementation - in real app, this would query the blockchain
      const mockBalances: Record<string, string> = {
        [FLOW_TOKENS.FLOW.address]: '1000.00000000',
        [FLOW_TOKENS.USDC.address]: '500.000000',
        [FLOW_TOKENS.USDT.address]: '250.000000',
        [FLOW_TOKENS.FUSD.address]: '100.00000000'
      };

      return mockBalances[tokenAddress] || '0';
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return '0';
    }
  }

  // Get all token balances for a user
  async getAllTokenBalances(userAddress: string): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};
    
    for (const token of this.getAvailableTokens()) {
      balances[token.address] = await this.getTokenBalance(userAddress, token.address);
    }
    
    return balances;
  }

  // Find the best route for a swap
  findBestRoute(tokenIn: string, tokenOut: string): KittyPunchPool[] {
    // Simple direct route finding
    const directPool = this.pools.find(pool => 
      (pool.token0.address === tokenIn && pool.token1.address === tokenOut) ||
      (pool.token1.address === tokenIn && pool.token0.address === tokenOut)
    );

    if (directPool) {
      return [directPool];
    }

    // Try to find indirect route through FLOW
    const poolToFlow = this.pools.find(pool =>
      (pool.token0.address === tokenIn && pool.token1.address === FLOW_TOKENS.FLOW.address) ||
      (pool.token1.address === tokenIn && pool.token0.address === FLOW_TOKENS.FLOW.address)
    );

    const poolFromFlow = this.pools.find(pool =>
      (pool.token0.address === FLOW_TOKENS.FLOW.address && pool.token1.address === tokenOut) ||
      (pool.token1.address === FLOW_TOKENS.FLOW.address && pool.token0.address === tokenOut)
    );

    if (poolToFlow && poolFromFlow) {
      return [poolToFlow, poolFromFlow];
    }

    return [];
  }

  // Calculate swap output amount (simplified calculation for demo)
  calculateSwapOutput(amountIn: string, tokenIn: Token, tokenOut: Token, route: KittyPunchPool[]): string {
    const amountInNum = parseFloat(amountIn);
    
    // Mock price calculation (in real implementation, this would use pool math)
    const mockPrices: Record<string, number> = {
      [FLOW_TOKENS.FLOW.address]: 0.5, // 1 FLOW = 0.5 USD
      [FLOW_TOKENS.USDC.address]: 1.0, // 1 USDC = 1 USD
      [FLOW_TOKENS.USDT.address]: 1.0, // 1 USDT = 1 USD
      [FLOW_TOKENS.FUSD.address]: 1.0  // 1 FUSD = 1 USD
    };

    const priceIn = mockPrices[tokenIn.address] || 1;
    const priceOut = mockPrices[tokenOut.address] || 1;
    
    let amountOut = (amountInNum * priceIn) / priceOut;
    
    // Apply fees
    route.forEach(pool => {
      const feeRate = pool.fee / 1000000; // Convert basis points to decimal
      amountOut *= (1 - feeRate);
    });

    // Adjust for decimals
    const decimalAdjustment = Math.pow(10, tokenOut.decimals - tokenIn.decimals);
    amountOut *= decimalAdjustment;

    return amountOut.toFixed(tokenOut.decimals);
  }

  // Get a swap quote
  async getSwapQuote(
    tokenInAddress: string, 
    tokenOutAddress: string, 
    amountIn: string
  ): Promise<SwapQuote | null> {
    try {
      const tokenIn = this.getAvailableTokens().find(t => t.address === tokenInAddress);
      const tokenOut = this.getAvailableTokens().find(t => t.address === tokenOutAddress);

      if (!tokenIn || !tokenOut) {
        throw new Error('Token not found');
      }

      const route = this.findBestRoute(tokenInAddress, tokenOutAddress);
      if (route.length === 0) {
        throw new Error('No route found');
      }

      const amountOut = this.calculateSwapOutput(amountIn, tokenIn, tokenOut, route);
      const priceImpact = parseFloat(amountIn) > 1000 ? 0.5 : 0.1; // Mock price impact
      const totalFee = route.reduce((sum, pool) => sum + pool.fee, 0);

      const quote: SwapQuote = {
        id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        priceImpact,
        fee: (parseFloat(amountIn) * (totalFee / 1000000)).toFixed(tokenIn.decimals),
        route: route.map(pool => ({
          poolAddress: pool.address,
          tokenIn: pool.token0.address === tokenInAddress ? pool.token0.address : pool.token1.address,
          tokenOut: pool.token0.address === tokenOutAddress ? pool.token0.address : pool.token1.address,
          fee: pool.fee
        })),
        estimatedGas: '0.001',
        validUntil: Date.now() + 300000 // Valid for 5 minutes
      };

      this.quotes.set(quote.id, quote);
      return quote;
    } catch (error) {
      console.error('Error getting swap quote:', error);
      return null;
    }
  }

  // Check if a quote is still valid
  isQuoteValid(quoteId: string): boolean {
    const quote = this.quotes.get(quoteId);
    return quote ? Date.now() < quote.validUntil : false;
  }

  // Get a quote by ID (returns null if expired)
  getQuoteById(quoteId: string): SwapQuote | null {
    const quote = this.quotes.get(quoteId);
    if (!quote || Date.now() >= quote.validUntil) {
      if (quote) {
        this.quotes.delete(quoteId); // Clean up expired quote
      }
      return null;
    }
    return quote;
  }

  // Refresh an existing quote with new market data
  async refreshQuote(quoteId: string): Promise<SwapQuote | null> {
    const existingQuote = this.quotes.get(quoteId);
    if (!existingQuote) {
      return null;
    }

    // Generate a new quote with the same parameters
    return await this.getSwapQuote(
      existingQuote.tokenIn.address,
      existingQuote.tokenOut.address,
      existingQuote.amountIn
    );
  }

  // Execute a swap
  async executeSwap(
    quoteId: string, 
    userAddress: string, 
    slippageTolerance: number = 0.5
  ): Promise<SwapTransaction> {
    const quote = this.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found or expired. Please refresh your quote and try again.');
    }

    // Calculate minimum amount out with slippage tolerance
    const minAmountOut = (parseFloat(quote.amountOut) * (1 - slippageTolerance / 100)).toFixed(quote.tokenOut.decimals);

    const swapParams: SwapParams = {
      tokenInAddress: quote.tokenIn.address,
      tokenOutAddress: quote.tokenOut.address,
      amountIn: quote.amountIn,
      minAmountOut,
      recipient: userAddress,
      deadline: Math.floor(Date.now() / 1000) + 1200 // 20 minutes
    };

    const transaction: SwapTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      quote,
      timestamp: Date.now()
    };

    this.transactions.set(transaction.id, transaction);

    try {
      // Execute the swap transaction
      const txHash = await this.submitSwapTransaction(swapParams);
      
      transaction.hash = txHash;
      transaction.status = 'confirmed';
      
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      transaction.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  // Submit swap transaction to Flow blockchain
  private async submitSwapTransaction(params: SwapParams): Promise<string> {
    try {
      // Mock Cadence transaction for KittyPunch swap
      const cadenceTransaction = `
        import FungibleToken from 0xee82856bf20e2aa6
        import KittyPunch from 0x1000000000000000
        
        transaction(
          tokenInAddress: Address,
          tokenOutAddress: Address,
          amountIn: UFix64,
          minAmountOut: UFix64,
          recipient: Address,
          deadline: UInt64
        ) {
          prepare(acct: AuthAccount) {
            // Get token vaults
            let tokenInVault = acct.borrow<&{FungibleToken.Provider}>(from: /storage/flowTokenVault)
              ?? panic("Could not borrow token in vault")
            
            // Withdraw tokens to swap
            let tokensToSwap <- tokenInVault.withdraw(amount: amountIn)
            
            // Execute swap through KittyPunch
            let swappedTokens <- KittyPunch.swap(
              tokensIn: <-tokensToSwap,
              tokenOutAddress: tokenOutAddress,
              minAmountOut: minAmountOut,
              recipient: recipient,
              deadline: deadline
            )
            
            // Deposit swapped tokens
            let tokenOutVault = acct.borrow<&{FungibleToken.Receiver}>(from: /storage/usdcTokenVault)
              ?? panic("Could not borrow token out vault")
            
            tokenOutVault.deposit(from: <-swappedTokens)
          }
        }
      `;

      // For demo purposes, simulate transaction submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return mock transaction hash
      return `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // In real implementation, this would be:
      // const txId = await fcl.mutate({
      //   cadence: cadenceTransaction,
      //   args: (arg, t) => [
      //     arg(params.tokenInAddress, t.Address),
      //     arg(params.tokenOutAddress, t.Address),
      //     arg(params.amountIn, t.UFix64),
      //     arg(params.minAmountOut, t.UFix64),
      //     arg(params.recipient, t.Address),
      //     arg(params.deadline, t.UInt64),
      //   ],
      //   proposer: fcl.authz,
      //   payer: fcl.authz,
      //   authorizations: [fcl.authz],
      //   limit: 1000
      // });
      // return txId;
    } catch (error) {
      console.error('Error submitting swap transaction:', error);
      throw error;
    }
  }

  // Get transaction status
  getTransaction(transactionId: string): SwapTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  // Get all transactions for a user (in real app, this would filter by user)
  getAllTransactions(): SwapTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // Calculate price impact for a swap
  calculatePriceImpact(amountIn: string, tokenIn: Token, tokenOut: Token): number {
    // Mock price impact calculation
    const amountNum = parseFloat(amountIn);
    if (amountNum < 100) return 0.1;
    if (amountNum < 1000) return 0.3;
    if (amountNum < 10000) return 0.8;
    return 2.5;
  }

  // Get historical prices (mock data)
  getHistoricalPrices(tokenAddress: string, days: number = 7): Array<{timestamp: number, price: number}> {
    const prices = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let i = days; i >= 0; i--) {
      const timestamp = now - (i * dayMs);
      const basePrice = tokenAddress === FLOW_TOKENS.FLOW.address ? 0.5 : 1.0;
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = basePrice * (1 + variation);
      
      prices.push({ timestamp, price });
    }
    
    return prices;
  }
}

// Export singleton instance
export const kittyPunchSwapService = new KittyPunchSwapService();
export default kittyPunchSwapService;
