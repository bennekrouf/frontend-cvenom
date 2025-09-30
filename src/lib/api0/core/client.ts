import { getAuth } from 'firebase/auth';
import {
  API0AnalysisResult,
  API0ExecutionResult,
  Parameter,
  FileAttachment,
  StartAnalysisRequest,
  StartAnalysisResponse,
  AnalyzeRequest
} from './types';

export class API0Client {
  private baseUrl: string;
  private apiKey: string;
  private conversationId: string | null = null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async startConversation(context?: Record<string, unknown>): Promise<string> {
    const requestBody: StartAnalysisRequest = {
      user_id: await this.getUserId(),
      context
    };

    const response = await fetch(`${this.baseUrl}/api/analyze/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start conversation');
    }

    const result: StartAnalysisResponse = await response.json();
    this.conversationId = result.conversation_id;
    return result.conversation_id;
  }

  async analyzeSentence(sentence: string, attachments: FileAttachment[] = []): Promise<API0AnalysisResult[]> {
    if (!this.conversationId) {
      await this.startConversation();
    }

    const requestBody: AnalyzeRequest = {
      conversation_id: this.conversationId!,
      sentence
    };

    if (attachments.length > 0) {
      const imageAttachments = attachments.filter(att => att.type.startsWith('image/'));
      if (imageAttachments.length > 0) {
        requestBody.images = imageAttachments.map(att => ({
          name: att.name,
          type: att.type,
          data: att.data
        }));
        requestBody.has_images = true;
      }
    }

    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 403 || error.error?.includes('conversation')) {
        this.conversationId = null;
        return this.analyzeSentence(sentence, attachments);
      }
      throw new Error(error.error || 'Analysis failed');
    }

    return response.json();
  }

  async executeEndpoint(
    endpoint: API0AnalysisResult,
    params: Record<string, string>,
    authTokenProvider?: () => Promise<string>
  ): Promise<API0ExecutionResult> {
    // Handle conversation responses
    if (endpoint.endpoint_id.includes('general_conversation')) {
      try {
        const jsonOutput = JSON.parse(endpoint.json_output);
        return {
          type: 'conversation',
          content: jsonOutput.response,
          conversation_id: endpoint.conversation_id,
        };
      } catch (error) {
        console.error('Failed to parse conversation response:', error);
        return {
          type: 'conversation',
          content: 'I can help you with your questions and commands.',
          conversation_id: endpoint.conversation_id,
        };
      }
    }

    const fullUrl = `${endpoint.base}${endpoint.path}`;
    const headers: Record<string, string> = {};

    // Add authentication if provider given
    if (authTokenProvider) {
      const token = await authTokenProvider();
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Prepare request

    headers['Content-Type'] = 'application/json';
    const requestParams = {
      ...params,
      conversation_id: endpoint.conversation_id
    };
    const requestBody: BodyInit = JSON.stringify(requestParams);

    const requestOptions: RequestInit = {
      method: endpoint.verb,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(endpoint.verb.toUpperCase()) ? requestBody : undefined,
    };

    const response = await fetch(fullUrl, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob();
      return {
        type: 'pdf',
        blob: blob,
        filename: 'document.pdf', // Generic - app should override
        endpoint_name: endpoint.endpoint_name,
        conversation_id: endpoint.conversation_id,
      };
    } else if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      return {
        type: 'json',
        data: jsonData,
        endpoint_name: endpoint.endpoint_name,
        conversation_id: endpoint.conversation_id,
      };
    } else {
      const textData = await response.text();
      return {
        type: 'text',
        content: textData,
        endpoint_name: endpoint.endpoint_name,
        conversation_id: endpoint.conversation_id,
      };
    }
  }

  getConversationId(): string | null {
    return this.conversationId;
  }

  resetConversation(): void {
    this.conversationId = null;
  }

  setConversationId(id: string): void {
    this.conversationId = id;
  }

  private async getUserId(): Promise<string | undefined> {
    const auth = getAuth();
    return auth.currentUser?.uid;
  }

  extractParameters(parameters: Parameter[]): Record<string, string> {
    const params: Record<string, string> = {};
    parameters.forEach(param => {
      const value = param.semantic_value || param.value;
      if (value) {
        params[param.name] = value;
      }
    });
    return params;
  }
}
