// Types pour les messages de chat
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'transaction' | 'defi-action';
  transactionId?: string;
  defiAction?: {
    type: 'swap' | 'stake' | 'lend' | 'borrow' | 'vault' | 'function_call' | 'function_execution';
    details: Record<string, unknown>;
  };
}

// Ré-export des types de l'agent
export * from './agent';

export interface FlowUser {
  loggedIn: boolean;
  addr?: string;
  cid?: string;
}

export interface DefiOperation {
  id: string;
  type: 'swap' | 'stake' | 'lend' | 'borrow';
  status: 'pending' | 'confirmed' | 'failed';
  amount?: string;
  token?: string;
  estimatedGas?: string;
  transactionId?: string;
}
