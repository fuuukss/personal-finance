"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Home, List, Plus, Settings } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Navigation({ dictionary, onAdd }: { dictionary: Dictionary; onAdd: () => void }) {
  const pathname = usePathname();
  const items = [
    ["/", dictionary.home, Home], ["/accounts", dictionary.accounts, CreditCard],
    ["/transactions", dictionary.transactions, List], ["/statistics", dictionary.statistics, BarChart3],
    ["/settings", dictionary.settings, Settings]
  ] as const;
  return <>
    <nav className="nav" aria-label="Main navigation">
      {items.map(([href, label, Icon]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
          <span className="nav-icon"><Icon size={20} strokeWidth={active ? 2.4 : 1.8} /><NavigationPendingIndicator /></span><span>{label}</span>
        </Link>;
      })}
    </nav>
    <button className="fab" type="button" onClick={onAdd} aria-label={dictionary.addTransaction}><Plus size={28} /></button>
  </>;
}

function NavigationPendingIndicator() {
  const { pending } = useLinkStatus();
  return <span className={`nav-pending ${pending ? "visible" : ""}`} aria-hidden="true" />;
}
