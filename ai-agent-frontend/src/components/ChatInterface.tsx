"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types';
import ConfirmationButtons from './ConfirmationButtons';
import { FormattedResult } from './FormattedResult';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  onConfirmAction?: (confirmed: boolean) => void;
  messages: Message[];
  isLoading?: boolean;
  userAddress?: string;
  isConnected?: boolean;
  pendingActionId?: string | null;
  onTestConnection?: () => void;
}

export default function ChatInterface({ 
  onSendMessage, 
  onConfirmAction,
  messages, 
  isLoading = false,
  userAddress,
  isConnected = false,
  pendingActionId,
  onTestConnection
}: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Flow DeFi Assistant</h1>
              <p className="text-blue-100 text-sm">
                {userAddress 
                  ? `Connected: ${userAddress.slice(0, 8)}...${userAddress.slice(-4)}` 
                  : 'Connect your wallet to get started'
                }
              </p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-blue-100">
              {isConnected ? 'AI Connected' : 'AI Disconnected'}
            </span>
            {onTestConnection && (
              <button
                onClick={onTestConnection}
                disabled={isLoading}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Test AI connection"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">Welcome to Flow DeFi Assistant</h3>
            <p className="text-sm max-w-md mx-auto">
              I&apos;m here to help you navigate DeFi on Flow blockchain. Ask me about swapping tokens, 
              staking, lending, or any other DeFi operations!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-3",
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                  message.sender === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                )}
              >
                {message.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "max-w-xs lg:max-w-md",
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white px-4 py-2 rounded-lg'
                    : 'bg-gray-100 text-gray-800 px-4 py-2 rounded-lg'
                )}
              >
                {/* Détecter si c'est un résultat formaté (contient des emojis et est de l'agent) */}
                {message.sender === 'agent' && 
                 (message.content.includes('🎉') || 
                  message.content.includes('✅') || 
                  message.content.includes('❌') ||
                  message.content.includes('ℹ️')) ? (
                  <FormattedResult content={message.content} />
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                
                {/* Transaction ID Display */}
                {message.transactionId && (
                  <div className="mt-2 text-xs opacity-75">
                    <span className="font-medium">Transaction: </span>
                    <span className="font-mono">{message.transactionId.slice(0, 8)}...</span>
                  </div>
                )}

                {/* DeFi Action Display */}
                {message.defiAction && (
                  <div className="mt-2 p-2 bg-white/10 rounded text-xs">
                    <div className="font-medium capitalize">{message.defiAction.type} Operation</div>
                    <div className="opacity-75">
                      {message.defiAction.details?.function_call && (
                        <div className="font-mono text-xs mt-1">
                          {message.defiAction.details.function_call}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirmation Buttons */}
                {pendingActionId && message.sender === 'agent' && (
                  message.content.includes('Confirmation requise') || 
                  message.content.includes('Confirmez-vous') ||
                  message.content.includes('⚠️') ||
                  message.content.includes('Répondez à l\'endpoint /confirm')
                ) && (
                  <ConfirmationButtons
                    onConfirm={() => onConfirmAction?.(true)}
                    onCancel={() => onConfirmAction?.(false)}
                    isLoading={isLoading}
                  />
                )}

                <div className="text-xs opacity-75 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Assistant is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-gray-50 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              userAddress 
                ? (isConnected ? "Ask me about DeFi operations..." : "AI not connected. Please wait...")
                : "Connect your wallet first..."
            }
            disabled={!userAddress || isLoading || !isConnected}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !userAddress || isLoading || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
