import { PriceData, DataSource } from '../types';
import { scrapeTridgePrices, getMockTridgePrice } from '../scrapers/tridge-scraper';
import { 
  scrapeKamisWheatMaizePrices, 
  scrapeKamisFlourPrices,
  convertKamisPriceToUSD, 
  getMockKamisPrices,
  getMockKamisFlourPrices 
} from '../scrapers/kamis-scraper';
import { fetchWorldBankPrices } from './world-bank-fetcher';
import { fetchAlphaVantagePrices } from './alpha-vantage-fetcher';

// Fallback prices (static prices as last resort)
const FALLBACK_PRICES: Record<string, number> = {
  WHEAT: 280,
  MAIZE: 220,
  'WHEAT FLOUR': 650, // USD per MT
  'MAIZE FLOUR': 480, // USD per MT
};

export interface FetchOptions {
  commodity?: 'WHEAT' | 'MAIZE' | 'WHEAT FLOUR' | 'MAIZE FLOUR';
  historical?: boolean;
  useMockTridge?: boolean;
  useMockKamis?: boolean;
  includeFlour?: boolean;
}

export async function fetchWheatMaizePrices(options: FetchOptions = {}): Promise<PriceData[]> {
  // Determine which commodities to fetch
  let commodities: string[] = [];
  
  if (options.commodity) {
    commodities = [options.commodity];
  } else if (options.includeFlour) {
    commodities = ['WHEAT', 'MAIZE', 'WHEAT FLOUR', 'MAIZE FLOUR'];
  } else {
    commodities = ['WHEAT', 'MAIZE'];
  }
  
  const results: PriceData[] = [];
  const useMockTridge = options.useMockTridge || process.env.USE_MOCK_TRIDGE === 'true';
  const useMockKamis = options.useMockKamis || process.env.USE_MOCK_KAMIS === 'true';

  // Separate flour and grain commodities
  const flourCommodities = commodities.filter(c => c.includes('FLOUR'));
  const grainCommodities = commodities.filter(c => !c.includes('FLOUR')) as Array<'WHEAT' | 'MAIZE'>;

  // Try each data source in priority order for grain commodities
  // 1. Alpha Vantage (if API key configured) - only for grains
  if (process.env.ALPHA_VANTAGE_KEY && grainCommodities.length > 0) {
    try {
      const alphaPrices = await fetchAlphaVantagePrices(grainCommodities, process.env.ALPHA_VANTAGE_KEY);
      for (const alphaPrice of alphaPrices) {
        results.push({
          commodity: alphaPrice.commodity,
          price: alphaPrice.price,
          currency: alphaPrice.currency,
          timestamp: alphaPrice.date,
          source: DataSource.ALPHA_VANTAGE,
          unit: 'MT',
          productType: 'grain',
        });
      }
    } catch {
      console.log('Alpha Vantage fetch failed, continuing to next source');
    }
  }

  // 2. Kamis - Kenya Agricultural Market Information System
  // Fetch flour prices from Kamis
  if (flourCommodities.length > 0) {
    try {
      let kamisFlourPrices;
      
      if (useMockKamis) {
        kamisFlourPrices = getMockKamisFlourPrices();
      } else {
        kamisFlourPrices = await scrapeKamisFlourPrices();
      }

      for (const flourCommodity of flourCommodities) {
        if (!results.find(r => r.commodity === flourCommodity)) {
          const matchingPrices = kamisFlourPrices.filter(p => p.commodity === flourCommodity);
          
          // Get the first matching price (typically from Nairobi or main market)
          const matchingPrice = matchingPrices[0];
          
          if (matchingPrice) {
            const convertedPrice = convertKamisPriceToUSD(matchingPrice);
            
            results.push({
              commodity: convertedPrice.commodity,
              price: convertedPrice.price,
              currency: convertedPrice.currency,
              timestamp: convertedPrice.date,
              source: DataSource.KAMIS,
              market: convertedPrice.market,
              unit: 'MT',
              productType: 'flour',
            });
          }
        }
      }
    } catch {
      console.log('Kamis flour fetch failed, continuing to next source');
    }
  }

  // Fetch grain prices from Kamis
  for (const commodity of grainCommodities) {
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
            productType: 'grain',
          });
        }
      } catch {
        console.log(`Kamis fetch failed for ${commodity}, continuing to next source`);
      }
    }
  }

  // 3. Tridge.com - Kenya-specific market prices (only for grains)
  for (const commodity of grainCommodities) {
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
            productType: 'grain',
          });
        }
      } catch {
        console.log(`Tridge fetch failed for ${commodity}, continuing to next source`);
      }
    }
  }

  // 4. World Bank Pink Sheet - Monthly commodity data (only for grains)
  for (const commodity of grainCommodities) {
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
            productType: 'grain',
          });
        }
      } catch {
        console.log(`World Bank fetch failed for ${commodity}, continuing to next source`);
      }
    }
  }

  // 5. Fallback prices - Static prices as last resort
  for (const commodity of commodities) {
    if (!results.find(r => r.commodity === commodity) && FALLBACK_PRICES[commodity]) {
      results.push({
        commodity,
        price: FALLBACK_PRICES[commodity],
        currency: 'USD',
        timestamp: new Date().toISOString(),
        source: DataSource.FALLBACK,
        unit: 'MT',
        productType: commodity.includes('FLOUR') ? 'flour' : 'grain',
      });
    }
  }

  return results;
}

/**
 * Fetches only flour prices from Kenyan markets
 */
export async function fetchFlourPrices(options: Omit<FetchOptions, 'commodity' | 'includeFlour'> = {}): Promise<PriceData[]> {
  const wheatFlourPrices = await fetchWheatMaizePrices({ 
    ...options, 
    commodity: 'WHEAT FLOUR' 
  });
  
  const maizeFlourPrices = await fetchWheatMaizePrices({ 
    ...options, 
    commodity: 'MAIZE FLOUR' 
  });
  
  return [...wheatFlourPrices, ...maizeFlourPrices];
}

export async function fetchSingleCommodityPrice(commodity: 'WHEAT' | 'MAIZE'): Promise<PriceData | null> {
  const prices = await fetchWheatMaizePrices({ commodity });
  return prices.length > 0 ? prices[0] : null;
}
