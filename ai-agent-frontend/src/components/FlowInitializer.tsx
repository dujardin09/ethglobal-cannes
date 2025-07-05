"use client";

import { useEffect } from 'react';
import * as fcl from '@onflow/fcl';

// Component to ensure FCL is configured before FlowProvider initializes
export const FlowInitializer = () => {
  useEffect(() => {
    const initFCL = async () => {
      // Configure FCL with WalletConnect to prevent warnings
      fcl.config({
        'walletconnect.projectId': process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '2f5a5eba86e7e893eb6c92170c026fbb',
        'walletconnect.includeBaseWC': true,
      });
      
      console.log('FCL WalletConnect configured');
    };
    
    initFCL();
  }, []);

  return null; // This component doesn't render anything
};

export default FlowInitializer;
