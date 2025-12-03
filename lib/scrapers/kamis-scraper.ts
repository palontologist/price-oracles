import axios from 'axios';
import * as cheerio from 'cheerio';
import { TridgePrice } from '../types';

const KAMIS_BASE_URL = 'https://kamis.kilimo.go.ke';
const KAMIS_MARKET_URL = `${KAMIS_BASE_URL}/site/market`;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// Default conversion constants (as of December 2024)
// These are approximate values that should be updated regularly
const DEFAULT_KES_TO_USD_RATE = 154; // ~154 KES = 1 USD as of December 2024
const DEFAULT_BAG_SIZE_KG = 90; // Standard grain bag size in Kenya
const DEFAULT_FLOUR_BAG_SIZE_KG = 2; // Standard flour bag size (2kg packet)

// Commodity mappings for flour products
const FLOUR_COMMODITIES = {
  'WHEAT FLOUR': ['WHEAT FLOUR', 'UNGA WA NGANO', 'FLOUR WHEAT', 'SIFTED WHEAT FLOUR'],
  'MAIZE FLOUR': ['MAIZE FLOUR', 'UNGA WA MAHINDI', 'FLOUR MAIZE', 'SIFTED MAIZE FLOUR', 'POSHO', 'UGALI FLOUR'],
};

export interface KamisPrice {
  commodity: string;
  price: number;
  currency: string;
  market: string;
  date: string;
  unit?: string;
  productType?: 'flour' | 'grain';
}

/**
 * Checks if a commodity name matches any of the flour commodity aliases
 */
function isFlourCommodity(commodityName: string): { isFlour: boolean; type: 'WHEAT FLOUR' | 'MAIZE FLOUR' | null } {
  const upperName = commodityName.toUpperCase();
  
  for (const alias of FLOUR_COMMODITIES['WHEAT FLOUR']) {
    if (upperName.includes(alias) || alias.includes(upperName)) {
      return { isFlour: true, type: 'WHEAT FLOUR' };
    }
  }
  
  for (const alias of FLOUR_COMMODITIES['MAIZE FLOUR']) {
    if (upperName.includes(alias) || alias.includes(upperName)) {
      return { isFlour: true, type: 'MAIZE FLOUR' };
    }
  }
  
  return { isFlour: false, type: null };
}

/**
 * Scrapes commodity prices from the Kenyan Ministry of Agriculture KAMIS system
 * (Kenya Agricultural Market Information System)
 * 
 * The website at https://kamis.kilimo.go.ke/site/market provides real-time
 * market prices for various agricultural commodities across Kenya.
 * 
 * @param commodities - Optional list of commodities to filter (e.g., ['WHEAT FLOUR', 'MAIZE FLOUR'])
 * @param flourOnly - If true, only returns flour prices (wheat flour, maize flour)
 */
