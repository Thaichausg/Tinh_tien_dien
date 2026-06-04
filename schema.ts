import { pgTable, serial, integer, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Bills Table
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(), // format e.g. "06/2026" or "2026-06"
  totalAmount: integer("total_amount").notNull(), // Total bill amount in VND (including VAT)
  totalKwh: numeric("total_kwh", { precision: 10, scale: 2 }).notNull(), // Total kWh of main meter
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Household Usage Table (sub-meter readings for each household)
export const householdUsage = pgTable("household_usage", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  householdName: text("household_name").notNull(), // e.g. "Hộ Trệt", "Hộ Lầu"
  kwhUsed: numeric("kwh_used", { precision: 10, scale: 2 }).notNull(), // kWh consumed by this household
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships configuration for Drizzle Queries
export const billsRelations = relations(bills, ({ many }) => ({
  usages: many(householdUsage),
}));

export const householdUsageRelations = relations(householdUsage, ({ one }) => ({
  bill: one(bills, {
    fields: [householdUsage.billId],
    references: [bills.id],
  }),
}));
