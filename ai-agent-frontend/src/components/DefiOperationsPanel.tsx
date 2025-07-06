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
    apiReady: false,
    status: 'Coming Soon'
  },
  {
    id: 'lend',
    title: 'Lend Assets',
    description: 'Lend your assets to earn interest',
    icon: TrendingUp,
    color: 'purple',
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
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-lg", className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">DeFi Operations</h2>
        <p className="text-sm text-gray-600">
          Quick access to common DeFi operations on Flow
        </p>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {OPERATION_TYPES.map((operation) => {
            const Icon = operation.icon;
            return (
              <button
                key={operation.id}
                onClick={() => handleQuickAction(operation.id)}
                disabled={!userAddress || !operation.apiReady}
                className={cn(
                  "p-4 border-2 rounded-lg text-left transition-all duration-200 hover:shadow-md relative",
                  userAddress && operation.apiReady 
                    ? getColorClasses(operation.color) 
                    : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed",
                  (!userAddress || !operation.apiReady) && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{operation.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    operation.apiReady 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {operation.status}
                  </span>
                </div>
                <p className="text-xs opacity-75 mb-1">{operation.description}</p>
                <p className="text-xs opacity-60">{operation.example}</p>
                {operation.apiReady && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    ✓ API Ready
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!userAddress && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              Connect your wallet to access DeFi operations
            </p>
          </div>
        )}
      </div>

      {/* Recent Operations */}
      {userAddress && recentOperations.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Operations</h3>
          <div className="space-y-3">
            {recentOperations.map((operation) => (
              <div
                key={operation.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(operation.status)}
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {operation.type}
                      {operation.amount && ` • ${operation.amount}`}
                    </p>
                    <p className="text-xs text-gray-500">
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
                    className="text-blue-500 hover:text-blue-600"
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
