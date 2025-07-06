/**
 * Service pour formater les résultats d'actions via GPT-4o-mini
 * Rend les résultats techniques plus lisibles et agréables
 */

interface FormatResultRequest {
  actionType: string;
  functionResult: string;
  userMessage?: string;
}

interface FormatResultResponse {
  success: boolean;
  formattedMessage: string;
  error?: string;
}

class ResultFormatterService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ NEXT_PUBLIC_OPENAI_API_KEY non définie');
    }
  }

  /**
   * Formate un résultat d'action via GPT-4o-mini
   */
  async formatResult(request: FormatResultRequest): Promise<FormatResultResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        formattedMessage: request.functionResult,
        error: 'Clé API OpenAI non configurée'
      };
    }

    try {
      const prompt = this.buildPrompt(request);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant spécialisé dans la présentation de résultats d'opérations blockchain Flow. 
              Tu dois rendre les résultats techniques plus lisibles, agréables et compréhensibles pour un utilisateur final.
              
              Règles importantes :
              - Utilise un ton amical et professionnel
              - Ajoute des emojis appropriés pour rendre le message plus vivant
              - Structure l'information de manière claire
              - Explique les termes techniques en langage simple
              - Si c'est un succès, félicite l'utilisateur
              - Si c'est une erreur, sois encourageant et suggère des solutions
              - Garde le message concis mais informatif
              - Utilise le français`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API OpenAI: ${response.status}`);
      }

      const data = await response.json();
      const formattedMessage = data.choices[0]?.message?.content || request.functionResult;

      return {
        success: true,
        formattedMessage: formattedMessage.trim()
      };

    } catch (error) {
      console.error('❌ Erreur lors du formatage:', error);
      return {
        success: false,
        formattedMessage: request.functionResult,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Construit le prompt pour GPT-4o-mini
   */
  private buildPrompt(request: FormatResultRequest): string {
    const { actionType, functionResult, userMessage } = request;

    let context = '';
    switch (actionType.toLowerCase()) {
      case 'stake':
        context = 'stake de tokens FLOW';
        break;
      case 'swap':
        context = 'échange de tokens';
        break;
      case 'vault':
        context = 'opération sur un vault (dépôt, retrait, rachat)';
        break;
      case 'balance':
        context = 'vérification de solde';
        break;
      default:
        context = 'opération blockchain';
    }

    return `Voici le résultat d'une ${context} :

Type d'action : ${actionType}
Message utilisateur original : ${userMessage || 'Non spécifié'}
Résultat technique : ${functionResult}

Peux-tu reformater ce résultat pour qu'il soit plus agréable et compréhensible pour l'utilisateur final ?`;
  }

  /**
   * Formate rapidement un résultat simple (fallback)
   */
  formatSimpleResult(actionType: string, functionResult: string): string {
    try {
      const result = JSON.parse(functionResult);
      
      if (result.success) {
        return `🎉 ${result.message || 'Opération réussie !'}`;
      } else {
        return `❌ ${result.message || 'Une erreur est survenue'}`;
      }
    } catch {
      // Si ce n'est pas du JSON, retourner tel quel
      return functionResult;
    }
  }
}

// Instance singleton
export const resultFormatter = new ResultFormatterService();

// Types exportés
export type { FormatResultRequest, FormatResultResponse }; 