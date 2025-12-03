import axios from 'axios';
import { WorldBankPrice } from '../types';

const WORLD_BANK_API = 'https://api.worldbank.org/v2/sources/40/data';

// World Bank commodity codes
const COMMODITY_CODES = {
  WHEAT: 'PWHEAMT',
  MAIZE: 'PMAIZMT',
};

export async function fetchWorldBankPrice(commodity: 'WHEAT' | 'MAIZE'): Promise<WorldBankPrice | null> {
  try {
    const commodityCode = COMMODITY_CODES[commodity];
    const url = `${WORLD_BANK_API}/${commodityCode}`;
    
    const response = await axios.get(url, {
      params: {
        format: 'json',
        per_page: 1,
        date: 'MRV', // Most Recent Value
      },
      timeout: 10000,
    });

    const data = response.data;
    
    if (Array.isArray(data) && data.length > 1) {
      const priceData = data[1];
      
      if (priceData && priceData.length > 0) {
        const latest = priceData[0];
        
        return {
          commodity,
          price: parseFloat(latest.value),
          currency: 'USD',
          date: latest.date,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching World Bank price for ${commodity}:`, error);
    return null;
  }
}

export async function fetchWorldBankPrices(commodities: Array<'WHEAT' | 'MAIZE'>): Promise<WorldBankPrice[]> {
  const results = await Promise.allSettled(
    commodities.map(commodity => fetchWorldBankPrice(commodity))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<WorldBankPrice> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
}
