import { sql } from 'drizzle-orm';
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

// Commodities table
export const commodities = sqliteTable('commodities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // WHEAT, MAIZE
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Markets table
export const markets = sqliteTable('markets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // Nairobi, Mombasa, etc.
  country: text('country').notNull(), // Kenya, etc.
  countryCode: text('country_code').notNull(), // KE
  region: text('region'), // AFRICA, LATAM
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Commodity prices table
export const commodityPrices = sqliteTable('commodity_prices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commodityId: integer('commodity_id')
    .notNull()
    .references(() => commodities.id),
  marketId: integer('market_id').references(() => markets.id),
  price: real('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  unit: text('unit').notNull().default('MT'), // Metric Ton
  source: text('source').notNull(), // Tridge, World Bank, Alpha Vantage, Fallback
  timestamp: text('timestamp').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type Commodity = typeof commodities.$inferSelect;
export type NewCommodity = typeof commodities.$inferInsert;
export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type CommodityPrice = typeof commodityPrices.$inferSelect;
export type NewCommodityPrice = typeof commodityPrices.$inferInsert;
