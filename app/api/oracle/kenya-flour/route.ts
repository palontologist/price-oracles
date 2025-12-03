import { NextRequest, NextResponse } from 'next/server';
import { 
  scrapeKamisFlourPrices, 
  convertKamisPriceToUSD, 
  getKamisFlourPricePerKg,
  getMockKamisFlourPrices,
  KamisPrice 
} from '@/lib/scrapers/kamis-scraper';
import { db } from '@/lib/db';
import { commodities, markets, commodityPrices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DataSource } from '@/lib/types';

export interface FlourPriceResponse {
  success: boolean;
  data: FlourPriceData[];
  timestamp: string;
  source: string;
  exchangeRate?: number;
  note?: string;
  error?: string;
}

export interface FlourPriceData {
  commodity: string;
  market: string;
  priceKES: number;
  pricePerKgKES: number;
  priceUSD: number;
  pricePerMtUSD: number;
  unit: string;
  date: string;
}

/**
 * GET /api/oracle/kenya-flour
 * 
 * Fetches current wheat flour and maize flour prices from Kenyan markets
 * via the KAMIS (Kenya Agricultural Market Information System).
 * 
 * Query Parameters:
 * - commodity: Filter by 'wheat-flour' or 'maize-flour' (optional)
 * - market: Filter by market name like 'nairobi', 'mombasa' (optional)
 * - mock: Set to 'true' to use mock data for testing (optional)
 * 
 * Example:
 * - GET /api/oracle/kenya-flour
 * - GET /api/oracle/kenya-flour?commodity=wheat-flour
 * - GET /api/oracle/kenya-flour?market=nairobi
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commodityParam = searchParams.get('commodity')?.toLowerCase();
    const marketParam = searchParams.get('market')?.toLowerCase();
    const useMock = searchParams.get('mock') === 'true' || process.env.USE_MOCK_KAMIS === 'true';

    // Validate commodity parameter
    if (commodityParam && commodityParam !== 'wheat-flour' && commodityParam !== 'maize-flour') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid commodity. Must be wheat-flour or maize-flour',
        },
        { status: 400 }
      );
    }

    // Fetch flour prices from KAMIS
    let kamisPrices: KamisPrice[];
    
    if (useMock) {
      kamisPrices = getMockKamisFlourPrices();
    } else {
      kamisPrices = await scrapeKamisFlourPrices();
    }

    // Filter by commodity if specified
    if (commodityParam) {
      const targetCommodity = commodityParam === 'wheat-flour' ? 'WHEAT FLOUR' : 'MAIZE FLOUR';
      kamisPrices = kamisPrices.filter(p => p.commodity === targetCommodity);
    }

    // Filter by market if specified
    if (marketParam) {
      kamisPrices = kamisPrices.filter(p => 
        p.market.toLowerCase().includes(marketParam)
      );
    }

    // Get current exchange rate
    const exchangeRate = parseFloat(process.env.KES_TO_USD_RATE || '154');

    // Transform prices to response format
    const flourPrices: FlourPriceData[] = kamisPrices.map(price => {
      const pricePerKg = getKamisFlourPricePerKg(price);
      const usdPrice = convertKamisPriceToUSD(price, exchangeRate);
      
      return {
        commodity: price.commodity,
        market: price.market,
        priceKES: price.price,
        pricePerKgKES: pricePerKg.pricePerKg,
        priceUSD: Math.round((price.price / exchangeRate) * 100) / 100,
        pricePerMtUSD: usdPrice.price,
        unit: price.unit || 'KG',
        date: price.date,
      };
    });

    const response: FlourPriceResponse = {
      success: true,
      data: flourPrices,
      timestamp: new Date().toISOString(),
      source: DataSource.KAMIS,
      exchangeRate,
      note: useMock 
        ? 'Using mock data. Set USE_MOCK_KAMIS=false in .env.local to use live data.'
        : 'Live data from KAMIS (Kenya Agricultural Market Information System)',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in kenya-flour oracle endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch flour prices',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/oracle/kenya-flour
 * 
 * Stores flour price data in the database for historical tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commodity, price, currency, market, unit } = body;

    // Validate required fields
    if (!commodity || !price) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: commodity, price',
        },
        { status: 400 }
      );
    }

    // Validate commodity type
    const upperCommodity = commodity.toUpperCase();
    if (upperCommodity !== 'WHEAT FLOUR' && upperCommodity !== 'MAIZE FLOUR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid commodity. Must be WHEAT FLOUR or MAIZE FLOUR',
        },
        { status: 400 }
      );
    }

    // Find or create commodity
    let commodityRecord = await db.query.commodities.findFirst({
      where: eq(commodities.code, upperCommodity),
    });

    if (!commodityRecord) {
      const [newCommodity] = await db
        .insert(commodities)
        .values({
          code: upperCommodity,
          name: upperCommodity,
          description: `${upperCommodity} from Kenyan markets`,
        })
        .returning();
      commodityRecord = newCommodity;
    }

    // Find or create market
    let marketRecord = null;
    const marketName = market || 'Nairobi';
    
    marketRecord = await db.query.markets.findFirst({
      where: eq(markets.name, marketName),
    });

    if (!marketRecord) {
      const [newMarket] = await db
        .insert(markets)
        .values({
          name: marketName,
          country: 'Kenya',
          countryCode: 'KE',
          region: 'AFRICA',
        })
        .returning();
      marketRecord = newMarket;
    }

    // Insert price record
    await db.insert(commodityPrices).values({
      commodityId: commodityRecord.id,
      marketId: marketRecord.id,
      price: parseFloat(price),
      currency: currency || 'KES',
      unit: unit || 'KG',
      source: DataSource.KAMIS,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Flour price data stored successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error storing flour price data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to store flour price data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
