import { z } from "zod";
import Decimal from "decimal.js";

const date = z.iso.date();
const uuid = z.uuid();
const amount = z.string().trim().regex(/^-?\d{1,18}([.,]\d{1,6})?$/).transform((value) => value.replace(",", "."));
const positiveAmount = amount.refine((value) => new Decimal(value).isPositive(), "Amount must be positive");
const nonZeroAmount = amount.refine((value) => !new Decimal(value).isZero(), "Amount must not be zero");

export const eventSchema = z.object({
  eventType: z.enum(["expense", "income"]),
  accountId: uuid,
  categoryId: uuid,
  amount: positiveAmount,
  effectiveDate: date,
  description: z.string().trim().max(500).optional().default(""),
  idempotencyKey: uuid
});

export const transferSchema = z.object({
  sourceAccountId: uuid,
  destinationAccountId: uuid,
  sourceAmount: positiveAmount,
  destinationAmount: positiveAmount,
  effectiveDate: date,
  description: z.string().trim().max(500).optional().default(""),
  idempotencyKey: uuid
}).refine((value) => value.sourceAccountId !== value.destinationAccountId, {
  message: "Accounts must differ", path: ["destinationAccountId"]
});

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  kind: z.enum(["cash", "bank", "savings", "investment"]),
  openingBalance: amount.default("0"),
  startDate: date
});

export const categorySchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(1).max(60),
  kind: z.enum(["expense", "income"]), color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const valuationSchema = z.object({
  accountId: uuid, amount: z.string().trim().regex(/^\d{1,18}([.,]\d{1,6})?$/).transform((v) => v.replace(",", ".")),
  valuationDate: date, note: z.string().trim().max(500).optional().default("")
});

export const adjustmentSchema = z.object({
  accountId: uuid,
  targetBalance: amount,
  effectiveDate: date,
  description: z.string().trim().max(500).optional().default("")
});

export const updateEventSchema = z.object({
  id: uuid,
  accountId: uuid,
  amount: nonZeroAmount,
  categoryId: z.union([uuid, z.literal("")]).transform((value) => value || null),
  effectiveDate: date,
  description: z.string().trim().max(500).optional().default(""),
  expectedUpdatedAt: z.iso.datetime({ offset: true })
});
