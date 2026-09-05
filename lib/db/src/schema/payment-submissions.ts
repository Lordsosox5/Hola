import { createInsertSchema } from "drizzle-zod";
import { real, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const paymentSubmissionsTable = pgTable("payment_submissions", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(),
  paymentMethod: text("payment_method").notNull(),
  total: real("total").notNull(),
  transactionLast4: text("transaction_last4").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPaymentSubmissionSchema = createInsertSchema(
  paymentSubmissionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPaymentSubmission = z.infer<
  typeof insertPaymentSubmissionSchema
>;
export type PaymentSubmission = typeof paymentSubmissionsTable.$inferSelect;