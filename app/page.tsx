import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center gap-8 p-8 max-w-2xl text-center">
        <div className="text-6xl mb-4">🌾🌽</div>
        
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Price Oracles
        </h1>
        
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
          Real-time Wheat & Maize Floor Price Oracles
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6 w-full">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Features
          </h2>
          <ul className="text-left space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="mr-2">✅</span>
              <span>Multi-source price fetching with automatic fallback</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✅</span>
              <span>Real-time data from Alpha Vantage, Tridge, and World Bank</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✅</span>
              <span>RESTful API endpoints for integration</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✅</span>
              <span>Interactive dashboard with auto-refresh</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✅</span>
              <span>Historical price storage with Drizzle ORM</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link
            href="/dashboard"
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            View Dashboard
          </Link>
          <Link
            href="/api/oracle/wheat-maize"
            className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-semibold border-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-500 transition-colors text-center"
          >
            API Docs
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          <p>Built with Next.js 15, TypeScript, and Tailwind CSS</p>
        </div>
      </main>
    </div>
  );
}
