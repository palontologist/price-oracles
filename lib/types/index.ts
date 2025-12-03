export enum CommodityCode {
  WHEAT = 'WHEAT',
  MAIZE = 'MAIZE',
  CORN = 'CORN', // Alias for MAIZE
  WHEAT_FLOUR = 'WHEAT FLOUR',
  MAIZE_FLOUR = 'MAIZE FLOUR',
}

export enum Region {
  AFRICA = 'AFRICA',
  LATAM = 'LATAM',
  KENYA = 'KENYA',
}

export enum DataSource {
  ALPHA_VANTAGE = 'Alpha Vantage',
  KAMIS = 'Kamis',
  TRIDGE = 'Tridge',
  WORLD_BANK = 'World Bank',
  FALLBACK = 'Fallback',
}

export interface PriceData {
  commodity: string;
  price: number;
  currency: string;
  timestamp: string;
  source: string;
  market?: string;
  unit?: string;
  productType?: 'flour' | 'grain';
}

export interface OracleResponse {
  success: boolean;
  data: PriceData[];
  timestamp: string;
  sources: string[];
  note?: string;
  error?: string;
}

export interface LivePriceRequest {
  symbols?: string[];
  region?: Region;
}

export interface TridgePrice {
  commodity: string;
  price: number;
  currency: string;
  market: string;
  date: string;
}

export interface WorldBankPrice {
  commodity: string;
  price: number;
  currency: string;
  date: string;
}
