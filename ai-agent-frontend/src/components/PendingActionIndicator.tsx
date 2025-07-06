import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface PendingActionIndicatorProps {
  isVisible: boolean;
  actionId?: string | null;
}

export default function PendingActionIndicator({ 
  isVisible, 
  actionId 
}: PendingActionIndicatorProps) {
  if (!isVisible || !actionId) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg border border-yellow-600 animate-pulse">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Action en attente</span>
        </div>
        <div className="text-xs opacity-90 mt-1">
          ID: {actionId.slice(-8)}...
        </div>
      </div>
    </div>
  );
} 