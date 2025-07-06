'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Token, SwapQuote, SwapTransaction } from '@/types/swap';

interface SwapContextType {
  // State
  availableTokens: Token[];
  tokenBalances: Record<string, string>;
  currentQuote: SwapQuote | null;
  isLoadingQuote: boolean;
  isExecutingSwap: boolean;
  networkMetadata: {
    flowNetworkAvailable: boolean;
    dataSource: 'blockchain' | 'mock';
    lastUpdated?: string;
  } | null;
  
  // Actions
  loadTokens: () => Promise<void>;
  loadBalances: (userAddress: string) => Promise<void>;
  getQuote: (tokenInAddress: string, tokenOutAddress: string, amountIn: string) => Promise<SwapQuote | null>;
  refreshQuote: (quoteId: string) => Promise<SwapQuote | null>;
  checkQuoteValidity: (quoteId: string) => Promise<{ isValid: boolean; timeRemaining: number }>;
  executeSwap: (quoteId: string, userAddress: string, slippageTolerance?: number) => Promise<SwapTransaction>;
  clearQuote: () => void;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: React.ReactNode }) {
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);
  const [networkMetadata, setNetworkMetadata] = useState<{
    flowNetworkAvailable: boolean;
    dataSource: 'blockchain' | 'mock';
    lastUpdated?: string;
  } | null>(null);
  
  // Add loading states to prevent excessive API calls
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [lastBalanceCheck, setLastBalanceCheck] = useState<number>(0);

  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      
      if (response.ok) {
        setAvailableTokens(data.tokens);
      } else {
        console.error('Error loading tokens:', data.error);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  const loadBalances = useCallback(async (userAddress: string) => {
    // Prevent excessive API calls
    const now = Date.now();
    if (isLoadingBalances || now - lastBalanceCheck < 5000) return;

    setIsLoadingBalances(true);
    try {
      const response = await fetch(`/api/tokens/balances?userAddress=${encodeURIComponent(userAddress)}`);
      const data = await response.json();
      
      if (response.ok) {
        setTokenBalances(data.balances);
        // Update network metadata
        if (data.metadata) {
          setNetworkMetadata({
            flowNetworkAvailable: data.metadata.flowNetworkAvailable,
            dataSource: data.metadata.dataSource,
            lastUpdated: data.metadata.lastUpdated
          });
        }
      } else {
        console.error('Error loading balances:', data.error);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setIsLoadingBalances(false);
      setLastBalanceCheck(Date.now());
    }
  }, [lastBalanceCheck, isLoadingBalances]);

  const getQuote = useCallback(async (
    tokenInAddress: string, 
    tokenOutAddress: string, 
    amountIn: string
  ): Promise<SwapQuote | null> => {
    setIsLoadingQuote(true);
    try {
      const response = await fetch('/api/swap/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenInAddress,
          tokenOutAddress,
          amountIn,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setCurrentQuote(data.quote);
        return data.quote;
      } else {
        console.error('Error getting quote:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      return null;
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  const refreshQuote = useCallback(async (quoteId: string): Promise<SwapQuote | null> => {
    setIsLoadingQuote(true);
    try {
      const response = await fetch('/api/swap/quote/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quoteId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setCurrentQuote(data.quote);
        return data.quote;
      } else {
        console.error('Error refreshing quote:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error refreshing quote:', error);
      return null;
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  const checkQuoteValidity = useCallback(async (quoteId: string) => {
    try {
      const response = await fetch(`/api/swap/quote/refresh?quoteId=${encodeURIComponent(quoteId)}`);
      const data = await response.json();
      
      if (response.ok) {
        return {
          isValid: data.isValid,
          timeRemaining: data.timeRemaining
        };
      } else {
        console.error('Error checking quote validity:', data.error);
        return { isValid: false, timeRemaining: 0 };
      }
    } catch (error) {
      console.error('Error checking quote validity:', error);
      return { isValid: false, timeRemaining: 0 };
    }
  }, []);

  const executeSwap = useCallback(async (
    quoteId: string, 
    userAddress: string, 
    slippageTolerance: number = 0.5
  ): Promise<SwapTransaction> => {
    setIsExecutingSwap(true);
    try {
      const response = await fetch('/api/swap/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId,
          userAddress,
          slippageTolerance,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Clear the quote after successful execution
        setCurrentQuote(null);
        return data.transaction;
      } else {
        throw new Error(data.error || 'Failed to execute swap');
      }
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    } finally {
      setIsExecutingSwap(false);
    }
  }, []);

  const clearQuote = useCallback(() => {
    setCurrentQuote(null);
  }, []);

  const value: SwapContextType = {
    availableTokens,
    tokenBalances,
    currentQuote,
    isLoadingQuote,
    isExecutingSwap,
    networkMetadata,
    loadTokens,
    loadBalances,
    getQuote,
    refreshQuote,
    checkQuoteValidity,
    executeSwap,
    clearQuote,
  };

  return (
    <SwapContext.Provider value={value}>
      {children}
    </SwapContext.Provider>
  );
}

export function useSwap() {
  const context = useContext(SwapContext);
  if (context === undefined) {
    throw new Error('useSwap must be used within a SwapProvider');
  }
  return context;
}
