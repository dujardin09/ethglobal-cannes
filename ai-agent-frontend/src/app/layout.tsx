"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { FlowProvider } from "@onflow/kit";
import { SwapProvider } from "@/contexts/SwapContext";
import flowJson from "../../flow.json";
import { initFlowConfig } from "@/lib/flow-config";
import { initFlowConfigDirect } from "@/lib/flow-config-direct";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize Flow configuration on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use local configuration to avoid discovery service network errors
      if ((process.env.NEXT_PUBLIC_FLOW_NETWORK || 'emulator') === 'emulator') {
        import('@onflow/fcl').then((fcl) => {
          // Configure essential settings first
          fcl.config({
            'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
            'walletconnect.includeBaseWC': true,
          });
          
          // Then use local configuration
          initFlowConfigLocal();
        });
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
            accessNodeUrl: 'http://localhost:8888',
            flowNetwork: 'emulator',
          }}
          flowJson={flowJson}
        >
          <SwapProvider>
            {children}
          </SwapProvider>
        </FlowProvider>
      </body>
    </html>
  );
}
