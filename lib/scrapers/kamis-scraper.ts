import axios from 'axios';
import * as cheerio from 'cheerio';
import { TridgePrice } from '../types';

const KAMIS_BASE_URL = 'https://kamis.kilimo.go.ke';
const KAMIS_MARKET_URL = `${KAMIS_BASE_URL}/site/market`;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export interface KamisPrice {
  commodity: string;
  price: number;
  currency: string;
  market: string;
  date: string;
  unit?: string;
}

/**
 * Scrapes commodity prices from the Kenyan Ministry of Agriculture KAMIS system
 * (Kenya Agricultural Market Information System)
 * 
 * The website at https://kamis.kilimo.go.ke/site/market provides real-time
 * market prices for various agricultural commodities across Kenya.
 */
export async function scrapeKamisPrices(commodities?: string[]): Promise<KamisPrice[]> {
  try {
    const response = await axios.get(KAMIS_MARKET_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const prices: KamisPrice[] = [];

    // Try to find the market data table
    // Common selectors for price tables
    const tableSelectors = [
      'table.table',
      'table.market-prices',
      'table#market-data',
      '.market-table',
      'table',
    ];

    let marketTable = null;
    for (const selector of tableSelectors) {
      const table = $(selector).first();
      if (table.length > 0) {
        marketTable = table;
        break;
      }
    }

    if (!marketTable) {
      console.log('No market table found on Kamis website');
      return [];
    }

    // Parse the table rows
    marketTable.find('tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');

      if (cells.length >= 3) {
        // Typical structure: Commodity | Market | Price | Unit | Date
        const commodityName = $(cells[0]).text().trim().toUpperCase();
        const market = $(cells[1]).text().trim();
        const priceText = $(cells[2]).text().trim();

        // Extract price from text (handles formats like "KES 5000", "5000", etc.)
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[0].replace(/,/g, ''));

          // Check if this commodity is in our filter list (if provided)
          const shouldInclude = !commodities || 
            commodities.some(c => 
              commodityName.includes(c.toUpperCase()) || 
              c.toUpperCase().includes(commodityName)
            );

          if (shouldInclude && price > 0) {
            // Determine currency (KES for Kenyan Shilling)
            let currency = 'KES';
            if (priceText.includes('USD') || priceText.includes('$')) {
              currency = 'USD';
            }

            // Try to extract unit if available
            let unit = 'KG'; // Default to kilogram
            if (cells.length >= 4) {
              const unitText = $(cells[3]).text().trim().toUpperCase();
              if (unitText) {
                unit = unitText;
              }
            }

            prices.push({
              commodity: commodityName,
              price,
              currency,
              market,
              date: new Date().toISOString(),
              unit,
            });
          }
        }
      }
    });

    return prices;
  } catch (error) {
    console.error('Error scraping Kamis prices:', error);
    return [];
  }
}

/**
 * Fetches wheat and maize prices specifically from Kamis
 */
export async function scrapeKamisWheatMaizePrices(): Promise<KamisPrice[]> {
  const commodities = ['WHEAT', 'MAIZE', 'CORN'];
  return scrapeKamisPrices(commodities);
}

/**
 * Converts Kamis price (typically in KES per KG) to USD per MT for consistency
 * 
 * @param kamisPrice - The Kamis price object to convert
 * @param exchangeRate - KES to USD exchange rate (default: 150, approximately as of 2024)
 * @returns Converted price in USD per MT
 * 
 * Note: The default exchange rate is approximate and should be updated regularly
 * or fetched from a currency API for production use.
 */
export function convertKamisPriceToUSD(
  kamisPrice: KamisPrice,
  exchangeRate: number = parseFloat(process.env.KES_TO_USD_RATE || '150')
): TridgePrice {
  let priceInUSD = kamisPrice.price;

  // Convert from KES to USD if needed
  if (kamisPrice.currency === 'KES') {
    priceInUSD = kamisPrice.price / exchangeRate;
  }

  // Convert from KG to MT (Metric Ton = 1000 KG)
  if (kamisPrice.unit === 'KG' || kamisPrice.unit === 'KILOGRAM') {
    priceInUSD = priceInUSD * 1000;
  } else if (kamisPrice.unit === 'BAG') {
    // Standard bag size in Kenya is typically 90kg for grains
    // Note: This may vary by commodity and region
    const bagSizeKg = parseFloat(process.env.KAMIS_BAG_SIZE_KG || '90');
    priceInUSD = (priceInUSD / bagSizeKg) * 1000;
  }

  return {
    commodity: kamisPrice.commodity,
    price: priceInUSD,
    currency: 'USD',
    market: kamisPrice.market,
    date: kamisPrice.date,
  };
}

/**
 * Mock data for development/testing when the Kamis website is not accessible
 */
export function getMockKamisPrices(): KamisPrice[] {
  return [
    {
      commodity: 'WHEAT',
      price: 55,
      currency: 'KES',
      market: 'Nairobi',
      date: new Date().toISOString(),
      unit: 'KG',
    },
    {
      commodity: 'MAIZE',
      price: 45,
      currency: 'KES',
      market: 'Nairobi',
      date: new Date().toISOString(),
      unit: 'KG',
    },
    {
      commodity: 'WHEAT',
      price: 5400,
      currency: 'KES',
      market: 'Mombasa',
      date: new Date().toISOString(),
      unit: 'BAG',
    },
    {
      commodity: 'MAIZE',
      price: 4200,
      currency: 'KES',
      market: 'Kisumu',
      date: new Date().toISOString(),
      unit: 'BAG',
    },
  ];
}
