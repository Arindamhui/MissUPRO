import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { currencyStatusEnum, exchangeRateSourceEnum } from "./enums";
import { admins } from "./admin";

// ─── supported_currencies ───
export const supportedCurrencies = pgTable("supported_currencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  currencyCode: text("currency_code").notNull(),
  currencyName: text("currency_name").notNull(),
  currencySymbol: text("currency_symbol").notNull(),
  decimalPlaces: integer("decimal_places").default(2).notNull(),
  status: currencyStatusEnum("status").default("ACTIVE").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("supported_currencies_code_idx").on(t.currencyCode),
  index("supported_currencies_status_order_idx").on(t.status, t.displayOrder),
]);

// ─── exchange_rates ───
export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  baseCurrency: text("base_currency").default("USD").notNull(),
  targetCurrency: text("target_currency").notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  inverseRate: decimal("inverse_rate", { precision: 18, scale: 8 }).notNull(),
  source: exchangeRateSourceEnum("source").notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("exchange_rates_pair_active_idx").on(t.baseCurrency, t.targetCurrency, t.isActive, t.effectiveFrom),
  index("exchange_rates_target_active_effective_idx").on(t.targetCurrency, t.isActive, t.effectiveFrom),
]);

// ─── region_pricing (coin package prices per region) ───
export const regionPricing = pgTable("region_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  coinPackageId: uuid("coin_package_id").notNull(),
  countryCode: text("country_code").notNull(),
  currencyCode: text("currency_code").notNull(),
  localPrice: decimal("local_price", { precision: 14, scale: 2 }).notNull(),
  usdEquivalent: decimal("usd_equivalent", { precision: 14, scale: 4 }).notNull(),
  taxRateBps: integer("tax_rate_bps").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("region_pricing_package_country_effective_idx").on(t.coinPackageId, t.countryCode, t.effectiveFrom),
  index("region_pricing_country_active_idx").on(t.countryCode, t.isActive),
  index("region_pricing_package_active_idx").on(t.coinPackageId, t.isActive),
]);

// ─── coin_diamond_conversion_rates ───
export const coinDiamondConversionRates = pgTable("coin_diamond_conversion_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  coinsPerDiamond: integer("coins_per_diamond").notNull(),
  diamondValueUsd: decimal("diamond_value_usd", { precision: 10, scale: 4 }).notNull(),
  coinValueUsd: decimal("coin_value_usd", { precision: 10, scale: 6 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("coin_diamond_conversion_active_effective_idx").on(t.isActive, t.effectiveFrom),
]);

// ─── Relations ───
export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
  updatedBy: one(admins, { fields: [exchangeRates.updatedByAdminId], references: [admins.id] }),
}));

export const regionPricingRelations = relations(regionPricing, ({ one }) => ({
  updatedBy: one(admins, { fields: [regionPricing.updatedByAdminId], references: [admins.id] }),
}));

export const coinDiamondConversionRatesRelations = relations(coinDiamondConversionRates, ({ one }) => ({
  updatedBy: one(admins, { fields: [coinDiamondConversionRates.updatedByAdminId], references: [admins.id] }),
}));
