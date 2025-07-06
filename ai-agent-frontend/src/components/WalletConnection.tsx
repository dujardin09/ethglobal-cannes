"use client";

import React, { useEffect, useState, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import { Wallet, LogOut, User, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSwap } from '@/contexts/SwapContext';
import { Token } from '@/types/swap';

interface WalletConnectionProps {
  className?: string;
}

interface FlowUser {
  addr?: string;
  loggedIn?: boolean;
  cid?: string;
}

export default function WalletConnection({ className }: WalletConnectionProps) {
  const [user, setUser] = useState<FlowUser>({});
  const { availableTokens, tokenBalances, loadTokens, loadBalances } = useSwap();
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Subscribe to FCL auth state changes
  useEffect(() => {
    const unsubscribe = fcl.currentUser().subscribe((currentUser: FlowUser) => {
      setUser(currentUser);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const authenticate = () => {
    fcl.authenticate();
  };

  const unauthenticate = () => {
    fcl.unauthenticate();
  };

  // Load tokens and balances when wallet connects
  const refreshBalances = useCallback(async () => {
    if (!user?.addr) return;
    
    setIsLoadingBalances(true);
    try {
      await loadBalances(user.addr);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [user?.addr, loadBalances]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    if (user?.addr) {
      refreshBalances();
    }
  }, [user?.addr, refreshBalances]);

  const formatBalance = (balance: string, decimals: number = 6): string => {
    const num = parseFloat(balance);
    return num.toFixed(Math.min(decimals, 6));
  };

  // Utility functions for detecting and formatting mock data
  const isMockBalance = (balance: string): boolean => {
    return balance.startsWith('MOCK_');
  };

  const formatBalanceDisplay = (balance: string, token?: Token) => {
    if (isMockBalance(balance)) {
      // Extract the numeric value from "MOCK_xxx.x" format
      const mockValue = balance.replace('MOCK_', '');
      return {
        value: formatBalance(mockValue, token?.decimals),
        isMock: true,
        displayValue: mockValue
      };
    }
    return {
      value: formatBalance(balance, token?.decimals),
      isMock: false,
      displayValue: balance
    };
  };

  const MockIndicator = ({ className = "" }: { className?: string }) => (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ${className}`}>
      MOCK
    </span>
  );

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
      <div className={cn("glass rounded-2xl shadow-2xl p-6 border border-purple-500/30", className)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-100">Wallet Connected</h2>
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center shadow-lg glow">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Wallet Address */}
          <div className="flex items-center space-x-4 p-4 glass-light rounded-xl">
            <User className="w-6 h-6 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-300">Address</p>
              <p className="text-sm text-slate-400 font-mono">
                {user.addr}
              </p>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(user.addr || '')}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              Copy
            </button>
          </div>

          {/* Token Balances */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-200">Token Portfolio</h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full">
                  {Object.keys(tokenBalances).length} tokens
                </span>
                <button
                  onClick={refreshBalances}
                  disabled={isLoadingBalances}
                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"
                  title="Refresh balances"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(tokenBalances).length > 0 ? (
                Object.entries(tokenBalances).map(([address, balance]) => {
                  const token = availableTokens.find(t => t.address === address);
                  const balanceNum = parseFloat(balance);
                  const isZeroBalance = balanceNum === 0;
                  const { value: formattedBalance, isMock, displayValue } = formatBalanceDisplay(balance, token);
                  
                  return (
                    <div key={address} className={`flex justify-between items-center p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                      isZeroBalance 
                        ? 'bg-slate-800/50 border-slate-700/50 opacity-60' 
                        : isMock
                        ? 'bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-500/30'
                        : 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          isZeroBalance 
                            ? 'bg-slate-600' 
                            : isMock
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-purple-500 to-blue-500'
                        }`}>
                          <span className="text-sm">
                            {token?.symbol?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-slate-100">
                              {token?.symbol || 'Unknown'}
                            </span>
                            {isMock && <MockIndicator />}
                          </div>
                          <div className="text-xs text-slate-400">
                            {token?.name || 'Unknown Token'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono font-bold ${
                          isZeroBalance 
                            ? 'text-slate-500' 
                            : isMock
                            ? 'text-amber-400'
                            : 'text-slate-100'
                        }`}>
                          {formattedBalance}
                        </div>
                        <div className="text-xs text-slate-400">
                          {token?.symbol}
                          {isMock && (
                            <span className="ml-1 text-amber-400">(simulated)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-slate-500" />
                  </div>
                  <div className="text-sm text-slate-400">
                    {isLoadingBalances ? 'Loading token balances...' : 'No tokens found'}
                  </div>
                  {!isLoadingBalances && (
                    <div className="text-xs text-slate-500 mt-2">
                      Make sure your wallet has tokens or try refreshing
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick stats */}
            {Object.keys(tokenBalances).length > 0 && (
              <div className="pt-4 border-t border-slate-600/30">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Total Assets</span>
                  <span>{Object.keys(tokenBalances).length} different tokens</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => window.open(`https://flowscan.org/account/${user.addr}`, '_blank')}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 backdrop-blur-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">View on Flowscan</span>
            </button>
            
            <button
              onClick={handleDisconnect}
              className="px-4 py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass rounded-2xl shadow-2xl p-8 border border-purple-500/30", className)}>
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-3">
            Connect Your Flow Wallet
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Connect your Flow wallet to start interacting with DeFi protocols on Flow blockchain.
          </p>
        </div>

        <button
          onClick={handleConnect}
          className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Connect Wallet
        </button>

        <div className="text-xs text-slate-500 mt-6">
          <p>Supported wallets: Flow Reference Wallet, Lilico, Blocto</p>
        </div>
      </div>
    </div>
  );
}
