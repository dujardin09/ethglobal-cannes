import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

export async function POST(request: NextRequest) {
  try {
    const { tokenInAddress, tokenOutAddress, amountIn } = await request.json();

    if (!tokenInAddress || !tokenOutAddress || !amountIn) {
      return NextResponse.json(
        { error: 'Missing required parameters: tokenInAddress, tokenOutAddress, amountIn' },
        { status: 400 }
      );
    }

    const quote = await kittyPunchSwapService.getSwapQuote(tokenInAddress, tokenOutAddress, amountIn);

    if (!quote) {
      return NextResponse.json(
        { error: 'Unable to generate quote for this swap' },
        { status: 400 }
      );
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
