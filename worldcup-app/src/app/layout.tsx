import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WC 2026 Predictions",
  description: "Internal World Cup 2026 prediction and model comparison tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-50 text-zinc-900 antialiased`}>
        <Header />
        <main className="mx-auto max-w-7xl px-3 py-4 pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
