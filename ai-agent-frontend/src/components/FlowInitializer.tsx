"use client";

import { useEffect } from 'react';
import * as fcl from '@onflow/fcl';

// Component to ensure FCL is configured before FlowProvider initializes
export const FlowInitializer = () => {
  useEffect(() => {
    const initFCL = async () => {
      // Configure FCL for client-side usage
      fcl.config({
        // Access node configuration
        'accessNode.api': process.env.NEXT_PUBLIC_ACCESS_NODE_URL || 'https://rest-testnet.onflow.org',

        // Discovery service for wallet connection
        'discovery.wallet': process.env.NEXT_PUBLIC_DISCOVERY_WALLET || 'https://fcl-discovery.onflow.org/testnet/authn',

        // App metadata
        'app.detail.title': 'AI DeFi Agent',
        'app.detail.icon': '/favicon.ico',

        // WalletConnect configuration to prevent warnings
        'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
        'walletconnect.includeBaseWC': true,
      });

      console.log('FCL configured for client-side usage');
      console.log('Access Node:', process.env.NEXT_PUBLIC_ACCESS_NODE_URL || 'https://fcl-discovery.onflow.org/testnet/authn');
      console.log('Network:', process.env.NEXT_PUBLIC_FLOW_NETWORK || 'testnet');
    };

    initFCL();
  }, []);

  return null; // This component doesn't render anything
};

export default FlowInitializer;
