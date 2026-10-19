import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Landmark, PiggyBank, WalletCards, type LucideIcon } from "lucide-react";
import type { AccountKind, EventType } from "@/lib/finance/types";

export const accountIcons: Record<AccountKind, LucideIcon> = { cash: WalletCards, bank: Landmark, savings: PiggyBank, investment: ArrowUpRight };
export const eventIcons: Partial<Record<EventType, LucideIcon>> = { expense: ArrowUpRight, income: ArrowDownLeft, transfer: ArrowLeftRight, currency_conversion: ArrowLeftRight, investment_contribution: ArrowLeftRight, investment_withdrawal: ArrowLeftRight };
