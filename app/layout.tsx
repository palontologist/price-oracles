import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Price Oracles - Wheat & Maize Floor Prices",
  description: "Real-time wheat and maize floor price oracles from multiple data sources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
