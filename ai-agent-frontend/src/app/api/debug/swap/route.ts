import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenInAddress = searchParams.get('tokenIn');
    const tokenOutAddress = searchParams.get('tokenOut');
    
    const tokens = kittyPunchSwapService.getAvailableTokens();
    const debugInfo = {
      availableTokens: tokens.map(t => ({ address: t.address, symbol: t.symbol })),
      requestedTokens: {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress
      },
      tokensFound: {
        tokenIn: tokens.find(t => t.address === tokenInAddress),
        tokenOut: tokens.find(t => t.address === tokenOutAddress)
      },
      pools: kittyPunchSwapService['pools'] || 'Private field',
      routeFound: null as any
    };

    // Test if we can access the private method
    if (tokenInAddress && tokenOutAddress) {
      try {
        // Access private method through bracket notation
        const findBestRoute = kittyPunchSwapService['findBestRoute'];
        if (findBestRoute) {
          debugInfo.routeFound = findBestRoute.call(kittyPunchSwapService, tokenInAddress, tokenOutAddress);
        }
      } catch (error) {
        debugInfo.routeFound = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({ debugInfo });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
