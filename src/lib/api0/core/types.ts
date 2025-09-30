// Pure API0 types - no application-specific concepts

export interface API0AnalysisResult {
  api_group_id: string;
  api_group_name: string;
  base: string;
  conversation_id: string;
  endpoint_description: string;
  endpoint_id: string;
  endpoint_name: string;
  essential_path: string;
  intent: number; // 0 = ACTIONABLE_REQUEST, 1 = GENERAL_QUESTION, 2 = HELP_REQUEST
  json_output: string;
  user_prompt: string;
  matching_info: {
    completion_percentage: number;
    mapped_optional_fields: number;
    mapped_required_fields: number;
    missing_optional_fields: string[];
    missing_required_fields: string[];
    status: number;
    total_optional_fields: number;
    total_required_fields: number;
  };
  parameters: Parameter[];
  path: string;
  verb: string;
}

export interface API0ExecutionResult {
  type?: string;
  content?: string;
  response?: string;
  blob?: Blob;
  filename?: string;
  action?: string;
  endpoint_name?: string;
  message?: string;
  conversation_id?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Parameter {
  name: string;
  description: string;
  semantic_value?: string;
  value?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
  preview?: string;
}

export interface StartAnalysisRequest {
  user_id?: string;
  context?: Record<string, unknown>;
}

export interface StartAnalysisResponse {
  conversation_id: string;
  success: boolean;
  message?: string;
}

export interface AnalyzeRequest {
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
