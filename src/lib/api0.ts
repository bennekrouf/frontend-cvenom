// lib/api0.ts
import { getAuth } from 'firebase/auth';
import type { FileAttachment } from '@/types/chat';

const API0_BASE = process.env.NEXT_PUBLIC_API0_BASE_URL || 'http://localhost:5009';
const API0_KEY = process.env.NEXT_PUBLIC_API0_API_KEY!;

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
    suggestions?: string[];  // ← Add this property
    conversation_id?: string;
  };

// Direct API calls
async function analyze(sentence: string, attachments: FileAttachment[] = []): Promise<API0AnalysisResult[]> {
  if (!conversationId) {
    const startRes = await fetch(`${API0_BASE}/api/analyze/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API0_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: getAuth().currentUser?.uid })
    });
    conversationId = (await startRes.json()).conversation_id;
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

  const contentType = res.headers.get('content-type');

  if (contentType?.includes('application/pdf')) {
    return { type: 'pdf', blob: await res.blob(), conversation_id: endpoint.conversation_id };
  }
  if (contentType?.includes('application/json')) {
    return { type: 'json', data: await res.json(), conversation_id: endpoint.conversation_id };
  }
  return { type: 'text', content: await res.text(), conversation_id: endpoint.conversation_id };
}

// Single public function
export async function processCommand(
  sentence: string,
  attachments: FileAttachment[] = []
): Promise<{ success: boolean; data?: StandardApiResponse; error?: string }> {
  try {
    const results = await analyze(sentence, attachments);
    if (results.length === 0) {
      return { success: false, error: 'Command not understood' };
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed'
    };
  }
}

export function resetConversation() {
  conversationId = null;
}

export function getConversationId() {
  return conversationId;
}
