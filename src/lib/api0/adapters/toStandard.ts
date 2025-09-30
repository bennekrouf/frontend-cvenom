// lib/api0ResponseAdapter.ts - FIXED VERSION
import type { StandardApiResponse } from '@/lib/api0/adapters/types';

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
  parameters: Array<{
    name: string;
    description: string;
    semantic_value?: string;
    value?: string;
  }>;
  path: string;
  verb: string;
}

interface JobContent {
  title?: string;
  company?: string;
  [key: string]: unknown;
}

interface JobAnalysisData {
  job_content?: JobContent;
  fit_analysis?: string;
  [key: string]: unknown;
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

/**
 * Converts API0 analysis results to StandardApiResponse format
 */
export function adaptAPI0AnalysisToStandardResponse(
  analysisResults: API0AnalysisResult[],
): StandardApiResponse {
  if (analysisResults.length === 0) {
    return {
      type: 'error',
      success: false,
      error: 'No analysis results found',
      suggestions: ['Try being more specific about what you want to do']
    };
  }

  const result = analysisResults[0]; // Use best match

  // Handle responses based on intent
  switch (result.intent) {
    case 1: // GENERAL_QUESTION
      try {
        const jsonOutput = JSON.parse(result.json_output);
        return {
          type: 'text',
          success: true,
          message: jsonOutput.response || jsonOutput.content || 'Here\'s the information you requested.',
          conversation_id: result.conversation_id
        };
      } catch (error) {
        console.error('Failed to parse general question response:', error);
        return {
          type: 'text',
          success: true,
          message: 'I can help you with CV-related questions and commands.',
          conversation_id: result.conversation_id
        };
      }

    case 2: // HELP_REQUEST
      try {
        const jsonOutput = JSON.parse(result.json_output);
        const helpResponse = jsonOutput.response || 'Here are the available capabilities:';

        return {
          type: 'text',
          success: true,
          message: `ℹ️ **Help & Capabilities**\n\n${helpResponse}`,
          conversation_id: result.conversation_id
        };
      } catch (error) {
        console.error('Failed to parse help response:', error);
        return {
          type: 'text',
          success: true,
          message: 'ℹ️ I can help you with CV creation, file editing, generating PDFs, and more. Try asking "What can you do?" for a complete list.',
          conversation_id: result.conversation_id
        };
      }

    case 0: // ACTIONABLE_REQUEST
    default:
      // Handle conversation endpoints (no execution needed)
      if (result.api_group_id === 'conversation') {
        try {
          const jsonOutput = JSON.parse(result.json_output);
          return {
            type: 'text',
            success: true,
            message: jsonOutput.response || jsonOutput.content || 'Conversation response',
            conversation_id: result.conversation_id
          };
        } catch (error) {
          console.error('Failed to parse conversation JSON output:', error);
          return {
            type: 'text',
            success: true,
            message: 'I can help you with CV-related questions and commands.',
            conversation_id: result.conversation_id
          };
        }
      }

      // Handle action endpoints that need execution
      return {
        type: 'action',
        success: true,
        message: `Ready to execute: ${result.endpoint_name}`,
        action: result.endpoint_name,
        conversation_id: result.conversation_id,
        next_actions: [`Execute ${result.endpoint_name}`, 'Provide parameters if needed']
      };
  }
}

/**
 * Converts API0 execution results to StandardApiResponse format
 */
export function adaptAPI0ExecutionToStandardResponse(
  executionResult: API0ExecutionResult,
  t?: (key: string) => string
): StandardApiResponse {
  if (executionResult.type === 'error' ||
    ('success' in executionResult && executionResult.success === false)) {
    return {
      type: 'error',
      success: false,
      error: executionResult.error || 'Operation failed',
      error_code: executionResult.error_code,
      suggestions: executionResult.suggestions,
      conversation_id: executionResult.conversation_id
    } as StandardApiResponse;
  }

  // Handle conversation responses
  if (executionResult.type === 'conversation' ||
    (executionResult.content && !executionResult.blob && !executionResult.data)) {
    return {
      type: 'text',
      success: true,
      message: executionResult.content || executionResult.response || 'Response received',
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle PDF/file responses
  if (executionResult.blob || executionResult.type === 'pdf') {
    return {
      type: 'file',
      blob_data: executionResult.blob,
      success: true,
      message: t?.('chat.api_responses.document_ready') || 'Document ready for download',
      file_type: 'pdf',
      filename: executionResult.filename || 'document.pdf',
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle data responses with structured information
  if (executionResult.data || executionResult.type === 'json') {
    const data = executionResult.data || executionResult;

    // Check if it's job analysis data - just pass through what the LLM provided
    if (isJobAnalysisData(data)) {
      return {
        type: 'data',
        success: true,
        message: t?.('chat.api_responses.analysis_complete') || 'Analysis complete',
        data: data,
        conversation_id: executionResult.conversation_id
      };
    }

    return {
      type: 'data',
      success: true,
      message: executionResult.message || t?.('chat.api_responses.data_retrieved') || 'Data retrieved',
      data: data,
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle action confirmations
  if (executionResult.action || executionResult.endpoint_name) {
    return {
      type: 'action',
      success: true,
      message: executionResult.message || t?.('chat.api_responses.operation_complete') || 'Operation complete',
      action: executionResult.action || executionResult.endpoint_name || 'unknown_action',
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle text responses
  if (executionResult.content || executionResult.response) {
    return {
      type: 'text',
      success: true,
      message: executionResult.content || executionResult.response || 'Response received',
      conversation_id: executionResult.conversation_id
    };
  }

  // Default fallback
  return {
    type: 'text',
    success: true,
    message: executionResult.message || t?.('chat.api_responses.operation_complete') || 'Operation complete',
    conversation_id: executionResult.conversation_id
  };
}

function isJobAnalysisData(data: Record<string, unknown>): data is JobAnalysisData {
  return typeof data === 'object' &&
    data !== null &&
    'job_content' in data &&
    'fit_analysis' in data;
}
