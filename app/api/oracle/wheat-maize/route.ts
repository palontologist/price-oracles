import { NextRequest, NextResponse } from 'next/server';
import { fetchWheatMaizePrices } from '@/lib/services/wheat-maize-fetcher';
import { db } from '@/lib/db';
import { commodities, markets, commodityPrices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { OracleResponse, DataSource } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commodity = searchParams.get('commodity')?.toUpperCase();
    const historical = searchParams.get('historical') === 'true';

    // Validate commodity parameter
    if (commodity && commodity !== 'WHEAT' && commodity !== 'MAIZE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid commodity. Must be WHEAT or MAIZE',
        },
        { status: 400 }
      );
    }

    // Fetch current prices
    const prices = await fetchWheatMaizePrices({
      commodity: commodity as 'WHEAT' | 'MAIZE' | undefined,
    });

    // If historical data is requested, try to fetch from database
    if (historical) {
      try {
        // This would fetch historical data from the database
        // For now, we'll just return current prices
        // In a full implementation, you'd query the commodity_prices table
      } catch {
        console.log('Error fetching historical data');
      }
    }

    const response: OracleResponse = {
      success: true,
      data: prices,
      timestamp: new Date().toISOString(),
      sources: [
        DataSource.ALPHA_VANTAGE,
        DataSource.KAMIS,
        DataSource.TRIDGE,
        DataSource.WORLD_BANK,
        DataSource.FALLBACK,
      ],
      note: 'Prices automatically fallback through multiple sources',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in wheat-maize oracle endpoint:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commodity, price, currency, source, market, unit } = body;

    // Validate required fields
    if (!commodity || !price || !source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: commodity, price, source',
        },
        { status: 400 }
      );
    }

    // Find or create commodity
    let commodityRecord = await db.query.commodities.findFirst({
      where: eq(commodities.code, commodity),
    });

    if (!commodityRecord) {
      const [newCommodity] = await db
        .insert(commodities)
        .values({
          code: commodity,
          name: commodity,
        })
        .returning();
      commodityRecord = newCommodity;
    }

    // Find or create market if provided
    let marketRecord = null;
    if (market) {
      marketRecord = await db.query.markets.findFirst({
        where: eq(markets.name, market),
      });

      if (!marketRecord) {
        const [newMarket] = await db
          .insert(markets)
          .values({
            name: market,
            country: 'Kenya',
            countryCode: 'KE',
            region: 'AFRICA',
          })
          .returning();
        marketRecord = newMarket;
      }
    }

    // Insert price record
    await db.insert(commodityPrices).values({
      commodityId: commodityRecord.id,
      marketId: marketRecord?.id,
      price: parseFloat(price),
      currency: currency || 'USD',
      unit: unit || 'MT',
      source,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Price data stored successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error storing price data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to store price data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
