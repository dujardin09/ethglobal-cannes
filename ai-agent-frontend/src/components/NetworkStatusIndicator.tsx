"use client";

import React from 'react';
import { useSwap } from '@/contexts/SwapContext';
import { AlertTriangle, CheckCircle, Database } from 'lucide-react';

export const NetworkStatusIndicator = () => {
  const { networkMetadata } = useSwap();

  if (!networkMetadata) return null;

  const { flowNetworkAvailable, dataSource } = networkMetadata;

  if (flowNetworkAvailable && dataSource === 'blockchain') {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300">
          Flow Network Connected
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      <div className="flex items-center space-x-2">
        <span className="text-sm text-orange-700 dark:text-orange-300">
          Mock Data Mode
        </span>
        <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <Database className="w-3 h-3 mr-1" />
          MOCK
        </div>
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;
