import { useState, useCallback, useRef } from 'react';
import { agentAPI, ActionResponse } from '@/services/agent-api';
import { Message } from '@/types';

interface UseAgentChatReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  pendingActionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  confirmAction: (confirmed: boolean) => Promise<void>;
  testConnection: () => Promise<void>;
  clearMessages: () => void;
}

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const connectionTested = useRef(false);

  const addMessage = useCallback((content: string, sender: 'user' | 'agent', type: 'text' | 'defi-action' = 'text', defiAction?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      type,
      defiAction
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Ajouter le message utilisateur
    addMessage(content, 'user');
    setIsLoading(true);

    try {
      // Envoyer le message à l'agent
      const response: ActionResponse = await agentAPI.sendMessage(content);

      if (response.success) {
        // Ajouter la réponse de l'agent
        addMessage(response.message, 'agent');

        // Si une confirmation est requise, stocker l'action_id
        if (response.requires_confirmation && response.action_id) {
          setPendingActionId(response.action_id);
        } else {
          setPendingActionId(null);
        }

        // Si une fonction a été appelée, l'afficher
        if (response.function_call) {
          addMessage(
            `Fonction exécutée: ${response.function_call}`,
            'agent',
            'defi-action',
            {
              type: 'function_call',
              details: {
                function_call: response.function_call,
                function_result: response.function_result
              }
            }
          );
        }
      } else {
        // Erreur de l'agent
        addMessage(
          "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
          'agent'
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      addMessage(
        "Erreur de connexion avec l'agent AI. Vérifiez que l'agent est démarré sur le port 8001.",
        'agent'
      );
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const confirmAction = useCallback(async (confirmed: boolean) => {
    if (!pendingActionId) return;

    setIsLoading(true);

    try {
      const response: ActionResponse = await agentAPI.confirmAction(pendingActionId, confirmed);

      if (response.success) {
        // Ajouter la réponse de confirmation
        addMessage(response.message, 'agent');

        // Si une fonction a été exécutée, l'afficher
        if (response.function_call) {
          addMessage(
            `Action confirmée et exécutée: ${response.function_call}`,
            'agent',
            'defi-action',
            {
              type: 'function_execution',
              details: {
                function_call: response.function_call,
                function_result: response.function_result
              }
            }
          );
        }

        // Réinitialiser l'action en attente
        setPendingActionId(null);
      } else {
        addMessage(
          "Erreur lors de la confirmation de l'action. Veuillez réessayer.",
          'agent'
        );
      }
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      addMessage(
        "Erreur de connexion lors de la confirmation. Veuillez réessayer.",
        'agent'
      );
    } finally {
      setIsLoading(false);
    }
  }, [pendingActionId, addMessage]);

  const testConnection = useCallback(async () => {
    try {
      const connected = await agentAPI.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        addMessage(
          "✅ Connexion à l'agent AI établie avec succès !",
          'agent'
        );
      } else {
        addMessage(
          "❌ Impossible de se connecter à l'agent AI. Vérifiez que l'agent est démarré.",
          'agent'
        );
      }
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      setIsConnected(false);
      addMessage(
        "❌ Erreur lors du test de connexion à l'agent AI.",
        'agent'
      );
    }
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingActionId(null);
  }, []);

  // Test automatique de la connexion au premier rendu
  if (!connectionTested.current) {
    connectionTested.current = true;
    // Test de connexion différé pour éviter les problèmes de rendu
    setTimeout(() => {
      testConnection();
    }, 1000);
  }

  return {
    messages,
    isLoading,
    isConnected,
    pendingActionId,
    sendMessage,
    confirmAction,
    testConnection,
    clearMessages
  };
} 