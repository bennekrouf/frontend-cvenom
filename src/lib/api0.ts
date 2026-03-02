// src/lib/api0.ts
import { getAuth } from 'firebase/auth';
import type { FileAttachment } from '@/types/chat';
import { getApiUrl } from './config';

const API0_BASE = process.env.NEXT_PUBLIC_API0_BASE_URL || 'https://gateway.api0.ai';
const API0_KEY = process.env.NEXT_PUBLIC_API0_API_KEY || (() => {
  throw new Error('NEXT_PUBLIC_API0_API_KEY environment variable is required');
})();

let conversationId: string | null = null;

// ── Endpoint manifest (pre-loaded once per session) ──────────────────────────

interface EndpointSuggestion {
  /** The semantic label api0 matches against — e.g. "Generate CV" */
  text: string;
  /** Human-readable explanation — e.g. "Generate a PDF CV from a profile" */
  description: string;
  /** The api_group this endpoint belongs to — e.g. "CV Service" */
  group: string;
}

let endpointManifest: EndpointSuggestion[] | null = null;

/**
 * Fetches the endpoint manifest from api0 (GET /api/endpoints).
 * Called automatically on the first analyze() — callers never need to invoke this directly.
 * The API key auth on the gateway resolves the user's email server-side,
 * so no email parameter is required here.
 */
async function loadEndpointManifest(): Promise<void> {
  try {
    const res = await fetch(`${API0_BASE}/api/endpoints`, {
      headers: {
        'Authorization': `Bearer ${API0_KEY}`,
        'X-User-Email': getAuth().currentUser?.email || '',
      },
    });

    if (!res.ok) return; // fail silently — suggestions degrade gracefully to empty

    const data = await res.json();

    // data.api_groups is the same structure the Semantic service uses internally
    endpointManifest = (data.api_groups ?? []).flatMap((group: {
      name: string;
      endpoints: { text: string; description: string }[];
    }) =>
      (group.endpoints ?? []).map(ep => ({
        text: ep.text,
        description: ep.description ?? '',
        group: group.name,
      }))
    );
  } catch {
    // Network/parse errors: manifest stays null, suggestions will be empty
  }
}

/**
 * Returns endpoint text labels that match the user's partial input.
 * Falls back to an empty array if the manifest hasn't loaded yet.
 * Used by useAPI0Chat to power the chat suggestion list.
 */
export function getEndpointSuggestions(input: string, limit = 6): string[] {
  if (!endpointManifest) return [];
  const q = input.trim().toLowerCase();
  return endpointManifest
    .filter(ep =>
      ep.text.toLowerCase().includes(q) ||
      ep.description.toLowerCase().includes(q)
    )
    .map(ep => ep.text)
    .slice(0, limit);
}

/** Resets both conversation state and the cached manifest (e.g. on sign-out). */
export function resetManifest(): void {
  endpointManifest = null;
}

// Type definitions (keeping existing ones)
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
  filename?: string;
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

async function analyze(sentence: string, attachments: FileAttachment[] = []): Promise<API0AnalysisResult[]> {
  const currentUser = getAuth().currentUser;
  const userEmail = currentUser?.email || '';
  // Firebase UID is the opaque consumer_id — cvenom's end users are never exposed to api0 by name.
  // api0 stores this verbatim for usage attribution; credit deduction hits cvenom's tenant balance (Option B).
  const consumerId = currentUser?.uid || '';

  if (!conversationId) {
    // Initialise conversation + pre-load endpoint manifest in parallel
    const [startRes] = await Promise.all([
      fetch(`${API0_BASE}/api/analyze/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API0_KEY}`,
          'Content-Type': 'application/json',
          'X-User-Email': userEmail,
          'X-Consumer-Id': consumerId,
        },
        body: JSON.stringify({ user_id: currentUser?.uid }),
      }),
      loadEndpointManifest(), // fire-and-forget alongside conversation start
    ]);

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
    headers: {
      'Authorization': `Bearer ${API0_KEY}`,
      'Content-Type': 'application/json',
      'X-User-Email': userEmail,
      'X-Consumer-Id': consumerId,
    },
    body: JSON.stringify(body),
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

  // Override the base URL from API0 response with actual backend URL
  const apiUrl = getApiUrl(); // This gets cvenom backend URL
  const fullUrl = `${apiUrl.replace(/\/$/, '')}${endpoint.path}`;

  const res = await fetch(fullUrl, { // Use fullUrl instead of endpoint.base + endpoint.path
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
    return { type: 'pdf', blob: await res.blob(), conversation_id: endpoint.conversation_id, filename: getFilenameFromResponse(res) || undefined };
  }
  if (contentType?.includes('application/json')) {
    const jsonData = await res.json();
    return { type: 'json', data: jsonData, conversation_id: endpoint.conversation_id };
  }
  return { type: 'text', content: await res.text(), conversation_id: endpoint.conversation_id };
}

function getFilenameFromResponse(response: Response): string | null {
  const disposition = response.headers.get('content-disposition');
  if (!disposition) return null;

  const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  return match ? match[1].replace(/['"]/g, '') : null;
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
            'Include profile names in lowercase with hyphens (e.g., "john-doe")'
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
              filename: result.filename || 'generated.pdf',
              download_url: url,
              blob_data: result.blob,
              conversation_id: result.conversation_id
            }
          };
        }
        break;

      case 'json':
        // Check if the JSON response is an error from your backend
        const jsonData = result.data;
        if (jsonData && typeof jsonData === 'object' && 'type' in jsonData && jsonData.type === 'error') {
          return {
            success: true,
            data: jsonData as StandardApiResponse
          };
        }

        // For non-error JSON responses, show the data without generic message
        return {
          success: true,
          data: {
            type: 'data',
            success: true,
            message: JSON.stringify(jsonData, null, 2), // Show actual data instead of generic message
            data: jsonData,
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
  endpointManifest = null; // force re-fetch on next session (user may have changed endpoints)
}

export function getConversationId() {
  return conversationId;
}
