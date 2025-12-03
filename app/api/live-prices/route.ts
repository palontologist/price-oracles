import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePrices } from '@/lib/live-prices';
import { Region } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');
    const regionParam = searchParams.get('region');

    // Parse symbols
    const symbols = symbolsParam ? symbolsParam.split(',').map(s => s.trim()) : undefined;

    // Parse region
    let region: Region | undefined = undefined;
    if (regionParam) {
      const upperRegion = regionParam.toUpperCase();
      if (upperRegion === 'AFRICA' || upperRegion === 'LATAM') {
        region = upperRegion as Region;
      }
    }

    // Fetch live prices
    const prices = await fetchLivePrices({ symbols, region });

    return NextResponse.json({
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
      count: prices.length,
    });
  } catch (error) {
    console.error('Error in live-prices endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
