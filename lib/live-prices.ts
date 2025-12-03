import { PriceData, Region } from './types';
import { fetchWheatMaizePrices } from './services/wheat-maize-fetcher';

export interface LivePriceOptions {
  symbols?: string[];
  region?: Region;
}

export async function fetchLivePrices(options: LivePriceOptions = {}): Promise<PriceData[]> {
  const { symbols, region } = options;

  // Filter commodities based on symbols if provided
  let commodities: Array<'WHEAT' | 'MAIZE'> = ['WHEAT', 'MAIZE'];
  
  if (symbols && symbols.length > 0) {
    commodities = symbols
      .map(s => s.toUpperCase())
      .filter(s => s === 'WHEAT' || s === 'MAIZE' || s === 'CORN')
      .map(s => s === 'CORN' ? 'MAIZE' : s) as Array<'WHEAT' | 'MAIZE'>;
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
  const normalizedSymbol = symbol.toUpperCase();
  
  if (normalizedSymbol !== 'WHEAT' && normalizedSymbol !== 'MAIZE' && normalizedSymbol !== 'CORN') {
    return null;
  }

  const commodity = normalizedSymbol === 'CORN' ? 'MAIZE' : normalizedSymbol as 'WHEAT' | 'MAIZE';
  const prices = await fetchWheatMaizePrices({ commodity });
  
  return prices.length > 0 ? prices[0] : null;
}
