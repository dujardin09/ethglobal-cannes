import { NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

export async function GET() {
  try {
    // Test the swap service functionality
    const tests = {
      availableTokens: kittyPunchSwapService.getAvailableTokens(),
      mockBalances: await kittyPunchSwapService.getAllTokenBalances('0x1234567890123456'),
      testQuote: null as any,
      priceHistory: null as any
    };

    // Test getting a quote
    const tokens = tests.availableTokens;
    if (tokens.length >= 2) {
      tests.testQuote = await kittyPunchSwapService.getSwapQuote(
        tokens[0].address,
        tokens[1].address,
        '10.0'
      );
    }

    // Test price history
    if (tokens.length > 0) {
      tests.priceHistory = kittyPunchSwapService.getHistoricalPrices(tokens[0].address, 3);
    }

    return NextResponse.json({
      status: 'success',
      message: 'KittyPunch Swap Service is working correctly',
      tests
    });
  } catch (error) {
    console.error('Swap service test failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Swap service test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
