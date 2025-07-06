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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Network Status Banner */}
      <div className="glass-light border-b border-purple-500/20 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <NetworkStatusIndicator />
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${user?.loggedIn ? 'bg-green-400 glow' : 'bg-red-400'}`}></div>
            <span className="text-sm text-slate-300 font-medium">
              AI DeFi Agent - {user?.loggedIn ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
          {/* Left Panel - Wallet & DeFi Operations */}
          <div className="lg:col-span-1 space-y-6 fade-in-up">
            <WalletConnection />
            <DefiOperationsPanel 
              userAddress={user?.addr}
              onExecuteOperation={handleExecuteOperation}
            />
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-2 fade-in-up" style={{animationDelay: '0.2s'}}>
            <div className="glass rounded-2xl shadow-2xl overflow-hidden border border-purple-500/30">
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
