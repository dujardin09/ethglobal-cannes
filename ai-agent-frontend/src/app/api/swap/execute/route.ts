import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

export async function POST(request: NextRequest) {
  try {
    const { quoteId, userAddress, slippageTolerance } = await request.json();

    if (!quoteId || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: quoteId, userAddress' },
        { status: 400 }
      );
    }

    const transaction = await kittyPunchSwapService.executeSwap(
      quoteId, 
      userAddress, 
      slippageTolerance || 0.5
    );

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error executing swap:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
