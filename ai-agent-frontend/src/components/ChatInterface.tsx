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
    <div className="flex flex-col h-200 bg-transparent">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Flow DeFi Assistant</h1>
              <p className="text-indigo-100 text-sm">
                {userAddress 
                  ? `Connected: ${userAddress.slice(0, 8)}...${userAddress.slice(-4)}` 
                  : 'Connect your wallet to get started'
                }
              </p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400'}`} />
            <span className="text-sm text-indigo-100 font-medium">
              {isConnected ? 'AI Connected' : 'AI Disconnected'}
            </span>
            {onTestConnection && (
              <button
                onClick={onTestConnection}
                disabled={isLoading}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
                title="Test AI connection"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-800/30">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 mt-12">
            <Bot className="w-20 h-20 mx-auto mb-6 text-slate-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-3 text-slate-300">Welcome to Flow DeFi Assistant</h3>
            <p className="text-base max-w-md mx-auto leading-relaxed">
              I&apos;m here to help you navigate DeFi on Flow blockchain. Ask me about swapping tokens, 
              staking, lending, or any other DeFi operations!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-4 animate-fadeInUp",
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg",
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                )}
              >
                {message.sender === 'user' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "max-w-xs lg:max-w-md px-5 py-4 rounded-2xl shadow-lg backdrop-blur-sm",
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white ml-auto'
                    : 'bg-slate-700/70 text-slate-100 border border-slate-600/50'
                )}
              >
                {/* Détecter si c'est un résultat formaté */}
                {message.sender === 'agent' && 
                 (message.content.includes('🎉') || 
                  message.content.includes('✅') || 
                  message.content.includes('❌') ||
                  message.content.includes('ℹ️')) ? (
                  <FormattedResult content={message.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
                
                {/* Transaction ID Display */}
                {message.transactionId && (
                  <div className="mt-3 text-xs opacity-75 font-mono bg-black/20 px-2 py-1 rounded">
                    <span className="font-medium">Tx: </span>
                    <span>{message.transactionId.slice(0, 8)}...</span>
                  </div>
                )}

                {/* DeFi Action Display */}
                {message.defiAction && (
                  <div className="mt-3 p-3 bg-white/10 rounded-lg text-xs">
                    <div className="font-medium capitalize text-purple-200">{message.defiAction.type} Operation</div>
                    <div className="opacity-75 text-slate-300">
                      {message.defiAction.details?.function_call && (
                        <div className="font-mono text-xs mt-1">
                          {String(message.defiAction.details.function_call)}
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

                <div className="text-xs opacity-60 mt-2 font-mono">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-slate-700/70 text-slate-100 px-5 py-4 rounded-2xl border border-slate-600/50 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                <span className="text-sm">Assistant is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-600/50 bg-slate-800/40 backdrop-blur-sm p-6">
        <form onSubmit={handleSubmit} className="flex space-x-4">
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
            className="flex-1 px-5 py-3 bg-slate-700/70 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-800/50 disabled:cursor-not-allowed text-slate-100 placeholder-slate-400 backdrop-blur-sm transition-all"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !userAddress || isLoading || !isConnected}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