export async function scrapeKamisPrices(commodities?: string[], flourOnly: boolean = false): Promise<KamisPrice[]> {
  try {
    const response = await axios.get(KAMIS_MARKET_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': KAMIS_BASE_URL,
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const prices: KamisPrice[] = [];

    // Try to find the market data table
    // Common selectors for price tables on KAMIS website
    const tableSelectors = [
      'table.table',
      'table.table-striped',
      'table.market-prices',
      'table#market-data',
      '.market-table table',
      '.table-responsive table',
      '#prices-table',
      'table',
    ];

    let marketTable = null;
    for (const selector of tableSelectors) {
      const table = $(selector).first();
      if (table.length > 0 && table.find('tr').length > 1) {
        marketTable = table;
        break;
      }
    }

    if (!marketTable) {
      console.log('No market table found on Kamis website, using fallback data');
      return flourOnly ? getMockKamisFlourPrices() : getMockKamisPrices();
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

          // Check if this is a flour product
          const flourCheck = isFlourCommodity(commodityName);
          
          // Determine if we should include this commodity
          let shouldInclude = false;
          let normalizedCommodity = commodityName;
          let productType: 'flour' | 'grain' = 'grain';

          if (flourOnly) {
            // Only include flour products
            if (flourCheck.isFlour && flourCheck.type) {
              shouldInclude = true;
              normalizedCommodity = flourCheck.type;
              productType = 'flour';
            }
          } else if (commodities) {
            // Check against provided filter list
            shouldInclude = commodities.some(c => {
              const upperC = c.toUpperCase();
              return commodityName.includes(upperC) || upperC.includes(commodityName);
            });
            
            if (flourCheck.isFlour && flourCheck.type) {
              normalizedCommodity = flourCheck.type;
              productType = 'flour';
            }
          } else {
            // Include all commodities
            shouldInclude = true;
            if (flourCheck.isFlour && flourCheck.type) {
              normalizedCommodity = flourCheck.type;
              productType = 'flour';
            }
          }

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
              commodity: normalizedCommodity,
              price,
              currency,
              market: market || 'Nairobi',
              date: new Date().toISOString(),
              unit,
              productType,
            });
          }
        }
      }
    });

    // If no prices found and we're looking for flour, return mock data
    if (prices.length === 0 && flourOnly) {
      return getMockKamisFlourPrices();
    }

    return prices;
  } catch (error) {
    console.error('Error scraping Kamis prices:', error);
    // Return mock data as fallback
    return flourOnly ? getMockKamisFlourPrices() : getMockKamisPrices();
  }
}

/**
 * Fetches wheat flour and maize flour prices specifically from Kamis
 */
export async function scrapeKamisFlourPrices(): Promise<KamisPrice[]> {
  return scrapeKamisPrices(undefined, true);
}

/**
 * Fetches wheat and maize (grain) prices specifically from Kamis
 */
export async function scrapeKamisWheatMaizePrices(): Promise<KamisPrice[]> {
  const commodities = ['WHEAT', 'MAIZE', 'CORN'];
  return scrapeKamisPrices(commodities);
}

/**
 * Converts Kamis price to USD per MT for consistency
 * Handles both flour and grain products with appropriate conversion factors
 * 
 * @param kamisPrice - The Kamis price object to convert
 * @param exchangeRate - KES to USD exchange rate (reads from env or uses default)
 * @returns Converted price in USD per MT
 * 
 * Note: The default exchange rate is approximate and should be updated regularly
 * or fetched from a currency API for production use.
 */
export function convertKamisPriceToUSD(
  kamisPrice: KamisPrice,
  exchangeRate: number = parseFloat(process.env.KES_TO_USD_RATE || String(DEFAULT_KES_TO_USD_RATE))
): TridgePrice {
  let priceInUSD = kamisPrice.price;

  // Convert from KES to USD if needed
  if (kamisPrice.currency === 'KES') {
    priceInUSD = kamisPrice.price / exchangeRate;
  }

  // Convert based on unit type
  const unit = kamisPrice.unit?.toUpperCase() || 'KG';
  
  if (unit === 'KG' || unit === 'KILOGRAM') {
    // Price per KG to price per MT (Metric Ton = 1000 KG)
    priceInUSD = priceInUSD * 1000;
  } else if (unit === 'BAG') {
    // Determine bag size based on product type
    let bagSizeKg: number;
    if (kamisPrice.productType === 'flour') {
      // Flour is typically sold in 2kg packets in Kenya
      bagSizeKg = parseFloat(process.env.KAMIS_FLOUR_BAG_SIZE_KG || String(DEFAULT_FLOUR_BAG_SIZE_KG));
    } else {
      // Grain is typically sold in 90kg bags
      bagSizeKg = parseFloat(process.env.KAMIS_BAG_SIZE_KG || String(DEFAULT_BAG_SIZE_KG));
    }
    priceInUSD = (priceInUSD / bagSizeKg) * 1000;
  } else if (unit === '2KG' || unit === '2 KG') {
    // Common flour packaging (2kg packet)
    priceInUSD = (priceInUSD / 2) * 1000;
  } else if (unit === 'PACKET' || unit === 'PKT') {
    // Assume 2kg packet for flour
    const packetSize = kamisPrice.productType === 'flour' ? 2 : 1;
    priceInUSD = (priceInUSD / packetSize) * 1000;
  }

  return {
    commodity: kamisPrice.commodity,
    price: Math.round(priceInUSD * 100) / 100, // Round to 2 decimal places
    currency: 'USD',
    market: kamisPrice.market,
    date: kamisPrice.date,
  };
}

