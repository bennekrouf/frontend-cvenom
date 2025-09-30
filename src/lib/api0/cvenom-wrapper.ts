// Application-specific wrapper with CV logic
import { API0Client } from './core';
import { API0AnalysisResult } from './core/types';
import { StandardApiResponse } from './adapters/types';
import { adaptAPI0AnalysisToStandardResponse, adaptAPI0ExecutionToStandardResponse } from './adapters';
import { getAuth } from 'firebase/auth';
import { FileAttachment } from '@/utils/chatUtils';

export class CVenomAPI0Wrapper {
  private client: API0Client;

  constructor(baseUrl: string, apiKey: string) {
    this.client = new API0Client(baseUrl, apiKey);
  }

  async processAndExecuteStandard(
    sentence: string,
    attachments: FileAttachment[] = []
  ): Promise<{
    success: boolean;
    data?: StandardApiResponse;
    error?: string;
  }> {
    try {
      const analysisResults = await this.client.analyzeSentence(sentence, attachments);

      if (analysisResults.length === 0) {
        return {
          success: false,
          error: 'I didn\'t understand that command. Try being more specific about what you want to do.'
        };
      }

      const bestMatch = analysisResults[0];

      // Handle responses that don't need execution
      if (bestMatch.intent === 1 || bestMatch.intent === 2 ||
        (bestMatch.api_group_id === 'conversation' && bestMatch.endpoint_id === 'general_conversation')) {
        const standardResponse = adaptAPI0AnalysisToStandardResponse(analysisResults);
        return {
          success: true,
          data: standardResponse
        };
      }

      // Check if required fields are missing
      const { completion_percentage, missing_required_fields } = bestMatch.matching_info;
      if (completion_percentage < 100 || missing_required_fields.length > 0) {
        return {
          success: true,
          data: {
            type: 'text',
            success: true,
            message: bestMatch.user_prompt || 'Please provide more information to continue.',
            conversation_id: bestMatch.conversation_id
          } satisfies StandardApiResponse
        };
      }

      // Execute endpoint with CV-specific processing
      const params = this.client.extractParameters(bestMatch.parameters);

      // CV-specific: lowercase person names
      if (params.person) {
        params.person = params.person.toLowerCase();
      }

      const executionResult = await this.client.executeEndpoint(
        bestMatch,
        params,
        this.getCVenomAuthToken
      );

      // CV-specific: enhance filename
      if (executionResult.type === 'pdf' && executionResult.blob) {
        executionResult.filename = this.generateCVFilename(bestMatch, params);
      }

      const standardResponse = adaptAPI0ExecutionToStandardResponse(executionResult);

      return {
        success: true,
        data: standardResponse
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed'
      };
    }
  }

  private generateCVFilename(endpoint: API0AnalysisResult, params: Record<string, string>): string {
    if (endpoint.endpoint_name.toLowerCase().includes('cv') ||
      endpoint.endpoint_name.toLowerCase().includes('resume')) {
      const person = params.person || params.name || 'document';
      const template = params.template || 'default';
      const lang = params.lang || params.language || 'en';
      return `cv-${person}-${lang}-${template}.pdf`;
    }
    return 'document.pdf';
  }

  private async getCVenomAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to use this command');
    return user.getIdToken();
  }

  // Delegate methods
  getConversationId() { return this.client.getConversationId(); }
  resetConversation() { this.client.resetConversation(); }
  setConversationId(id: string) { this.client.setConversationId(id); }
  startConversation(context?: Record<string, unknown>) {
    return this.client.startConversation(context);
  }
}

// Singleton
let instance: CVenomAPI0Wrapper | null = null;

export function initAPI0(): CVenomAPI0Wrapper {
  const baseUrl = process.env.NEXT_PUBLIC_API0_BASE_URL || 'http://localhost:5009';
  const apiKey = process.env.NEXT_PUBLIC_API0_API_KEY;

  if (!apiKey) {
    throw new Error('API0_API_KEY not configured');
  }

  instance = new CVenomAPI0Wrapper(baseUrl, apiKey);
  return instance;
}

export function getAPI0(): CVenomAPI0Wrapper {
  if (!instance) {
    instance = initAPI0();
  }
  return instance;
}
