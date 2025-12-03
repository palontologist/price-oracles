'use client';

import { useEffect, useState } from 'react';

interface FlourPriceData {
  commodity: string;
  market: string;
  priceKES: number;
  pricePerKgKES: number;
  priceUSD: number;
  pricePerMtUSD: number;
  unit: string;
  date: string;
}

interface FlourApiResponse {
  success: boolean;
  data: FlourPriceData[];
  timestamp: string;
  source: string;
  exchangeRate?: number;
  note?: string;
  error?: string;
}

export default function Dashboard() {
  const [prices, setPrices] = useState<FlourPriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(154);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch flour prices from the new Kenya flour endpoint
      const response = await fetch('/api/oracle/kenya-flour');
      const data: FlourApiResponse = await response.json();

      if (data.success) {
        setPrices(data.data);
        setLastUpdated(new Date().toLocaleString());
        if (data.exchangeRate) {
          setExchangeRate(data.exchangeRate);
        }
      } else {
        setError(data.error || 'Failed to fetch prices');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Error fetching prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchPrices();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getCommodityIcon = (commodity: string) => {
    if (commodity.includes('WHEAT')) return '🌾';
    if (commodity.includes('MAIZE') || commodity.includes('CORN')) return '🌽';
    return '📊';
  };

  // Group prices by commodity type
  const wheatFlourPrices = prices.filter(p => p.commodity === 'WHEAT FLOUR');
  const maizeFlourPrices = prices.filter(p => p.commodity === 'MAIZE FLOUR');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🇰🇪 Kenya Flour Prices
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Real-time Wheat Flour & Maize Flour Prices from KAMIS
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Exchange Rate: 1 USD = {exchangeRate} KES
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchPrices}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-refresh (60s)
              </span>
            </label>
          </div>

          {lastUpdated && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && prices.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading flour prices...</p>
          </div>
        ) : (
          <>
            {/* Wheat Flour Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🌾</span> Wheat Flour (Unga wa Ngano)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {wheatFlourPrices.map((price, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow border-l-4 border-amber-500"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        📍 {price.market}
                      </p>
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        KAMIS
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Main Price in KES */}
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                          {price.priceKES.toFixed(0)}
                        </span>
                        <span className="text-lg text-gray-600 dark:text-gray-300">
                          KES
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        per {price.unit} packet
                      </div>

                      {/* Price per KG */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{price.pricePerKgKES.toFixed(0)} KES</span> per kg
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maize Flour Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">🌽</span> Maize Flour (Unga wa Mahindi)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {maizeFlourPrices.map((price, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow border-l-4 border-yellow-500"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        📍 {price.market}
                      </p>
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        KAMIS
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* Main Price in KES */}
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                          {price.priceKES.toFixed(0)}
                        </span>
                        <span className="text-lg text-gray-600 dark:text-gray-300">
                          KES
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        per {price.unit} packet
                      </div>

                      {/* Price per KG */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{price.pricePerKgKES.toFixed(0)} KES</span> per kg
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-green-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            📊 About This Data
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Source:</strong> KAMIS (Kenya Agricultural Market Information System) - 
              <a href="https://kamis.kilimo.go.ke/site/market" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline ml-1">
                kamis.kilimo.go.ke
              </a>
            </p>
            <p>
              <strong>Wheat Flour (Unga wa Ngano):</strong> Used for chapati, mandazi, bread, cakes
            </p>
            <p>
              <strong>Maize Flour (Unga wa Mahindi):</strong> Used for ugali, uji (porridge)
            </p>
            <p className="text-xs mt-3 text-gray-500">
              Prices shown are for standard 2kg packets. Prices may vary by brand and retailer.
            </p>
          </div>
        </div>

        {/* API Info */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            🔌 API Endpoints
          </h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                GET
              </span>
              <code className="text-gray-700 dark:text-gray-300">/api/oracle/kenya-flour</code>
              <span className="text-gray-500 text-xs">- All flour prices</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                GET
              </span>
              <code className="text-gray-700 dark:text-gray-300">/api/oracle/kenya-flour?commodity=wheat-flour</code>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                GET
              </span>
              <code className="text-gray-700 dark:text-gray-300">/api/oracle/kenya-flour?commodity=maize-flour</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
