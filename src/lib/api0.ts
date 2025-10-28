import { getAuth } from 'firebase/auth';
import type { FileAttachment } from '@/types/chat';

// Validate required environment variables at module load time
const validateEnvVars = () => {
  const requiredVars = {
    NEXT_PUBLIC_API0_BASE_URL: process.env.NEXT_PUBLIC_API0_BASE_URL,
    NEXT_PUBLIC_API0_API_KEY: process.env.NEXT_PUBLIC_API0_API_KEY
  };

  const missing = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    const error = `❌ FATAL: Missing required environment variables: ${missing.join(', ')}`;
    console.error(error);
    throw new Error(error);
  }

  console.log('✅ API0 environment variables validated');
  return requiredVars;
};

const envVars = validateEnvVars();
const API0_BASE = envVars.NEXT_PUBLIC_API0_BASE_URL!;
const API0_KEY = envVars.NEXT_PUBLIC_API0_API_KEY!;

let conversationId: string | null = null;

// Type definitions
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

// Direct API calls with proper error handling
async function analyze(sentence: string, attachments: FileAttachment[] = []): Promise<API0AnalysisResult[]> {
  if (!conversationId) {
    const startRes = await fetch(`${API0_BASE}/api/analyze/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API0_KEY}`, 'Content-Type': 'application/json' },
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

  const res = await fetch(`${API0_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API0_KEY}`, 'Content-Type': 'application/json' },
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

  // Add error handling for execute function too
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

// Enhanced processCommand with better error handling
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
      if (val) params[p.name] = p.name === 'person' ? val.toLowerCase() : val;
    });

    const result = await execute(match, params);

    // Format response
    if (result.type === 'pdf') {
      const person = params.person || 'document';
      const template = params.template || 'default';
      const lang = params.lang || 'en';
      return {
        success: true,
        data: {
          type: 'file',
          success: true,
          message: 'CV ready for download',
          file_type: 'pdf',
          filename: `cv-${person}-${lang}-${template}.pdf`,
          blob_data: result.blob,
          conversation_id: result.conversation_id
        }
      };
    }

    if (result.type === 'json') {
      return {
        success: true,
        data: {
          type: 'data',
          success: true,
          message: 'Data retrieved',
          data: result.data,
          conversation_id: result.conversation_id
        }
      };
    }

    return {
      success: true,
      data: {
        type: 'text',
        success: true,
        message: result.content || 'Response received',
        conversation_id: result.conversation_id
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Return a properly formatted error response
    return {
      success: false,
      data: {
        type: 'error',
        success: false,
        error: errorMessage,
        suggestions: errorMessage.includes('Authentication failed') ? [
          'Check if your API0 key is configured correctly',
          'Verify the API service is running',
          'Contact support if the issue persists'
        ] : [
          'Try again in a moment',
          'Check your internet connection',
          'Contact support if the problem continues'
        ]
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
