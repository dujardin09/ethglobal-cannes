import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';
import { FlowUtils } from '@/lib/flow-integration';

// Simple cache for balance requests to reduce excessive API calls
const balanceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: userAddress' },
        { status: 400 }
      );
    }

    // Check if Flow network is available
    const isFlowNetworkAvailable = await FlowUtils.isFlowNetworkAvailable();

    // Check cache first
    if (balanceCache.has(userAddress)) {
      const cachedResponse = balanceCache.get(userAddress)!;
      const now = Date.now();

      // If cached data is still valid, return it
      if (now - cachedResponse.timestamp < CACHE_DURATION) {
        return NextResponse.json(cachedResponse.data);
      }

      // If cache is stale, remove it
      balanceCache.delete(userAddress);
    }

    const balances = await kittyPunchSwapService.getAllTokenBalances(userAddress);

    // Add metadata about blockchain integration status
    const response = {
      balances,
      metadata: {
        network: 'testnet', // Currently using emulator
        flowNetworkAvailable: isFlowNetworkAvailable,
        dataSource: isFlowNetworkAvailable ? 'blockchain' : 'mock',
        blockchainIntegration: {
          FLOW: {
            status: isFlowNetworkAvailable ? 'real' : 'mock',
            source: isFlowNetworkAvailable ? 'blockchain' : 'fallback',
            note: isFlowNetworkAvailable ? 'Real Flow blockchain query' : 'Mock data - Flow network not accessible'
          },
          FUSD: { status: 'mock', source: 'placeholder', note: 'Ready for real contract integration' },
          USDC: { status: 'mock', source: 'placeholder', note: 'Ready for real contract integration' },
          USDT: { status: 'mock', source: 'placeholder', note: 'Ready for real contract integration' }
        },
        lastUpdated: new Date().toISOString()
      }
    };

    // Store in cache
    balanceCache.set(userAddress, { data: response, timestamp: Date.now() });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting token balances:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
