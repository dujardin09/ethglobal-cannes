"use client";

import React from 'react';
import { useFlowCurrentUser } from '@onflow/kit';
import { Wallet, LogOut, User, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletConnectionProps {
  className?: string;
}

export default function WalletConnection({ className }: WalletConnectionProps) {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();

  const handleConnect = () => {
    authenticate();
  };

  const handleDisconnect = () => {
    unauthenticate();
  };

  if (user?.loggedIn) {
    return (
      <div className={cn("bg-white rounded-lg shadow-lg p-6", className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Wallet Connected</h2>
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Address</p>
              <p className="text-xs text-gray-500 font-mono">
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

          <div className="flex space-x-2">
            <button
              onClick={() => window.open(`https://flowscan.org/account/${user.addr}`, '_blank')}
              className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">View on Flowscan</span>
            </button>
            
            <button
              onClick={handleDisconnect}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Disconnect</span>
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
