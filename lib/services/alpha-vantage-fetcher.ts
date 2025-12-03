import axios from 'axios';

const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';

export interface AlphaVantagePrice {
  commodity: string;
  price: number;
  currency: string;
  date: string;
}

// Alpha Vantage commodity symbols (these are approximate mappings)
const COMMODITY_SYMBOLS = {
  WHEAT: 'WHEAT',
  MAIZE: 'CORN',
};

export async function fetchAlphaVantagePrice(
  commodity: 'WHEAT' | 'MAIZE',
  apiKey: string
): Promise<AlphaVantagePrice | null> {
  if (!apiKey) {
    return null;
  }

  try {
    const symbol = COMMODITY_SYMBOLS[commodity];
    
    // Alpha Vantage doesn't directly provide commodity prices in a simple way
    // This is a placeholder implementation that would need adjustment
    // based on the actual Alpha Vantage API structure for commodities
    const response = await axios.get(ALPHA_VANTAGE_API, {
      params: {
        function: 'COMMODITY',
        symbol: symbol,
        apikey: apiKey,
      },
      timeout: 10000,
    });

    // This would need to be adapted based on actual API response structure
    if (response.data && response.data['Global Quote']) {
      const quote = response.data['Global Quote'];
      return {
        commodity,
        price: parseFloat(quote['05. price']),
        currency: 'USD',
        date: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Alpha Vantage price for ${commodity}:`, error);
    return null;
  }
}

export async function fetchAlphaVantagePrices(
  commodities: Array<'WHEAT' | 'MAIZE'>,
  apiKey: string
): Promise<AlphaVantagePrice[]> {
  if (!apiKey) {
    return [];
  }

  const results = await Promise.allSettled(
    commodities.map(commodity => fetchAlphaVantagePrice(commodity, apiKey))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<AlphaVantagePrice> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}
