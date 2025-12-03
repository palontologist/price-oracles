import axios from 'axios';
import * as cheerio from 'cheerio';
import { TridgePrice } from '../types';

const TRIDGE_URLS = {
  WHEAT: 'https://dir.tridge.com/prices/wheat/KE',
  MAIZE: 'https://dir.tridge.com/prices/maize/KE',
  CORN: 'https://dir.tridge.com/prices/corn/KE',
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export async function scrapeTridgePrice(commodity: 'WHEAT' | 'MAIZE' | 'CORN'): Promise<TridgePrice | null> {
  try {
    const url = TRIDGE_URLS[commodity];
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Try to find price information from the page
    // Tridge pages have various selectors, we'll try common ones
    let price: number | null = null;
    const market = 'Kenya';
    let currency = 'USD';
    
    // Look for price in common selectors
    const priceSelectors = [
      '.price-value',
      '.current-price',
      '[data-testid="price-value"]',
      '.price',
    ];

    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        // Extract numeric value from text like "$280.50" or "280.50 USD"
        const match = priceText.match(/[\d,]+\.?\d*/);
        if (match) {
          price = parseFloat(match[0].replace(/,/g, ''));
          
          // Try to extract currency
          if (priceText.includes('USD') || priceText.includes('$')) {
            currency = 'USD';
          }
          break;
        }
      }
    }

    if (price && price > 0) {
      return {
        commodity,
        price,
        currency,
        market,
        date: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error scraping Tridge for ${commodity}:`, error);
    return null;
  }
}

export async function scrapeTridgePrices(commodities: Array<'WHEAT' | 'MAIZE' | 'CORN'>): Promise<TridgePrice[]> {
  const results = await Promise.allSettled(
    commodities.map(commodity => scrapeTridgePrice(commodity))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<TridgePrice> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}

// Mock data for development/testing
export function getMockTridgePrice(commodity: 'WHEAT' | 'MAIZE' | 'CORN'): TridgePrice {
  const mockPrices = {
    WHEAT: 285.50,
    MAIZE: 225.75,
    CORN: 225.75,
  };

  return {
    commodity,
    price: mockPrices[commodity],
    currency: 'USD',
    market: 'Nairobi',
    date: new Date().toISOString(),
  };
}
