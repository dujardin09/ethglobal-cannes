"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { FlowProvider } from "@onflow/kit";
import flowJson from "../../flow.json";
import { initFlowConfig } from "@/lib/flow-config";
import { initFlowConfigDirect } from "@/lib/flow-config-direct";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize Flow configuration on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try direct configuration for emulator to avoid discovery service issues
      if ((process.env.NEXT_PUBLIC_FLOW_NETWORK || 'emulator') === 'emulator') {
        initFlowConfigDirect();
      } else {
        initFlowConfig();
      }
    }
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FlowProvider
          config={{
            accessNodeUrl: process.env.NEXT_PUBLIC_ACCESS_NODE_URL || 
              (process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'https://rest-mainnet.onflow.org' :
               process.env.NEXT_PUBLIC_FLOW_NETWORK === 'testnet' ? 'https://rest-testnet.onflow.org' :
               'http://localhost:8888'),
            flowNetwork: (process.env.NEXT_PUBLIC_FLOW_NETWORK as any) || 'emulator',
            discoveryWallet: process.env.NEXT_PUBLIC_DISCOVERY_WALLET || 
              (process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'https://fcl-discovery.onflow.org/authn' :
               process.env.NEXT_PUBLIC_FLOW_NETWORK === 'testnet' ? 'https://fcl-discovery.onflow.org/testnet/authn' :
               'https://fcl-discovery.onflow.org/emulator/authn'),
          }}
          flowJson={flowJson}
        >
          {children}
        </FlowProvider>
      </body>
    </html>
  );
}
