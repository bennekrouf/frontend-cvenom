// lib/api0.ts
import { getAuth } from 'firebase/auth';

interface Parameter {
  name: string;
  description: string;
  semantic_value?: string;
  value?: string; // Add this for compatibility
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

class API0Service {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async analyzeSentence(sentence: string, attachments: FileAttachment[] = []): Promise<AnalysisResult[]> {
    const requestBody: Record<string, unknown> = { sentence };

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

    // Check if this is an image upload operation
    const isImageUpload = attachments.some(att => att.type.startsWith('image/')) &&
      (bestMatch.endpoint_name.toLowerCase().includes('upload') ||
        bestMatch.endpoint_name.toLowerCase().includes('picture') ||
        bestMatch.api_group_id === 'image_operations');

    if (isImageUpload) {
      return this.executeImageUpload(bestMatch, params, attachments);
    }

    // Execute the endpoint using the structured data from API0
    return this.executeEndpoint(bestMatch, params);
  }

  private async executeImageUpload(
    endpoint: AnalysisResult,
    params: Record<string, string>,
    attachments: FileAttachment[]
  ): Promise<Record<string, unknown>> {
    // Find the person parameter
    const personName = params.person || params.name;
    if (!personName) {
      throw new Error('Please specify which collaborator to upload the image for (e.g., "Upload picture for john-doe")');
    }

    // Get the first image attachment
    const imageAttachment = attachments.find(att => att.type.startsWith('image/'));
    if (!imageAttachment) {
      throw new Error('No image attachment found');
    }

    try {
      // Get authentication token
      const token = await this.getCVenonAuth();

      // Convert base64 to blob
      const binaryString = atob(imageAttachment.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: imageAttachment.type });
      const file = new File([blob], imageAttachment.name, { type: imageAttachment.type });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('person', personName);
      formData.append('file', file);

      // Upload using the CVenom API endpoint
      const uploadUrl = `${endpoint.base}/upload-picture`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await response.json();

      return {
        type: 'image_upload',
        success: true,
        message: `Profile picture uploaded successfully for ${personName}`,
        endpoint_name: endpoint.endpoint_name,
        data: {
          person: personName,
          filename: imageAttachment.name,
          ...result
        }
      };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractParameters(parameters: Parameter[]): Record<string, string> {
    const params: Record<string, string> = {};
    parameters.forEach(param => {
      // Handle both semantic_value and value for compatibility
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
        };
      } catch (error) {
        console.error('Failed to parse conversation response:', error);
        return {
          type: 'conversation',
          content: 'I can help you with CV-related questions and commands.',
          intent: 'general_question',
          endpoint_name: endpoint.endpoint_name,
        };
      }
    }

    // For action endpoints, construct the full URL using base + path from API0
    const fullUrl = `${endpoint.base}${endpoint.path}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication if needed (for CVenom endpoints)
    if (this.needsAuth(endpoint.base)) {
      const token = await this.getCVenonAuth();
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Prepare request body based on verb
    const requestOptions: RequestInit = {
      method: endpoint.verb,
      headers,
    };

    // Add body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.verb.toUpperCase())) {
      requestOptions.body = JSON.stringify(params);
    }

    // Make the actual API call
    const response = await fetch(fullUrl, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${errorText}`);
    }

    // Handle different response types
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/pdf')) {
      // Handle PDF downloads
      const blob = await response.blob();
      return {
        type: 'pdf',
        blob: blob,
        filename: this.generateFilename(endpoint, params),
        endpoint_name: endpoint.endpoint_name,
      };
    } else if (contentType?.includes('application/json')) {
      // Handle JSON responses
      const jsonData = await response.json();
      return {
        type: 'json',
        data: jsonData,
        endpoint_name: endpoint.endpoint_name,
        message: this.generateSuccessMessage(endpoint, params),
      };
    } else {
      // Handle text responses
      const textData = await response.text();
      return {
        type: 'text',
        content: textData,
        endpoint_name: endpoint.endpoint_name,
        message: this.generateSuccessMessage(endpoint, params),
      };
    }
  }

  private needsAuth(baseUrl: string): boolean {
    // Check if this is a CVenom endpoint that needs authentication
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
    // Generate appropriate filename based on endpoint and parameters
    if (endpoint.endpoint_name.toLowerCase().includes('cv') ||
      endpoint.endpoint_name.toLowerCase().includes('resume')) {
      const person = params.person || params.name || 'document';
      const template = params.template || 'default';
      return `${person}-cv-${template}.pdf`;
    }
    return 'document.pdf';
  }

  private generateSuccessMessage(endpoint: AnalysisResult, params: Record<string, string>): string {
    // Generate contextual success message
    const action = endpoint.endpoint_name;
    const person = params.person || params.name;

    if (person) {
      return `✅ ${action} completed successfully for ${person}`;
    }
    return `✅ ${action} completed successfully`;
  }
}

// Singleton instance - initialized with server-side API key
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

export type { AnalysisResult, Parameter, FileAttachment };
