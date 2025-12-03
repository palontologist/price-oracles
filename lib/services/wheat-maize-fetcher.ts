import { PriceData, DataSource } from '../types';
import { scrapeTridgePrices, getMockTridgePrice } from '../scrapers/tridge-scraper';
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
}

export async function fetchWheatMaizePrices(options: FetchOptions = {}): Promise<PriceData[]> {
  const commodities: Array<'WHEAT' | 'MAIZE'> = options.commodity 
    ? [options.commodity] 
    : ['WHEAT', 'MAIZE'];
  
  const results: PriceData[] = [];
  const useMockTridge = options.useMockTridge || process.env.USE_MOCK_TRIDGE === 'true';

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

  // 2. Tridge.com - Kenya-specific market prices
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

  // 3. World Bank Pink Sheet - Monthly commodity data
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

  // 4. Fallback prices - Static prices as last resort
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
