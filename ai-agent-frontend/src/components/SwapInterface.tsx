'use client';

import React, { useState, useEffect } from 'react';
import { useSwap } from '@/contexts/SwapContext';
import * as fcl from '@onflow/fcl';
import { Token } from '@/types/swap';
import { ArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface FlowUser {
  addr?: string;
  loggedIn?: boolean;
  cid?: string;
}

export default function SwapInterface() {
  const [user, setUser] = useState<FlowUser>({});
  const {
    availableTokens,
    tokenBalances,
    currentQuote,
    isLoadingQuote,
    isExecutingSwap,
    loadTokens,
    loadBalances,
    getQuote,
    refreshQuote,
    executeSwap,
    clearQuote,
  } = useSwap();

  // Subscribe to FCL auth state changes
  useEffect(() => {
    const unsubscribe = fcl.currentUser().subscribe((currentUser: FlowUser) => {
      setUser(currentUser);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [quoteTimeRemaining, setQuoteTimeRemaining] = useState(0);
  const [isQuoteExpired, setIsQuoteExpired] = useState(false);

  // Load tokens and balances on mount and when user changes
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    if (user?.addr) {
      loadBalances(user.addr);
    }
  }, [user?.addr, loadBalances]);

  // Auto-get quote when inputs change
  useEffect(() => {
    if (tokenIn && tokenOut && amountIn && parseFloat(amountIn) > 0 && user?.addr) {
      const debounceTimer = setTimeout(() => {
        getQuote(tokenIn.address, tokenOut.address, amountIn);
      }, 500);

      return () => clearTimeout(debounceTimer);
    } else {
      clearQuote();
    }
  }, [tokenIn, tokenOut, amountIn, user?.addr, getQuote, clearQuote]);

  // Track quote expiration
  useEffect(() => {
    if (currentQuote) {
      const updateTimeRemaining = () => {
        const remaining = Math.max(0, currentQuote.validUntil - Date.now());
        setQuoteTimeRemaining(remaining);
        setIsQuoteExpired(remaining <= 0);
        return remaining;
      };

      // Initial update
      updateTimeRemaining();

      const interval = setInterval(() => {
        if (updateTimeRemaining() <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setQuoteTimeRemaining(0);
      setIsQuoteExpired(false);
    }
  }, [currentQuote]);

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
    clearQuote();
  };

  const handleRefreshQuote = async () => {
    if (!currentQuote) return;

    try {
      await refreshQuote(currentQuote.id);
    } catch (error) {
      console.error('Failed to refresh quote:', error);
    }
  };

  const handleExecuteSwap = async () => {
    if (!currentQuote || !user?.addr) return;

    try {
      // Check if quote is expired and refresh if needed
      if (isQuoteExpired) {
        const refreshed = await refreshQuote(currentQuote.id);
        if (!refreshed) {
          console.error('Failed to refresh expired quote');
          return;
        }
      }

      const transaction = await executeSwap(currentQuote.id, user.addr, slippageTolerance);
      console.log('Swap executed:', transaction);
      
      // Reload balances after successful swap
      await loadBalances(user.addr);
      setAmountIn('');
    } catch (error) {
      console.error('Swap failed:', error);
      
      // If quote expired during execution, try to refresh
      if (error instanceof Error && error.message.includes('expired')) {
        await handleRefreshQuote();
      }
    }
  };

  const getTokenBalance = (token: Token | null) => {
    if (!token) return '0';
    return tokenBalances[token.address] || '0';
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(6);
  };

  // Utility functions for detecting and formatting mock data
  const isMockBalance = (balance: string): boolean => {
    return balance.startsWith('MOCK_');
  };

  const formatBalanceDisplay = (balance: string) => {
    if (isMockBalance(balance)) {
      // Extract the numeric value from "MOCK_xxx.x" format
      const mockValue = balance.replace('MOCK_', '');
      return {
        value: formatBalance(mockValue),
        isMock: true,
        displayValue: mockValue
      };
    }
    return {
      value: formatBalance(balance),
      isMock: false,
      displayValue: balance
    };
  };

  const MockIndicator = ({ className = "" }: { className?: string }) => (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ${className}`}>
      MOCK
    </span>
  );

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Swap Tokens</h3>
        <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to use the swap feature.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Swap Tokens</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Slippage Tolerance (%)
          </label>
          <div className="flex space-x-2">
            {[0.1, 0.5, 1.0].map((value) => (
              <button
                key={value}
                onClick={() => setSlippageTolerance(value)}
                className={`px-3 py-1 rounded text-sm ${
                  slippageTolerance === value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(parseFloat(e.target.value) || 0.5)}
              className="px-2 py-1 w-20 text-sm border rounded dark:bg-gray-600 dark:border-gray-500"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Token In */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            From
          </label>
          <div className="flex items-center space-x-2">
            <select
              value={tokenIn?.address || ''}
              onChange={(e) => {
                const token = availableTokens.find(t => t.address === e.target.value);
                setTokenIn(token || null);
              }}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select token</option>
              {availableTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
              step="any"
            />
          </div>
          {tokenIn && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-2">
              {(() => {
                const balance = getTokenBalance(tokenIn);
                const balanceDisplay = formatBalanceDisplay(balance);
                return (
                  <>
                    <span>
                      Balance: <span className={balanceDisplay.isMock ? 'text-orange-600 dark:text-orange-400' : ''}>{balanceDisplay.value}</span> {tokenIn.symbol}
                    </span>
                    {balanceDisplay.isMock && <MockIndicator />}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Token Out */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            To
          </label>
          <div className="flex items-center space-x-2">
            <select
              value={tokenOut?.address || ''}
              onChange={(e) => {
                const token = availableTokens.find(t => t.address === e.target.value);
                setTokenOut(token || null);
              }}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select token</option>
              {availableTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <div className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white text-right">
              {isLoadingQuote ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin inline" />
              ) : (
                currentQuote?.amountOut || '0.0'
              )}
            </div>
          </div>
          {tokenOut && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-2">
              {(() => {
                const balance = getTokenBalance(tokenOut);
                const balanceDisplay = formatBalanceDisplay(balance);
                return (
                  <>
                    <span>
                      Balance: <span className={balanceDisplay.isMock ? 'text-orange-600 dark:text-orange-400' : ''}>{balanceDisplay.value}</span> {tokenOut.symbol}
                    </span>
                    {balanceDisplay.isMock && <MockIndicator />}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Quote Details */}
        {currentQuote && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Quote expires in:</span>
              <div className="flex items-center space-x-2">
                <span className={`${isQuoteExpired ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {isQuoteExpired ? 'Expired' : formatTimeRemaining(quoteTimeRemaining)}
                </span>
                {(isQuoteExpired || quoteTimeRemaining < 30000) && (
                  <button
                    onClick={handleRefreshQuote}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                    disabled={isLoadingQuote}
                  >
                    {isLoadingQuote ? 'Refreshing...' : 'Refresh'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Price Impact:</span>
              <span className={`${currentQuote.priceImpact > 2 ? 'text-red-500' : 'text-green-500'}`}>
                {currentQuote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Fee:</span>
              <span className="text-gray-900 dark:text-white">
                {currentQuote.fee} {currentQuote.tokenIn.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Estimated Gas:</span>
              <span className="text-gray-900 dark:text-white">{currentQuote.estimatedGas} FLOW</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Route:</span>
              <span className="text-gray-900 dark:text-white">
                {currentQuote.route.length} hop{currentQuote.route.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleExecuteSwap}
          disabled={!currentQuote || isExecutingSwap || !user?.addr || isQuoteExpired}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isExecutingSwap ? (
            <div className="flex items-center justify-center">
              <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
              Executing Swap...
            </div>
          ) : isQuoteExpired ? (
            'Quote Expired - Refresh Required'
          ) : !currentQuote ? (
            'Enter an amount'
          ) : (
            'Swap'
          )}
        </button>
      </div>
    </div>
  );
}
