"use client";

import React, { useEffect, useState } from 'react';
import { useFlowCurrentUser } from '@onflow/kit';
import { Wallet, LogOut, User, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwap } from '@/contexts/SwapContext';

interface WalletConnectionProps {
  className?: string;
}

export default function WalletConnection({ className }: WalletConnectionProps) {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();
  const { availableTokens, tokenBalances, loadTokens, loadBalances } = useSwap();
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Load tokens and balances when wallet connects
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    if (user?.addr) {
      refreshBalances();
    }
  }, [user?.addr]);

  const refreshBalances = async () => {
    if (!user?.addr) return;
    
    setIsLoadingBalances(true);
    try {
      await loadBalances(user.addr);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const formatBalance = (balance: string, decimals: number = 6): string => {
    const num = parseFloat(balance);
    return num.toFixed(Math.min(decimals, 6));
  };

  const getTokenSymbol = (address: string): string => {
    const token = availableTokens.find(t => t.address === address);
    return token?.symbol || 'Unknown';
  };

  const handleConnect = async () => {
    try {
      await authenticate();
    } catch (error) {
      console.error('Authentication error:', error);
      // You could add a toast notification here
      alert('Failed to connect wallet. Please make sure the Flow emulator and dev-wallet are running.');
    }
  };

  const handleDisconnect = () => {
    unauthenticate();
  };

  if (user?.loggedIn) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6", className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Wallet Connected</h2>
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Wallet Address */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {user.addr}
              </p>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(user.addr || '')}
              className="text-blue-500 hover:text-blue-600 text-xs"
            >
              Copy
            </button>
          </div>

          {/* Token Balances */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Token Portfolio</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Object.keys(tokenBalances).length} tokens
                </span>
                <button
                  onClick={refreshBalances}
                  disabled={isLoadingBalances}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Refresh balances"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(tokenBalances).length > 0 ? (
                Object.entries(tokenBalances).map(([address, balance]) => {
                  const token = availableTokens.find(t => t.address === address);
                  const balanceNum = parseFloat(balance);
                  const isZeroBalance = balanceNum === 0;
                  
                  return (
                    <div key={address} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${
                      isZeroBalance 
                        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60' 
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isZeroBalance 
                            ? 'bg-gray-300 dark:bg-gray-600' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}>
                          <span className="text-sm font-bold text-white">
                            {token?.symbol?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {token?.symbol || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {token?.name || 'Unknown Token'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono font-medium ${
                          isZeroBalance 
                            ? 'text-gray-400 dark:text-gray-500' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {formatBalance(balance, token?.decimals)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {token?.symbol}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoadingBalances ? 'Loading token balances...' : 'No tokens found'}
                  </div>
                  {!isLoadingBalances && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Make sure your wallet has tokens or try refreshing
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick stats */}
            {Object.keys(tokenBalances).length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Total Assets</span>
                  <span>{Object.keys(tokenBalances).length} different tokens</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => window.open(`https://flowscan.org/account/${user.addr}`, '_blank')}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">View on Flowscan</span>
            </button>
            
            <button
              onClick={handleDisconnect}
              className="px-3 py-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-lg p-6", className)}>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Connect Your Flow Wallet
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Connect your Flow wallet to start interacting with DeFi protocols on Flow blockchain.
          </p>
        </div>

        <button
          onClick={handleConnect}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
        >
          Connect Wallet
        </button>

        <div className="text-xs text-gray-500 mt-4">
          <p>Supported wallets: Flow Reference Wallet, Lilico, Blocto</p>
        </div>
      </div>
    </div>
  );
}
