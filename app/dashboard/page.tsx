'use client';

import { useEffect, useState } from 'react';
import { PriceData } from '@/lib/types';

export default function Dashboard() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/oracle/wheat-maize');
      const data = await response.json();

      if (data.success) {
        setPrices(data.data);
        setLastUpdated(new Date().toLocaleString());
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
    if (commodity === 'WHEAT') return '🌾';
    if (commodity === 'MAIZE' || commodity === 'CORN') return '🌽';
    return '📊';
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Alpha Vantage':
        return 'bg-blue-100 text-blue-800';
      case 'Tridge':
        return 'bg-green-100 text-green-800';
      case 'World Bank':
        return 'bg-purple-100 text-purple-800';
      case 'Fallback':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🌾 Commodity Price Oracles
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Real-time Wheat & Maize Floor Prices
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchPrices}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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

        {/* Price Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading && prices.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading prices...</p>
            </div>
          ) : (
            prices.map((price, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{getCommodityIcon(price.commodity)}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {price.commodity}
                      </h2>
                      {price.market && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          📍 {price.market}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getSourceColor(
                      price.source
                    )}`}
                  >
                    {price.source}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {price.price.toFixed(2)}
                    </span>
                    <span className="text-xl text-gray-600 dark:text-gray-300">
                      {price.currency}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    per {price.unit || 'MT'} (Metric Ton)
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Updated: {new Date(price.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            📊 Data Sources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 font-bold">1.</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Alpha Vantage</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Real-time market data</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 font-bold">2.</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Tridge</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Kenya market prices</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-purple-600 font-bold">3.</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">World Bank</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Monthly commodity data</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-600 font-bold">4.</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Fallback</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs">Static baseline prices</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
            Prices automatically fallback through multiple sources to ensure availability.
          </p>
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
              <code className="text-gray-700 dark:text-gray-300">/api/oracle/wheat-maize</code>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">
                GET
              </span>
              <code className="text-gray-700 dark:text-gray-300">/api/live-prices</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
