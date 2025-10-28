// src/lib/api0.ts
import { getAuth } from 'firebase/auth';
import type { FileAttachment } from '@/types/chat';

// Runtime configuration - fetched from API
let runtimeConfig: { API0_BASE_URL: string; API0_API_KEY: string } | null = null;

// Fetch runtime configuration from API route
async function getRuntimeConfig() {
  if (!runtimeConfig) {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to fetch runtime config');
      }
      runtimeConfig = await response.json();

      // Validate required variables
      if (!runtimeConfig?.API0_API_KEY || !runtimeConfig?.API0_BASE_URL) {
        throw new Error('❌ FATAL: Missing required runtime configuration');
      }

      console.log('✅ Runtime configuration loaded');
    } catch (error) {
      console.error('❌ Failed to load runtime config:', error);
      throw error;
    }
  }
  return runtimeConfig;
}

let conversationId: string | null = null;

// Type definitions (keep existing ones)
interface API0Parameter {
  name: string;
  description: string;
  semantic_value?: string;
  value?: string;
}

interface API0MatchingInfo {
  completion_percentage: number;
  mapped_optional_fields: number;
  mapped_required_fields: number;
  missing_optional_fields: string[];
  missing_required_fields: string[];
  status: number;
  total_optional_fields: number;
  total_required_fields: number;
}

interface API0AnalysisResult {
  api_group_id: string;
  api_group_name: string;
  base: string;
  conversation_id: string;
  endpoint_description: string;
  endpoint_id: string;
  endpoint_name: string;
  essential_path: string;
  intent: number;
  json_output: string;
  user_prompt: string;
  matching_info: API0MatchingInfo;
  parameters: API0Parameter[];
  path: string;
  verb: string;
}

interface ExecutionResult {
  type: 'pdf' | 'json' | 'text';
  blob?: Blob;
  data?: unknown;
  content?: string;
  conversation_id: string;
}

export type StandardApiResponse =
  | {
    type: 'text';
    success: true;
    message: string;
    conversation_id?: string;
  }
  | {
    type: 'file';
    success: true;
    message: string;
    file_type: string;
    filename: string;
    download_url?: string;
    blob_data?: Blob;
    conversation_id?: string;
  }
  | {
    type: 'data';
    success: true;
    message: string;
    data: unknown;
    conversation_id?: string;
  }
  | {
    type: 'action';
    success: true;
    message: string;
    action?: string;
    next_actions?: string[];
    conversation_id?: string;
  }
  | {
    type: 'error';
    success: false;
    error: string;
    error_code?: string;
    suggestions?: string[];
    conversation_id?: string;
  };

// Updated analyze function with runtime config
async function analyze(sentence: string, attachments: FileAttachment[] = []): Promise<API0AnalysisResult[]> {
  const config = await getRuntimeConfig();

  if (!conversationId) {
    const startRes = await fetch(`${config.API0_BASE_URL}/api/analyze/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.API0_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: getAuth().currentUser?.uid })
    });

    if (!startRes.ok) {
      const errorData = await startRes.json().catch(() => ({ error: 'Unknown error' }));
      if (startRes.status === 401) {
        throw new Error('Authentication failed: Invalid or missing API key');
      }
      throw new Error(errorData.error || `Request failed with status ${startRes.status}`);
    }

    const startData = await startRes.json();
    conversationId = startData.conversation_id;
  }

  const body: Record<string, unknown> = { conversation_id: conversationId, sentence };

  if (attachments.some(a => a.type.startsWith('image/'))) {
    body.images = attachments.filter(a => a.type.startsWith('image/')).map(a => ({
      name: a.name, type: a.type, data: a.data
    }));
    body.has_images = true;
  }

  const res = await fetch(`${config.API0_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.API0_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    if (res.status === 401) {
      throw new Error('Authentication failed: Invalid or missing API key');
    }
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// Keep the rest of your functions unchanged...
async function execute(endpoint: API0AnalysisResult, params: Record<string, string>): Promise<ExecutionResult> {
  const token = await getAuth().currentUser?.getIdToken();

  const res = await fetch(`${endpoint.base}${endpoint.path}`, {
    method: endpoint.verb,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    body: ['POST', 'PUT', 'PATCH'].includes(endpoint.verb)
      ? JSON.stringify({ ...params, conversation_id: endpoint.conversation_id })
      : undefined
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    if (res.status === 401) {
      throw new Error('Authentication failed: Session expired or invalid token');
    }
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  const contentType = res.headers.get('content-type');

  if (contentType?.includes('application/pdf')) {
    return { type: 'pdf', blob: await res.blob(), conversation_id: endpoint.conversation_id };
  }
  if (contentType?.includes('application/json')) {
    return { type: 'json', data: await res.json(), conversation_id: endpoint.conversation_id };
  }
  return { type: 'text', content: await res.text(), conversation_id: endpoint.conversation_id };
}

// Enhanced processCommand with runtime config
export async function processCommand(
  sentence: string,
  attachments: FileAttachment[] = []
): Promise<{ success: boolean; data?: StandardApiResponse; error?: string }> {
  try {
    const results = await analyze(sentence, attachments);
    if (results.length === 0) {
      return {
        success: false,
        data: {
          type: 'error',
          success: false,
          error: 'Command not understood',
          suggestions: [
            'Try rephrasing your request',
            'Use specific command keywords like "generate", "create", "show"',
            'Include person names in lowercase with hyphens (e.g., "john-doe")'
          ]
        }
      };
    }

    const match = results[0];

    // Handle conversation responses
    if (match.intent !== 0 || match.api_group_id === 'conversation') {
      const json = JSON.parse(match.json_output);
      return {
        success: true,
        data: {
          type: 'text',
          success: true,
          message: json.response || json.content,
          conversation_id: match.conversation_id
        }
      };
    }

    // Check completeness
    if (match.matching_info.completion_percentage < 100) {
      return {
        success: true,
        data: {
          type: 'text',
          success: true,
          message: match.user_prompt,
          conversation_id: match.conversation_id
        }
      };
    }

    // Execute
    const params: Record<string, string> = {};
    match.parameters.forEach((p: API0Parameter) => {
      const val = p.semantic_value || p.value;
      if (val) params[p.name] = val;
    });

    const result = await execute(match, params);

    switch (result.type) {
      case 'pdf':
        if (result.blob) {
          const url = URL.createObjectURL(result.blob);
          return {
            success: true,
            data: {
              type: 'file',
              success: true,
              message: 'PDF generated successfully',
              file_type: 'pdf',
              filename: 'generated.pdf',
              download_url: url,
              blob_data: result.blob,
              conversation_id: result.conversation_id
            }
          };
        }
        break;

      case 'json':
        return {
          success: true,
          data: {
            type: 'data',
            success: true,
            message: 'Data retrieved successfully',
            data: result.data,
            conversation_id: result.conversation_id
          }
        };

      case 'text':
        return {
          success: true,
          data: {
            type: 'text',
            success: true,
            message: result.content || 'Operation completed',
            conversation_id: result.conversation_id
          }
        };
    }

    return {
      success: false,
      data: {
        type: 'error',
        success: false,
        error: 'Unexpected response format'
      }
    };
  } catch (error) {
    console.error('Command processing error:', error);
    return {
      success: false,
      data: {
        type: 'error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }
}

export function resetConversation() {
  conversationId = null;
}

export function getConversationId() {
  return conversationId;
}
