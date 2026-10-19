import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const metadata: Metadata = {
  title: { default: "Saldo", template: "%s · Saldo" },
  description: "Private personal finance tracking.",
  applicationName: "Saldo",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Saldo" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false, nocache: true }
};

export const viewport: Viewport = { themeColor: "#0b0d10", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sr-Latn"><body>{children}<ServiceWorkerRegistration /></body></html>;
}
