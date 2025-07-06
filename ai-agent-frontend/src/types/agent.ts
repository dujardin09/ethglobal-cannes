// Types pour l'API de l'agent AI

export interface UserMessage {
  content: string;
  user_id: string;
}

export interface ConfirmationMessage {
  action_id: string;
  confirmed: boolean;
  user_id: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  function_call?: string | null;
  function_result?: string | null;
  requires_confirmation: boolean;
  action_id?: string | null;
}

// Types pour les actions DeFi
export interface DefiAction {
  type: 'stake' | 'swap' | 'lend' | 'borrow' | 'vault' | 'function_call' | 'function_execution';
  details?: {
    function_call?: string;
    function_result?: string;
    [key: string]: any;
  };
}

// Types pour les messages étendus
export interface AgentMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type: 'text' | 'defi-action';
  defiAction?: DefiAction;
  transactionId?: string;
}

// Types pour l'état de la conversation
export interface ChatState {
  messages: AgentMessage[];
  isLoading: boolean;
  isConnected: boolean;
  pendingActionId: string | null;
}

// Types pour les erreurs
export interface AgentError {
  message: string;
  code?: string;
  details?: any;
}

// Types pour les paramètres de configuration
export interface AgentConfig {
  baseUrl: string;
  userId: string;
  timeout?: number;
  retries?: number;
} 