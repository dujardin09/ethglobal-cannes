"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { FlowProvider } from "@onflow/kit";
import flowJson from "../../flow.json";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        <FlowProvider
          config={{
            accessNodeUrl: 'https://rest-testnet.onflow.org',
            flowNetwork: 'testnet',
            discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
          }}
          flowJson={flowJson}
        >
          {children}
        </FlowProvider>
      </body>
    </html>
  );
}
