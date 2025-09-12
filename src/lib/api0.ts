// lib/api0.ts - Enhanced with conversation management
import { getAuth } from 'firebase/auth';

interface Parameter {
  name: string;
  description: string;
  semantic_value?: string;
  value?: string;
}

interface AnalysisResult {
  endpoint_id: string;
  endpoint_name: string;
  endpoint_description: string;
  api_group_id: string;
  api_group_name: string;
  base: string;
  path: string;
  essential_path: string;
  verb: string;
  parameters: Parameter[];
  json_output: string;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
  preview?: string;
}

interface StartAnalysisRequest {
  user_id?: string;
  context?: Record<string, unknown>;
}

interface StartAnalysisResponse {
  conversation_id: string;
  success: boolean;
  message?: string;
}

interface AnalyzeRequest {
  conversation_id: string;
  sentence: string;
  images?: Array<{
    name: string;
    type: string;
    data: string;
  }>;
  has_images?: boolean;
  context?: Record<string, unknown>;
}

class API0Service {
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

  async analyzeSentence(sentence: string, attachments: FileAttachment[] = []): Promise<AnalysisResult[]> {
    // Ensure we have a conversation ID
    if (!this.conversationId) {
      await this.startConversation();
    }

    const requestBody: AnalyzeRequest = {
      conversation_id: this.conversationId!,
      sentence
    };

    // Add image context if there are image attachments
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

      // Handle conversation ID validation errors
      if (response.status === 403 || error.error?.includes('conversation')) {
        // Reset conversation ID and retry once
        this.conversationId = null;
        return this.analyzeSentence(sentence, attachments);
      }

      throw new Error(error.error || 'Analysis failed');
    }

    return response.json();
  }

  async processAndExecute(sentence: string, attachments: FileAttachment[] = []): Promise<Record<string, unknown>> {
    const results = await this.analyzeSentence(sentence, attachments);

    if (results.length === 0) {
      throw new Error('I didn\'t understand that command. Try being more specific about what you want to do.');
    }

    // Get the best match (first result)
    const bestMatch = results[0];

    // Extract parameters from API0 response
    const params = this.extractParameters(bestMatch.parameters);

    return this.executeEndpoint(bestMatch, params);
  }

  // Get current conversation ID
  getConversationId(): string | null {
    return this.conversationId;
  }

  // Reset conversation (useful for new chat sessions)
  resetConversation(): void {
    this.conversationId = null;
  }

  // Set conversation ID (useful when restoring a session)
  setConversationId(id: string): void {
    this.conversationId = id;
  }

  private async getUserId(): Promise<string | undefined> {
    const auth = getAuth();
    return auth.currentUser?.uid;
  }

  private extractParameters(parameters: Parameter[]): Record<string, string> {
    const params: Record<string, string> = {};
    parameters.forEach(param => {
      const value = param.semantic_value || param.value;
      if (value) {
        params[param.name] = value;
      }
    });
    return params;
  }

  private async executeEndpoint(endpoint: AnalysisResult, params: Record<string, string>): Promise<Record<string, unknown>> {
    // Handle general conversation responses
    if (endpoint.api_group_id === 'conversation' && endpoint.endpoint_id === 'general_conversation') {
      try {
        const jsonOutput = JSON.parse(endpoint.json_output);
        return {
          type: 'conversation',
          content: jsonOutput.response,
          intent: jsonOutput.intent,
          endpoint_name: endpoint.endpoint_name,
          conversation_id: this.conversationId,
        };
      } catch (error) {
        console.error('Failed to parse conversation response:', error);
        return {
          type: 'conversation',
          content: 'I can help you with CV-related questions and commands.',
          intent: 'general_question',
          endpoint_name: endpoint.endpoint_name,
          conversation_id: this.conversationId,
        };
      }
    }

    // For action endpoints, construct the full URL using base + path from API0
    const fullUrl = `${endpoint.base}${endpoint.path}`;

    // Prepare headers
    const headers: Record<string, string> = {};

    // Add authentication if needed (for CVenom endpoints)
    if (this.needsAuth(endpoint.base)) {
      const token = await this.getCVenonAuth();
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Prepare request body based on endpoint type
    let requestBody: BodyInit;

    // Check if this is an image upload endpoint that needs FormData
    if (endpoint.endpoint_name.toLowerCase().includes('upload') &&
      endpoint.endpoint_name.toLowerCase().includes('picture')) {

      throw new Error('Image uploads should be handled by the React component with proper file handling');
    } else {
      // Regular JSON request - include conversation_id in params
      headers['Content-Type'] = 'application/json';
      const requestParams = {
        ...params,
        conversation_id: this.conversationId
      };
      requestBody = JSON.stringify(requestParams);
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method: endpoint.verb,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(endpoint.verb.toUpperCase()) ? requestBody : undefined,
    };

    // Make the actual API call
    const response = await fetch(fullUrl, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${errorText}`);
    }

    // Handle different response types
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob();
      return {
        type: 'pdf',
        blob: blob,
        filename: this.generateFilename(endpoint, params),
        endpoint_name: endpoint.endpoint_name,
        conversation_id: this.conversationId,
      };
    } else if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      return {
        type: 'json',
        data: jsonData,
        endpoint_name: endpoint.endpoint_name,
        message: this.generateSuccessMessage(endpoint, params),
        conversation_id: this.conversationId,
      };
    } else {
      const textData = await response.text();
      return {
        type: 'text',
        content: textData,
        endpoint_name: endpoint.endpoint_name,
        message: this.generateSuccessMessage(endpoint, params),
        conversation_id: this.conversationId,
      };
    }
  }

  private needsAuth(baseUrl: string): boolean {
    return baseUrl.includes('localhost:4002') ||
      baseUrl.includes('cv.') ||
      baseUrl.includes('cvenom') ||
      baseUrl.includes('127.0.0.1:4002');
  }

  private async getCVenonAuth(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in to use this command');
    return user.getIdToken();
  }

  private generateFilename(endpoint: AnalysisResult, params: Record<string, string>): string {
    if (endpoint.endpoint_name.toLowerCase().includes('cv') ||
      endpoint.endpoint_name.toLowerCase().includes('resume')) {
      const person = params.person || params.name || 'document';
      const template = params.template || 'default';
      return `${person}-cv-${template}.pdf`;
    }
    return 'document.pdf';
  }

  private generateSuccessMessage(endpoint: AnalysisResult, params: Record<string, string>): string {
    const action = endpoint.endpoint_name;
    const person = params.person || params.name;

    if (person) {
      return `✅ ${action} completed successfully for ${person}`;
    }
    return `✅ ${action} completed successfully`;
  }
}

// Singleton instance
let api0Service: API0Service | null = null;

export function initAPI0(): API0Service {
  const baseUrl = process.env.NEXT_PUBLIC_API0_BASE_URL || 'http://localhost:5009';
  const apiKey = process.env.NEXT_PUBLIC_API0_API_KEY;

  if (!apiKey) {
    throw new Error('API0_API_KEY not configured');
  }

  api0Service = new API0Service(baseUrl, apiKey);
  return api0Service;
}

export function getAPI0(): API0Service {
  if (!api0Service) {
    api0Service = initAPI0();
  }
  return api0Service;
}

export type { AnalysisResult, Parameter, FileAttachment, StartAnalysisResponse, AnalyzeRequest };