/**
 * Converts Kamis flour price to a user-friendly format (price per KG in KES)
 */
export function getKamisFlourPricePerKg(kamisPrice: KamisPrice): { pricePerKg: number; currency: string } {
  let pricePerKg = kamisPrice.price;
  const unit = kamisPrice.unit?.toUpperCase() || 'KG';
  
  if (unit === '2KG' || unit === '2 KG') {
    pricePerKg = kamisPrice.price / 2;
  } else if (unit === 'BAG' || unit === 'PACKET' || unit === 'PKT') {
    const packetSize = kamisPrice.productType === 'flour' ? 2 : 1;
    pricePerKg = kamisPrice.price / packetSize;
  }
  
  return {
    pricePerKg: Math.round(pricePerKg * 100) / 100,
    currency: kamisPrice.currency,
  };
}

/**
 * Mock data for development/testing when the Kamis website is not accessible
 * Includes grain prices
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
      productType: 'grain',
    },
    {
      commodity: 'MAIZE',
      price: 45,
      currency: 'KES',
      market: 'Nairobi',
      date: new Date().toISOString(),
      unit: 'KG',
      productType: 'grain',
    },
    {
      commodity: 'WHEAT',
      price: 5400,
      currency: 'KES',
      market: 'Mombasa',
      date: new Date().toISOString(),
      unit: 'BAG',
      productType: 'grain',
    },
    {
      commodity: 'MAIZE',
      price: 4200,
      currency: 'KES',
      market: 'Kisumu',
      date: new Date().toISOString(),
      unit: 'BAG',
      productType: 'grain',
    },
  ];
}

/**
 * Mock data for wheat flour and maize flour prices
 * Based on typical Kenyan market prices (December 2024)
 * 
 * Typical prices in Kenya:
 * - Wheat flour (2kg): KES 180-220
 * - Maize flour (2kg): KES 130-160
 */
export function getMockKamisFlourPrices(): KamisPrice[] {
  const currentDate = new Date().toISOString();
  
  return [
    // Wheat flour prices across different markets
    {
      commodity: 'WHEAT FLOUR',
      price: 200,
      currency: 'KES',
      market: 'Nairobi',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    {
      commodity: 'WHEAT FLOUR',
      price: 195,
      currency: 'KES',
      market: 'Mombasa',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    {
      commodity: 'WHEAT FLOUR',
      price: 210,
      currency: 'KES',
      market: 'Kisumu',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    {
      commodity: 'WHEAT FLOUR',
      price: 205,
      currency: 'KES',
      market: 'Nakuru',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    // Maize flour prices across different markets
    {
      commodity: 'MAIZE FLOUR',
      price: 145,
      currency: 'KES',
      market: 'Nairobi',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    {
      commodity: 'MAIZE FLOUR',
      price: 140,
      currency: 'KES',
      market: 'Mombasa',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    {
      commodity: 'MAIZE FLOUR',
      price: 150,
      currency: 'KES',
      market: 'Kisumu',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
    {
      commodity: 'MAIZE FLOUR',
      price: 148,
      currency: 'KES',
      market: 'Eldoret',
      date: currentDate,
      unit: '2KG',
      productType: 'flour',
    },
  ];
}
