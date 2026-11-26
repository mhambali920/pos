import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeScript } from "@eta-ui/react";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--eta-font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enterprise POS — Retail & Operations Platform",
  description:
    "Multi-store Enterprise Point of Sales, Inventory, Purchasing, and Financial Management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-full flex flex-col bg-eta-base text-eta-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
