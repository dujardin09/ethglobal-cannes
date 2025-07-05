import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';
import { FlowUtils } from '@/lib/flow-integration';

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

    const balances = await kittyPunchSwapService.getAllTokenBalances(userAddress);

    // Add metadata about blockchain integration status
    const response = {
      balances,
      metadata: {
        network: 'emulator', // Currently using emulator
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting token balances:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
