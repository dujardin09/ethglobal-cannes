"use client";

import React, { useState, useCallback } from 'react';
import { useFlowCurrentUser } from '@onflow/kit';
import ChatInterface from '@/components/ChatInterface';
import WalletConnection from '@/components/WalletConnection';
import DefiOperationsPanel from '@/components/DefiOperationsPanel';
import { Message, DefiOperation } from '@/types';

export default function Home() {
  const { user } = useFlowCurrentUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock AI response function - replace with actual AI agent integration
  const generateAgentResponse = useCallback(async (userMessage: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const lowerMessage = userMessage.toLowerCase();
    
    // Simple keyword-based responses for demo
    if (lowerMessage.includes('swap') || lowerMessage.includes('exchange')) {
      return "I can help you swap tokens on Flow! You can exchange FLOW for USDC, USDT, or other supported tokens. The current swap fee is 0.3%. Would you like me to prepare a swap transaction for you?";
    }
    
    if (lowerMessage.includes('stake') || lowerMessage.includes('staking')) {
      return "Staking FLOW tokens is a great way to earn rewards! Current staking APY is around 8-12%. You can stake with various validators on the Flow network. The minimum stake is 50 FLOW. Would you like to see available staking pools?";
    }
    
    if (lowerMessage.includes('lend') || lowerMessage.includes('lending')) {
      return "You can lend your assets on Flow DeFi protocols to earn interest. Popular lending platforms include FlowLend and Increment Finance. Current lending rates: USDC ~5% APY, FLOW ~8% APY. What would you like to lend?";
    }
    
    if (lowerMessage.includes('borrow') || lowerMessage.includes('loan')) {
      return "I can help you borrow assets using your tokens as collateral. You'll need to maintain a collateral ratio above 150%. Supported collateral includes FLOW, BTC, ETH. What would you like to borrow?";
    }
    
    if (lowerMessage.includes('balance') || lowerMessage.includes('tokens')) {
      return `Your wallet (${user?.addr?.slice(0, 8)}...) is connected! To check your token balances, I'll query the Flow blockchain. Note: This is a demo, so I'm showing mock data. In a real implementation, I would fetch your actual token balances.`;
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return "I'm your Flow DeFi assistant! I can help you with:\n\n• Swapping tokens (FLOW, USDC, USDT)\n• Staking FLOW for rewards\n• Lending assets to earn interest\n• Borrowing with collateral\n• Checking token balances\n• Explaining DeFi concepts\n\nJust ask me what you'd like to do!";
    }
    
    if (lowerMessage.includes('gas') || lowerMessage.includes('fees')) {
      return "Flow has very low transaction fees! Typical costs:\n• Token swap: ~0.001 FLOW\n• Staking: ~0.0001 FLOW\n• Lending/Borrowing: ~0.001 FLOW\n\nThat's less than $0.01 for most transactions!";
    }
    
    // Default response
    return "I understand you're asking about DeFi operations on Flow. I can help you with swapping, staking, lending, and borrowing. Could you be more specific about what you'd like to do? For example, try asking 'How do I swap FLOW for USDC?' or 'What are the staking rewards?'";
  }, [user?.addr]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user?.loggedIn) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const agentResponse = await generateAgentResponse(content);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Agent request failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble processing your request right now. Please try again.",
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.loggedIn, generateAgentResponse]);

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
      {/* API Status Banner */}
      <div className="bg-green-50 border-b border-green-200 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">
              KittyPunch Swap API Active
            </span>
            <span className="text-xs text-green-600">
              Ready for agent integration
            </span>
          </div>
          <div className="text-xs text-green-600">
            Base URL: /api/swap/*
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
                messages={messages}
                isLoading={isLoading}
                userAddress={user?.addr}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
