# Price Oracles

A Next.js 15 application for wheat and maize floor price oracles, providing real-time commodity prices from multiple data sources with automatic fallback.

## 🌾 Overview

This application fetches and displays real-time wheat and maize prices from multiple data sources:
- **Alpha Vantage** - Real-time market data (if API key configured)
- **Kamis (Kenya Agricultural Market Information System)** - Official Kenyan government agricultural market prices from https://kamis.kilimo.go.ke/site/market
- **Tridge.com** - Kenya-specific market prices
- **World Bank Pink Sheet** - Monthly commodity data
- **Fallback Prices** - Static baseline prices as last resort

The system automatically falls back through sources to ensure price availability.

## ✨ Features

- 🔄 Multi-source price fetching with automatic fallback
- 📊 RESTful API endpoints for integration
- 🖥️ Interactive dashboard with auto-refresh
- 💾 Historical price storage with Drizzle ORM and Turso/libSQL
- 🎨 Modern UI with Tailwind CSS
- ⚡ Built with Next.js 15 and React 19
- 📱 Fully responsive design

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/palontologist/price-oracles.git
cd price-oracles
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:
```env
# Alpha Vantage API Key (optional - for stock/commodity price data)
ALPHA_VANTAGE_KEY=your_api_key_here

# Database Configuration (Turso/libSQL)
DATABASE_URL=your_database_url
DATABASE_AUTH_TOKEN=your_auth_token

# Development/Testing Options
USE_MOCK_TRIDGE=true  # Set to true for development without scraping
USE_MOCK_KAMIS=true   # Set to true for development with mock Kamis data

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 API Documentation

### Endpoints

#### GET `/api/oracle/wheat-maize`

Fetch current wheat and maize prices with automatic fallback through multiple sources.

**Query Parameters:**
- `commodity` (optional): `WHEAT` or `MAIZE` - Filter by specific commodity
- `source` (optional): `tridge` - Prefer specific source
- `historical` (optional): `true` or `false` - Include historical data

**Example Request:**
```bash
curl http://localhost:3000/api/oracle/wheat-maize?commodity=WHEAT
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "commodity": "WHEAT",
      "price": 285.50,
      "currency": "USD",
      "timestamp": "2025-12-03T08:13:00.000Z",
      "source": "Tridge",
      "market": "Nairobi",
      "unit": "MT"
    },
    {
      "commodity": "MAIZE",
      "price": 225.75,
      "currency": "USD",
      "timestamp": "2025-12-03T08:13:00.000Z",
      "source": "Tridge",
      "market": "Nairobi",
      "unit": "MT"
    }
  ],
  "timestamp": "2025-12-03T08:13:00.000Z",
  "sources": ["Alpha Vantage", "Tridge", "World Bank", "Fallback"],
  "note": "Prices automatically fallback through multiple sources"
}
```

#### POST `/api/oracle/wheat-maize`

Store price data to the database.

**Request Body:**
```json
{
  "commodity": "WHEAT",
  "price": 285.50,
  "currency": "USD",
  "source": "Tridge",
  "market": "Nairobi",
  "unit": "MT"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Price data stored successfully",
  "timestamp": "2025-12-03T08:13:00.000Z"
}
```

#### GET `/api/live-prices`

Fetch live prices for commodities with optional filtering.

**Query Parameters:**
- `symbols` (optional): Comma-separated list (e.g., `WHEAT,MAIZE`)
- `region` (optional): `AFRICA` or `LATAM`

**Example Request:**
```bash
curl http://localhost:3000/api/live-prices?symbols=WHEAT&region=AFRICA
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "commodity": "WHEAT",
      "price": 285.50,
      "currency": "USD",
      "timestamp": "2025-12-03T08:13:00.000Z",
      "source": "Tridge",
      "unit": "MT"
    }
  ],
  "timestamp": "2025-12-03T08:13:00.000Z",
  "count": 1
}
```

## 🗄️ Database Setup

This application uses Drizzle ORM with Turso/libSQL for data persistence.

### Schema

The database includes three main tables:

1. **commodities** - Commodity definitions (WHEAT, MAIZE)
2. **markets** - Market information (Nairobi, etc.)
3. **commodity_prices** - Historical price records

### Database Commands

```bash
# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes directly
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## 🎨 Frontend

The application includes:

- **Home Page** (`/`) - Landing page with feature overview
- **Dashboard** (`/dashboard`) - Interactive price dashboard with:
  - Real-time price display
  - Auto-refresh functionality (60s interval)
  - Manual refresh button
  - Source information
  - Price history

## 🏗️ Project Structure

```
price-oracles/
├── app/
│   ├── api/
│   │   ├── oracle/
│   │   │   └── wheat-maize/
│   │   │       └── route.ts          # Oracle API endpoint
│   │   └── live-prices/
│   │       └── route.ts               # Live prices endpoint
│   ├── dashboard/
│   │   └── page.tsx                   # Dashboard page
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Home page
│   └── globals.css                    # Global styles
├── lib/
│   ├── db/
│   │   ├── schema.ts                  # Database schema
│   │   └── index.ts                   # Database client
│   ├── scrapers/
│   │   ├── kamis-scraper.ts           # Kamis (Kenya Ag Market) scraper
│   │   └── tridge-scraper.ts          # Tridge.com scraper
│   ├── services/
│   │   ├── alpha-vantage-fetcher.ts   # Alpha Vantage API
│   │   ├── world-bank-fetcher.ts      # World Bank API
│   │   └── wheat-maize-fetcher.ts     # Main fetcher with fallback
│   ├── types/
│   │   └── index.ts                   # TypeScript types
│   └── live-prices.ts                 # Live prices service
├── .env.example                       # Environment variables template
├── drizzle.config.ts                  # Drizzle ORM configuration
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
└── README.md                          # This file
```

## 🔧 Configuration

### Environment Variables

- `ALPHA_VANTAGE_KEY` - API key for Alpha Vantage (optional)
- `DATABASE_URL` - Turso/libSQL database URL
- `DATABASE_AUTH_TOKEN` - Database authentication token
- `USE_MOCK_TRIDGE` - Use mock data instead of scraping Tridge (development)
- `USE_MOCK_KAMIS` - Use mock data instead of scraping Kamis (development)
- `NEXT_PUBLIC_API_URL` - Public API URL for client-side calls

### Data Sources

**Kamis (Kenya Agricultural Market Information System):**
- URL: `https://kamis.kilimo.go.ke/site/market`
- Official Kenyan government agricultural market prices
- Provides real-time prices across multiple Kenyan markets
- Currency: KES (Kenyan Shilling), auto-converted to USD/MT

**Tridge URLs:**
- Wheat: `https://dir.tridge.com/prices/wheat/KE`
- Maize: `https://dir.tridge.com/prices/maize/KE` and `/corn/KE`

**World Bank Commodity Codes:**
- Wheat: `PWHEAMT`
- Maize: `PMAIZMT`

**Fallback Prices:**
- Wheat: 280 USD/MT
- Maize: 220 USD/MT

## 🧪 Development

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

### Linting

```bash
npm run lint
```

## 📦 Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Drizzle ORM with Turso/libSQL
- **HTTP Client:** Axios
- **HTML Parsing:** Cheerio
- **Validation:** Zod
- **Runtime:** React 19

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Data sources: Alpha Vantage, Tridge.com, World Bank
- Built with Next.js and the Vercel ecosystem
- Inspired by the need for transparent commodity pricing in African markets
