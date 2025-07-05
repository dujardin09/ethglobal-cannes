import { NextRequest, NextResponse } from 'next/server';
import { kittyPunchSwapService } from '@/services/swap';

export async function POST(request: NextRequest) {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Missing required parameter: quoteId' },
        { status: 400 }
      );
    }

    const refreshedQuote = await kittyPunchSwapService.refreshQuote(quoteId);

    if (!refreshedQuote) {
      return NextResponse.json(
        { error: 'Unable to refresh quote. Original quote may not exist.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ quote: refreshedQuote });
  } catch (error) {
    console.error('Error refreshing quote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Missing required parameter: quoteId' },
        { status: 400 }
      );
    }

    const isValid = kittyPunchSwapService.isQuoteValid(quoteId);
    const quote = kittyPunchSwapService.getQuoteById(quoteId);

    return NextResponse.json({ 
      isValid,
      quote,
      timeRemaining: quote ? Math.max(0, quote.validUntil - Date.now()) : 0
    });
  } catch (error) {
    console.error('Error checking quote validity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
