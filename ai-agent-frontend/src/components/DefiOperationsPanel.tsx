"use client";

import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  PiggyBank, 
  TrendingUp, 
  CreditCard, 
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DefiOperation } from '@/types';

interface DefiOperationsPanelProps {
  className?: string;
  userAddress?: string;
  onExecuteOperation?: (operation: Partial<DefiOperation>) => void;
}

const OPERATION_TYPES = [
  {
    id: 'swap',
    title: 'Swap Tokens',
    description: 'Exchange one token for another',
    icon: ArrowRightLeft,
    color: 'blue',
    example: 'Swap FLOW for USDC',
    apiReady: true,
    status: 'Active'
  },
  {
    id: 'stake',
    title: 'Stake Tokens',
    description: 'Earn rewards by staking your tokens',
    icon: PiggyBank,
    color: 'green',
    example: 'Stake FLOW to earn rewards',
    apiReady: true,
    status: 'Active'
  },
  {
    id: 'vault',
    title: 'Invest in Vault',
    description: 'Deposit assets in yield-generating vaults',
    icon: TrendingUp,
    color: 'purple',
    example: 'Deposit USDC in DeFi vault',
    apiReady: true,
    status: 'Active'
  },
  {
    id: 'lend',
    title: 'Lend Assets',
    description: 'Lend your assets to earn interest',
    icon: TrendingUp,
    color: 'indigo',
    example: 'Lend USDC and earn APY',
    apiReady: false,
    status: 'Coming Soon'
  },
  {
    id: 'borrow',
    title: 'Borrow Assets',
    description: 'Borrow assets against collateral',
    icon: CreditCard,
    color: 'orange',
    example: 'Borrow USDC with FLOW collateral',
    apiReady: false,
    status: 'Coming Soon'
  }
];

export default function DefiOperationsPanel({ 
  className, 
  userAddress,
  onExecuteOperation 
}: DefiOperationsPanelProps) {
  const [recentOperations] = useState<DefiOperation[]>([
    {
      id: '1',
      type: 'swap',
      status: 'confirmed',
      amount: '100 FLOW',
      token: 'USDC',
      transactionId: '0x1234abcd...'
    },
    {
      id: '2',
      type: 'stake',
      status: 'pending',
      amount: '500 FLOW',
      estimatedGas: '0.001 FLOW'
    }
  ]);

  const handleQuickAction = (operationType: string) => {
    if (onExecuteOperation) {
      onExecuteOperation({
        type: operationType as any,
        status: 'pending'
      });
    }
  };

  const getStatusIcon = (status: DefiOperation['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-900/20 text-blue-400 border-blue-500/30 hover:bg-blue-900/30',
      green: 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/30',
      purple: 'bg-purple-900/20 text-purple-400 border-purple-500/30 hover:bg-purple-900/30',
      indigo: 'bg-indigo-900/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-900/30',
      orange: 'bg-orange-900/20 text-orange-400 border-orange-500/30 hover:bg-orange-900/30',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className={cn("glass rounded-2xl shadow-2xl border border-purple-500/30 flex flex-col", className)} style={{maxHeight: 'calc(100vh - 200px)'}}>
      {/* Header */}
      <div className="p-6 border-b border-slate-600/30 flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">DeFi Operations</h2>
        <p className="text-sm text-slate-400">
          Quick access to common DeFi operations on Flow
        </p>
      </div>

      {/* Quick Actions - Scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-200 mb-6">Quick Actions</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6">
          <div className="grid grid-cols-2 gap-4 pb-6">
            {OPERATION_TYPES.map((operation) => {
              const Icon = operation.icon;
              return (
                <button
                  key={operation.id}
                  onClick={() => handleQuickAction(operation.id)}
                  disabled={!userAddress || !operation.apiReady}
                  className={cn(
                    "p-5 border-2 rounded-xl text-left transition-all duration-200 hover:shadow-lg relative group",
                    userAddress && operation.apiReady 
                      ? getColorClasses(operation.color) 
                      : "bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed",
                    (!userAddress || !operation.apiReady) && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6" />
                      <span className="font-semibold">{operation.title}</span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      operation.apiReady 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {operation.status}
                    </span>
                  </div>
                  <p className="text-sm opacity-75 mb-2 leading-relaxed">{operation.description}</p>
                  <p className="text-xs opacity-60">{operation.example}</p>
                  {operation.apiReady && (
                    <div className="mt-3 text-xs text-green-400 font-semibold flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      API Ready
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!userAddress && (
          <div className="p-6 pt-0 flex-shrink-0">
            <div className="p-4 glass-light border border-amber-500/30 rounded-xl">
              <p className="text-sm text-amber-300 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.773 0L3.04 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Connect your wallet to access DeFi operations
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Operations */}
      {userAddress && recentOperations.length > 0 && (
        <div className="p-6 border-t border-slate-600/30">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Recent Operations</h3>
          <div className="space-y-3">
            {recentOperations.map((operation) => (
              <div
                key={operation.id}
                className="flex items-center justify-between p-4 glass-light rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(operation.status)}
                  <div>
                    <p className="font-semibold text-sm capitalize text-slate-200">
                      {operation.type}
                      {operation.amount && ` • ${operation.amount}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {operation.status === 'pending' && operation.estimatedGas && (
                        `Est. gas: ${operation.estimatedGas}`
                      )}
                      {operation.status === 'confirmed' && operation.transactionId && (
                        `Tx: ${operation.transactionId.slice(0, 10)}...`
                      )}
                    </p>
                  </div>
                </div>
                
                {operation.transactionId && operation.status === 'confirmed' && (
                  <button
                    onClick={() => window.open(`https://flowscan.org/transaction/${operation.transactionId}`, '_blank')}
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
