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

  const loadTokens = useCallback(async () => {
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
    }
  }, []);

  const loadBalances = useCallback(async (userAddress: string) => {
    try {
      const response = await fetch(`/api/tokens/balances?userAddress=${encodeURIComponent(userAddress)}`);
      const data = await response.json();
      
      if (response.ok) {
        setTokenBalances(data.balances);
      } else {
        console.error('Error loading balances:', data.error);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  }, []);

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
