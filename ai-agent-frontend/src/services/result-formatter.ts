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
      console.warn('⚠️ NEXT_PUBLIC_OPENAI_API_KEY is not set');
    }
  }

  /**
   * Formats an action result via GPT-4o-mini.
   */
  async formatResult(request: FormatResultRequest): Promise<FormatResultResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        formattedMessage: request.functionResult,
        error: 'OpenAI API key not configured'
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
              content: `You are an assistant specialized in presenting the results of Flow blockchain operations.
              You must make technical results more readable, pleasant, and understandable for an end-user.
              
              Important rules:
              - Use a friendly and professional tone
              - Add appropriate emojis to make the message more lively
              - Structure the information clearly
              - Explain technical terms in simple language
              - If it's a success, congratulate the user
              - If it's an error, be encouraging and suggest solutions
              - Keep the message concise but informative
              - Use English`
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
        throw new Error(`OpenAI API Error: ${response.status}`);
      }

      const data = await response.json();
      const formattedMessage = data.choices[0]?.message?.content || request.functionResult;

      return {
        success: true,
        formattedMessage: formattedMessage.trim()
      };

    } catch (error) {
      console.error('❌ Error during formatting:', error);
      return {
        success: false,
        formattedMessage: request.functionResult,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildPrompt(request: FormatResultRequest): string {
    const { actionType, functionResult, userMessage } = request;

    let context = '';
    switch (actionType.toLowerCase()) {
      case 'stake':
        context = 'staking FLOW tokens';
        break;
      case 'swap':
        context = 'a token swap';
        break;
      case 'vault':
        context = 'a vault operation (deposit, withdrawal, redemption)';
        break;
      case 'balance':
        context = 'a balance check';
        break;
      default:
        context = 'a blockchain operation';
    }

    return `Here is the result of ${context}:

Action Type: ${actionType}
Original user message: ${userMessage || 'Not specified'}
Technical result: ${functionResult}

Can you reformat this result to make it more pleasant and understandable for the end-user?`;
  }

  formatSimpleResult(actionType: string, functionResult: string): string {
    try {
      const result = JSON.parse(functionResult);
      
      if (result.success) {
        return `🎉 ${result.message || 'Operation successful!'}`;
      } else {
        return `❌ ${result.message || 'An error occurred'}`;
      }
    } catch {
      return functionResult;
    }
  }
}

export const resultFormatter = new ResultFormatterService();

export type { FormatResultRequest, FormatResultResponse };