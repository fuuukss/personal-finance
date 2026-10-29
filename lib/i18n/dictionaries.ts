export type Language = "sr-Latn" | "en";

const sr = {
  appName: "Saldo",
  home: "Početna", accounts: "Računi", transactions: "Transakcije", statistics: "Statistika", settings: "Podešavanja",
  netWorth: "Ukupna neto vrednost", thisMonth: "Ovog meseca", expenses: "Troškovi", income: "Prihodi", difference: "Razlika",
  spendingMoney: "Novac za trošenje", unavailable: "Nedostupno", missingRates: "Nedostaju kursevi", staleRates: "Zastareli kursevi", incompleteMonthlySummary: "Mesečni zbir ne uključuje stavke bez istorijskog kursa.",
  allAccounts: "Svi računi", recentTransactions: "Nedavne transakcije", seeAll: "Prikaži sve", addTransaction: "Dodaj transakciju",
  expense: "Trošak", transfer: "Prenos", amount: "Iznos", category: "Kategorija", account: "Račun", description: "Opis", optional: "opciono", date: "Datum", save: "Sačuvaj",
  sourceAccount: "Izvorni račun", destinationAccount: "Odredišni račun", sourceAmount: "Iznos sa izvornog računa", receivedAmount: "Stvarno primljen iznos",
  name: "Naziv", currency: "Valuta", accountType: "Vrsta računa", cash: "Gotovina", bank: "Banka", savings: "Štednja", openingBalance: "Početno stanje", startDate: "Početni datum",
  noTransactions: "Još nema transakcija.", noAccounts: "Još nema računa.", addAccount: "Dodaj račun", archived: "Arhivirano",
  monthlyOverview: "Mesečni pregled", spendingByCategory: "Troškovi po kategoriji", cashFlow: "Tok novca", netWorthHistory: "Istorija neto vrednosti",
  yearlyView: "Godišnje", monthlyView: "Mesečno", annualIncome: "Godišnji prihodi", annualExpenses: "Godišnji troškovi", previousMonthComparison: "Promena troškova prema prethodnom mesecu", savingsChange: "Promena štednje", investmentValue: "IBKR vrednost", investmentResult: "Rezultat ulaganja", investmentHistory: "Istorija IBKR vrednosti", netWorthChange: "Promena neto imovine", noData: "Nema podataka za izabrani period.", reportOptions: "Opcije izveštaja",
  displayCurrency: "Valuta prikaza", language: "Jezik", security: "Bezbednost", logout: "Odjavi se", dataExport: "Izvoz podataka",
  estimate: "Procena na osnovu poslednjih sačuvanih kurseva", staleValuation: "Poslednja investiciona procena je zastarela",
  loading: "Učitavanje…", error: "Nešto nije u redu.", login: "Prijava", email: "Imejl", password: "Lozinka", signIn: "Prijavi se",
  setNewCredential: "Postavite novu lozinku", newCredential: "Nova lozinka", confirmCredential: "Potvrdite novu lozinku", updateCredential: "Promeni lozinku",
  credentialRequirements: "Koristite najmanje 12 karaktera.", invalidRecoveryTitle: "Link nije važeći", invalidRecoveryMessage: "Recovery link je nevažeći, već iskorišćen ili je istekao. Zatražite novi link u Supabase Dashboard-u.", backToLogin: "Nazad na prijavu", credentialUpdated: "Lozinka je uspešno promenjena. Prijavite se novom lozinkom.",
  ownerOnly: "Pristup je ograničen na vlasnika aplikacije.", onboardingTitle: "Postavite početno stanje", onboardingIntro: "Potvrdite račune i unesite početna stanja. Ovaj korak se izvršava samo jednom.", finish: "Završi podešavanje",
  onboardingComplete: "Početno podešavanje je uspešno završeno.", rateUnavailable: "Kurs trenutno nije dostupan. Unesite stvarno primljen iznos ručno.", indicativeRate: "Informativni kurs",
  incomeType: "Prihod", balanceAdjustment: "Korekcija stanja", investment: "Investicija", currentValue: "Trenutna vrednost",
  currentBalance: "Trenutno stanje", valuationDate: "Datum procene", updateValue: "Ažuriraj vrednost", targetBalance: "Ciljno stanje", accountHistory: "Istorija računa", removeAccount: "Ukloni račun", removeAccountHint: "Moguće je ukloniti samo račun bez transakcija, početnog stanja i istorije procena.",
  exportPdf: "Izvezi PDF", search: "Pretraži transakcije", delete: "Obriši", edit: "Izmeni", confirmDelete: "Ova radnja se ne može poništiti.", cancel: "Otkaži",
  month: "Mesec", year: "Godina", show: "Prikaži", previous: "Prethodni period", next: "Sledeći period", transactionType: "Vrsta transakcije", allTypes: "Sve", completeHistory: "Cela istorija", total: "Ukupno"
} as const;

