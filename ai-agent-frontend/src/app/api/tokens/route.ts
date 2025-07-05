import { NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

export async function GET() {
  try {
    const tokens = kittyPunchSwapService.getAvailableTokens();
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error getting available tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
