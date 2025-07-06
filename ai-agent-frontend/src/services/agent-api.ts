import { createHash } from 'crypto';

// Types pour l'API de l'agent
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

// Digests pré-calculés pour les modèles uAgents
const SCHEMA_DIGESTS = {
  UserMessage: '1da7327702f23243f65e2b2add564993a408226e45f94a85b98466e3199bf723',
  ConfirmationMessage: '737f5945899eb3c8376483df14a7065050935517b669749176465451e24a480d'
};

class AgentAPIService {
  private baseUrl: string;
  private userId: string;

  constructor() {
    // L'agent tourne sur le port 8001 par défaut
    this.baseUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://127.0.0.1:8001';
    this.userId = this.generateUserId();
  }

  private generateUserId(): string {
    // Génère un ID utilisateur unique basé sur le timestamp et un random
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `frontend-user-${timestamp}-${random}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    data: UserMessage | ConfirmationMessage,
    schemaType: 'UserMessage' | 'ConfirmationMessage'
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-uagents-schema-digest': SCHEMA_DIGESTS[schemaType]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error('Erreur lors de la communication avec l\'agent:', error);
      throw new Error(`Erreur de communication avec l'agent: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  async sendMessage(content: string): Promise<ActionResponse> {
    const message: UserMessage = {
      content,
      user_id: this.userId
    };

    return this.makeRequest<ActionResponse>('/talk', message, 'UserMessage');
  }

  async confirmAction(actionId: string, confirmed: boolean): Promise<ActionResponse> {
    const message: ConfirmationMessage = {
      action_id: actionId,
      confirmed,
      user_id: this.userId
    };

    return this.makeRequest<ActionResponse>('/confirm', message, 'ConfirmationMessage');
  }

  // Méthode pour tester la connexion à l'agent
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendMessage('test');
      return response.success;
    } catch (error) {
      console.error('Test de connexion échoué:', error);
      return false;
    }
  }

  // Méthode pour obtenir l'ID utilisateur actuel
  getUserId(): string {
    return this.userId;
  }
}

// Instance singleton du service
export const agentAPI = new AgentAPIService(); 