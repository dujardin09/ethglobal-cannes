"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { SwapProvider } from "@/contexts/SwapContext";
import ClientOnlyWrapper from "@/components/ClientOnlyWrapper";
import { initFlowConfigLocal } from "@/lib/flow-config-local";
import { useEffect } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function FlowConfigInitializer() {
  useEffect(() => {
    // Initialize Flow configuration on client side only once
    initFlowConfigLocal();
  }, []);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientOnlyWrapper>
          <FlowConfigInitializer />
          <SwapProvider>
            {children}
          </SwapProvider>
        </ClientOnlyWrapper>
      </body>
    </html>
  );
}