const en: Record<keyof typeof sr, string> = {
  appName: "Saldo",
  home: "Home", accounts: "Accounts", transactions: "Transactions", statistics: "Statistics", settings: "Settings",
  netWorth: "Total net worth", thisMonth: "This month", expenses: "Expenses", income: "Income", difference: "Difference",
  spendingMoney: "Money available to spend", unavailable: "Unavailable", missingRates: "Missing rates", staleRates: "Stale rates", incompleteMonthlySummary: "The monthly total excludes entries without a historical rate.",
  allAccounts: "All accounts", recentTransactions: "Recent transactions", seeAll: "See all", addTransaction: "Add transaction",
  expense: "Expense", transfer: "Transfer", amount: "Amount", category: "Category", account: "Account", description: "Description", optional: "optional", date: "Date", save: "Save",
  sourceAccount: "Source account", destinationAccount: "Destination account", sourceAmount: "Source amount", receivedAmount: "Actual amount received",
  name: "Name", currency: "Currency", accountType: "Account type", cash: "Cash", bank: "Bank", savings: "Savings", openingBalance: "Opening balance", startDate: "Start date",
  noTransactions: "No transactions yet.", noAccounts: "No accounts yet.", addAccount: "Add account", archived: "Archived",
  monthlyOverview: "Monthly overview", spendingByCategory: "Spending by category", cashFlow: "Cash flow", netWorthHistory: "Net worth history",
  yearlyView: "Yearly", monthlyView: "Monthly", annualIncome: "Annual income", annualExpenses: "Annual expenses", previousMonthComparison: "Expense change from previous month", savingsChange: "Savings change", investmentValue: "IBKR value", investmentResult: "Investment result", investmentHistory: "IBKR value history", netWorthChange: "Net worth change", noData: "No data for the selected period.", reportOptions: "Report options",
  displayCurrency: "Display currency", language: "Language", security: "Security", logout: "Log out", dataExport: "Data export",
  estimate: "Estimate based on latest saved exchange rates", staleValuation: "The latest investment valuation is stale",
  loading: "Loading…", error: "Something went wrong.", login: "Sign in", email: "Email", password: "Password", signIn: "Sign in",
  setNewCredential: "Set a new password", newCredential: "New password", confirmCredential: "Confirm new password", updateCredential: "Update password",
  credentialRequirements: "Use at least 12 characters.", invalidRecoveryTitle: "Link is not valid", invalidRecoveryMessage: "The recovery link is invalid, already used, or expired. Request a new link in the Supabase Dashboard.", backToLogin: "Back to sign in", credentialUpdated: "Your password was updated. Sign in with the new password.",
  ownerOnly: "Access is restricted to the application owner.", onboardingTitle: "Set your opening balances", onboardingIntro: "Confirm the accounts and enter opening balances. This runs only once.", finish: "Finish setup",
  onboardingComplete: "Initial setup completed successfully.", rateUnavailable: "The rate is currently unavailable. Enter the actual amount received manually.", indicativeRate: "Indicative rate",
  incomeType: "Income", balanceAdjustment: "Balance adjustment", investment: "Investment", currentValue: "Current value",
  currentBalance: "Current balance", valuationDate: "Valuation date", updateValue: "Update value", targetBalance: "Target balance", accountHistory: "Account history", removeAccount: "Remove account", removeAccountHint: "Only an account without transactions, an opening balance, or valuation history can be removed.",
  exportPdf: "Export PDF", search: "Search transactions", delete: "Delete", edit: "Edit", confirmDelete: "This action cannot be undone.", cancel: "Cancel",
  month: "Month", year: "Year", show: "Show", previous: "Previous period", next: "Next period", transactionType: "Transaction type", allTypes: "All", completeHistory: "Complete history", total: "Total"
};

export const dictionaries = { "sr-Latn": sr, en };
export type Dictionary = Record<keyof typeof sr, string>;
