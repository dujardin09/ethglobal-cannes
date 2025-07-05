import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

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

    const balances = await kittyPunchSwapService.getAllTokenBalances(userAddress);

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Error getting token balances:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
