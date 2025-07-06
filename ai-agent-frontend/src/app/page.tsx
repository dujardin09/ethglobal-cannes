"use client";

import React, { useState, useCallback, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import ChatInterface from '@/components/ChatInterface';
import WalletConnection from '@/components/WalletConnection';
import DefiOperationsPanel from '@/components/DefiOperationsPanel';
import NetworkStatusIndicator from '@/components/NetworkStatusIndicator';
import PendingActionIndicator from '@/components/PendingActionIndicator';
import { DefiOperation } from '@/types';
import { useAgentChat } from '@/hooks/useAgentChat';

interface FlowUser {
  addr?: string;
  loggedIn?: boolean;
  cid?: string;
}

export default function Home() {
  const [user, setUser] = useState<FlowUser>({});
  
  // Utiliser le hook pour gérer la conversation avec l'agent AI
  const {
    messages,
    isLoading,
    isConnected,
    pendingActionId,
    sendMessage,
    confirmAction,
    testConnection,
    clearMessages
  } = useAgentChat();

  // Subscribe to FCL auth state changes
  useEffect(() => {
    const unsubscribe = fcl.currentUser().subscribe((currentUser: FlowUser) => {
      setUser(currentUser);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Supprimé car maintenant géré par le hook useAgentChat

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user?.loggedIn) return;
    await sendMessage(content);
  }, [user?.loggedIn, sendMessage]);

  const handleExecuteOperation = useCallback((operation: Partial<DefiOperation>) => {
    // Add a message about the operation being initiated
    const operationMessage: Message = {
      id: Date.now().toString(),
      content: `Initiating ${operation.type} operation. This is a demo - in a real implementation, this would create and submit a transaction to the Flow blockchain.`,
      sender: 'agent',
      timestamp: new Date(),
      type: 'defi-action',
      defiAction: {
        type: operation.type as 'swap' | 'stake' | 'lend' | 'borrow',
        details: operation
      }
    };

    setMessages(prev => [...prev, operationMessage]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Network Status Banner */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <NetworkStatusIndicator />
          <div className="text-xs text-gray-600 dark:text-gray-400">
            AI DeFi Agent - {user?.loggedIn ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-6rem)]">
          {/* Left Panel - Wallet & DeFi Operations */}
          <div className="lg:col-span-1 space-y-6">
            <WalletConnection />
            <DefiOperationsPanel 
              userAddress={user?.addr}
              onExecuteOperation={handleExecuteOperation}
            />
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg h-full">
              <ChatInterface
                onSendMessage={handleSendMessage}
                onConfirmAction={confirmAction}
                messages={messages}
                isLoading={isLoading}
                userAddress={user?.addr}
                isConnected={isConnected}
                pendingActionId={pendingActionId}
                onTestConnection={testConnection}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Action Indicator */}
      <PendingActionIndicator 
        isVisible={!!pendingActionId}
        actionId={pendingActionId}
      />
    </div>
  );
}
