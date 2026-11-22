import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari, Noto_Sans_Oriya } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { ServiceWorker } from "@/components/layout/ServiceWorker";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const odia = Noto_Sans_Oriya({ subsets: ["oriya"], weight: ["400", "600", "700"], variable: "--font-odia", display: "swap" });
const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "NagarNetra — City's Eye", template: "%s · NagarNetra" },
  description: "Report civic problems by photo or voice in Odia, Hindi or English. AI routes them and verifies the fix.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#0B5FFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${odia.variable} ${deva.variable}`}>
      <body className="min-h-dvh font-sans">
        <I18nProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-4">{children}</main>
          <ServiceWorker />
        </I18nProvider>
      </body>
    </html>
  );
}
