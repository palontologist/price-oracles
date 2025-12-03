import { PriceData, DataSource } from '../types';
import { scrapeTridgePrices, getMockTridgePrice } from '../scrapers/tridge-scraper';
import { scrapeKamisWheatMaizePrices, convertKamisPriceToUSD, getMockKamisPrices } from '../scrapers/kamis-scraper';
import { fetchWorldBankPrices } from './world-bank-fetcher';
import { fetchAlphaVantagePrices } from './alpha-vantage-fetcher';

// Fallback prices (static prices as last resort)
const FALLBACK_PRICES = {
  WHEAT: 280,
  MAIZE: 220,
};

export interface FetchOptions {
  commodity?: 'WHEAT' | 'MAIZE';
  historical?: boolean;
  useMockTridge?: boolean;
  useMockKamis?: boolean;
}

export async function fetchWheatMaizePrices(options: FetchOptions = {}): Promise<PriceData[]> {
  const commodities: Array<'WHEAT' | 'MAIZE'> = options.commodity 
    ? [options.commodity] 
    : ['WHEAT', 'MAIZE'];
  
  const results: PriceData[] = [];
  const useMockTridge = options.useMockTridge || process.env.USE_MOCK_TRIDGE === 'true';
  const useMockKamis = options.useMockKamis || process.env.USE_MOCK_KAMIS === 'true';

  // Try each data source in priority order
  // 1. Alpha Vantage (if API key configured)
  if (process.env.ALPHA_VANTAGE_KEY) {
    try {
      const alphaPrices = await fetchAlphaVantagePrices(commodities, process.env.ALPHA_VANTAGE_KEY);
      for (const alphaPrice of alphaPrices) {
        results.push({
          commodity: alphaPrice.commodity,
          price: alphaPrice.price,
          currency: alphaPrice.currency,
          timestamp: alphaPrice.date,
          source: DataSource.ALPHA_VANTAGE,
          unit: 'MT',
        });
      }
    } catch {
      console.log('Alpha Vantage fetch failed, continuing to next source');
    }
  }

  // 2. Kamis - Kenya Agricultural Market Information System (Local Kenyan prices)
  for (const commodity of commodities) {
    if (!results.find(r => r.commodity === commodity)) {
      try {
        let kamisPrices;
        
        if (useMockKamis) {
          kamisPrices = getMockKamisPrices();
        } else {
          kamisPrices = await scrapeKamisWheatMaizePrices();
        }

        const matchingPrice = kamisPrices.find(p => p.commodity === commodity);
        if (matchingPrice) {
          // Convert Kamis price (KES/KG or KES/BAG) to USD/MT
          const convertedPrice = convertKamisPriceToUSD(matchingPrice);
          
          results.push({
            commodity: convertedPrice.commodity,
            price: convertedPrice.price,
            currency: convertedPrice.currency,
            timestamp: convertedPrice.date,
            source: DataSource.KAMIS,
            market: convertedPrice.market,
            unit: 'MT',
          });
        }
      } catch {
        console.log(`Kamis fetch failed for ${commodity}, continuing to next source`);
      }
    }
  }

  // 3. Tridge.com - Kenya-specific market prices
  for (const commodity of commodities) {
    if (!results.find(r => r.commodity === commodity)) {
      try {
        let tridgePrice;
        
        if (useMockTridge) {
          tridgePrice = getMockTridgePrice(commodity);
        } else {
          const tridgePrices = await scrapeTridgePrices([commodity]);
          tridgePrice = tridgePrices.find(p => p.commodity === commodity);
        }

        if (tridgePrice) {
          results.push({
            commodity: tridgePrice.commodity,
            price: tridgePrice.price,
            currency: tridgePrice.currency,
            timestamp: tridgePrice.date,
            source: DataSource.TRIDGE,
            market: tridgePrice.market,
            unit: 'MT',
          });
        }
      } catch {
        console.log(`Tridge fetch failed for ${commodity}, continuing to next source`);
      }
    }
  }

  // 4. World Bank Pink Sheet - Monthly commodity data
  for (const commodity of commodities) {
    if (!results.find(r => r.commodity === commodity)) {
      try {
        const worldBankPrices = await fetchWorldBankPrices([commodity]);
        const worldBankPrice = worldBankPrices.find(p => p.commodity === commodity);

        if (worldBankPrice) {
          results.push({
            commodity: worldBankPrice.commodity,
            price: worldBankPrice.price,
            currency: worldBankPrice.currency,
            timestamp: new Date().toISOString(),
            source: DataSource.WORLD_BANK,
            unit: 'MT',
          });
        }
      } catch {
        console.log(`World Bank fetch failed for ${commodity}, continuing to next source`);
      }
    }
  }

  // 5. Fallback prices - Static prices as last resort
  for (const commodity of commodities) {
    if (!results.find(r => r.commodity === commodity)) {
      results.push({
        commodity,
        price: FALLBACK_PRICES[commodity],
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: DataSource.FALLBACK,
        unit: 'MT',
      });
    }
  }

  return results;
}

export async function fetchSingleCommodityPrice(commodity: 'WHEAT' | 'MAIZE'): Promise<PriceData | null> {
  const prices = await fetchWheatMaizePrices({ commodity });
  return prices.length > 0 ? prices[0] : null;
}
