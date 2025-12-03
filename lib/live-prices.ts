import { PriceData, Region } from './types';
import { fetchWheatMaizePrices, fetchFlourPrices } from './services/wheat-maize-fetcher';

export interface LivePriceOptions {
  symbols?: string[];
  region?: Region;
  includeFlour?: boolean;
}

type ValidCommodity = 'WHEAT' | 'MAIZE' | 'WHEAT FLOUR' | 'MAIZE FLOUR';

export async function fetchLivePrices(options: LivePriceOptions = {}): Promise<PriceData[]> {
  const { symbols, region, includeFlour } = options;

  // All supported commodities
  const allCommodities: ValidCommodity[] = ['WHEAT', 'MAIZE', 'WHEAT FLOUR', 'MAIZE FLOUR'];
  let commodities: ValidCommodity[] = includeFlour ? allCommodities : ['WHEAT', 'MAIZE'];
  
  if (symbols && symbols.length > 0) {
    commodities = symbols
      .map(s => {
        const upper = s.toUpperCase().trim();
        // Handle various input formats
        if (upper === 'CORN') return 'MAIZE';
        if (upper === 'WHEAT-FLOUR' || upper === 'WHEATFLOUR') return 'WHEAT FLOUR';
        if (upper === 'MAIZE-FLOUR' || upper === 'MAIZEFLOUR' || upper === 'CORN-FLOUR') return 'MAIZE FLOUR';
        return upper;
      })
      .filter((s): s is ValidCommodity => 
        allCommodities.includes(s as ValidCommodity)
      );
  }

  // Fetch prices for all commodities
  const allPrices: PriceData[] = [];
  
  for (const commodity of commodities) {
    const prices = await fetchWheatMaizePrices({ commodity });
    allPrices.push(...prices);
  }

  // Filter by region if specified
  if (region) {
    // For now, we're focused on AFRICA (Kenya), so we'll return all
    // In a more complex system, you'd filter based on market/region data
    return allPrices;
  }

  return allPrices;
}

export async function fetchLivePriceForSymbol(symbol: string): Promise<PriceData | null> {
  let normalizedSymbol = symbol.toUpperCase().trim();
  
  // Handle various input formats
  if (normalizedSymbol === 'CORN') normalizedSymbol = 'MAIZE';
  if (normalizedSymbol === 'WHEAT-FLOUR' || normalizedSymbol === 'WHEATFLOUR') normalizedSymbol = 'WHEAT FLOUR';
  if (normalizedSymbol === 'MAIZE-FLOUR' || normalizedSymbol === 'MAIZEFLOUR' || normalizedSymbol === 'CORN-FLOUR') normalizedSymbol = 'MAIZE FLOUR';
  
  const validCommodities: ValidCommodity[] = ['WHEAT', 'MAIZE', 'WHEAT FLOUR', 'MAIZE FLOUR'];
  
  if (!validCommodities.includes(normalizedSymbol as ValidCommodity)) {
    return null;
  }

  const commodity = normalizedSymbol as ValidCommodity;
  const prices = await fetchWheatMaizePrices({ commodity });
  
  return prices.length > 0 ? prices[0] : null;
}

/**
 * Fetches only Kenyan flour prices (wheat flour and maize flour)
 */
export async function fetchKenyanFlourPrices(): Promise<PriceData[]> {
  return fetchFlourPrices();
}
