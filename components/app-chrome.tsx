"use client";

import { useState } from "react";
import type { Account } from "@/lib/finance/types";
import type { Dictionary, Language } from "@/lib/i18n/dictionaries";
import { Navigation } from "@/components/navigation";
import { TransactionSheet } from "@/components/transaction-sheet";

interface Category { id: string; name: string; kind: string; color: string; }

export function AppChrome({ children, accounts, categories, dictionary, language }: {
  children: React.ReactNode; accounts: Account[]; categories: Category[]; dictionary: Dictionary; language: Language;
}) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    {children}
    <Navigation dictionary={dictionary} onAdd={() => setOpen(true)} />
    {open && <TransactionSheet accounts={accounts} categories={categories} dictionary={dictionary} language={language} onClose={() => setOpen(false)} />}
  </div>;
}
