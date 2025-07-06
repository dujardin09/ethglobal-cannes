import { useState, useCallback, useRef } from 'react';
import { agentAPI, ActionResponse } from '@/services/agent-api';
import { Message } from '@/types';
import { resultFormatter } from '@/services/result-formatter';

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
  const currentActionIdRef = useRef<string | null>(null);

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
          currentActionIdRef.current = response.action_id;
          console.log('🔔 Confirmation requise pour action:', response.action_id);
        } else {
          // Vérifier si le message contient des indices de confirmation même si requires_confirmation est false
          const confirmationKeywords = [
            'confirmation requise',
            'confirmez-vous',
            '⚠️',
            'répondez à l\'endpoint /confirm'
          ];
          
          const needsConfirmation = confirmationKeywords.some(keyword => 
            response.message.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (needsConfirmation && response.action_id) {
            setPendingActionId(response.action_id);
            currentActionIdRef.current = response.action_id;
            console.log('🔔 Confirmation détectée dans le message pour action:', response.action_id);
          } else {
            setPendingActionId(null);
            currentActionIdRef.current = null;
          }
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
    const actionId = currentActionIdRef.current;
    if (!actionId) {
      console.error('❌ Aucune action en attente de confirmation');
      addMessage("Aucune action en attente de confirmation.", 'agent');
      return;
    }

    console.log('🔔 Confirmation de l\'action:', actionId, 'avec confirmed:', confirmed);
    setIsLoading(true);

    try {
      const response: ActionResponse = await agentAPI.confirmAction(actionId, confirmed);

      if (response.success) {
        // Si une fonction a été exécutée, formater le résultat et remplacer le message
        if (response.function_result) {
          console.log('🔔 Formatage du résultat avec GPT-4o-mini...');
          
          // Détecter le type d'action à partir du message ou du function_call
          let actionType = 'unknown';
          const messageLower = response.message.toLowerCase();
          if (messageLower.includes('stake') || messageLower.includes('staking')) actionType = 'stake';
          else if (messageLower.includes('swap')) actionType = 'swap';
          else if (messageLower.includes('vault')) actionType = 'vault';
          else if (messageLower.includes('balance')) actionType = 'balance';

          // Formater le résultat via GPT-4o-mini
          const formattedResult = await resultFormatter.formatResult({
            actionType,
            functionResult: response.function_result,
            userMessage: messages[messages.length - 2]?.content // Message utilisateur précédent
          });

          if (formattedResult.success) {
            // Remplacer complètement le message par le résultat formaté
            addMessage(formattedResult.formattedMessage, 'agent');
          } else {
            // Fallback si le formatage échoue
            const simpleResult = resultFormatter.formatSimpleResult(actionType, response.function_result);
            addMessage(simpleResult, 'agent');
          }
        } else {
          // Si pas de function_result, afficher le message normal
          addMessage(response.message, 'agent');
        }

        // Réinitialiser l'action en attente
        setPendingActionId(null);
        currentActionIdRef.current = null;
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
  }, [addMessage, messages]);

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
    currentActionIdRef.current = null;
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