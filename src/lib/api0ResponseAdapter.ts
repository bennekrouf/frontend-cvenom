// lib/api0ResponseAdapter.ts
import { StandardApiResponse } from '@/types/api-responses';

export interface API0AnalysisResult {
  api_group_id: string;
  api_group_name: string;
  base: string;
  conversation_id: string;
  endpoint_description: string;
  endpoint_id: string;
  endpoint_name: string;
  essential_path: string;
  json_output: string;
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
  analysisResults: API0AnalysisResult[]
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

  // Handle conversation endpoints specifically
  if (result.api_group_id === 'conversation' && result.endpoint_id === 'general_conversation') {
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

/**
 * Converts API0 execution results to StandardApiResponse format
 */
export function adaptAPI0ExecutionToStandardResponse(
  executionResult: API0ExecutionResult
): StandardApiResponse {
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
      success: true,
      message: 'File generated successfully',
      file_type: 'pdf',
      filename: executionResult.filename || 'document.pdf',
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle data responses with structured information
  if (executionResult.data || executionResult.type === 'json') {
    // Check if it's job analysis data
    const data = executionResult.data || executionResult;
    if (data.job_content && data.fit_analysis) {
      return {
        type: 'data',
        success: true,
        message: 'Job fit analysis completed successfully',
        data: data,
        display_format: {
          type: 'analysis',
          sections: [
            {
              title: 'Job Position',
              content: `${data.job_content?.title || 'N/A'} at ${data.job_content?.company || 'N/A'}`,
              score: extractFitScore(data.fit_analysis),
              points: extractTalkingPoints(data.fit_analysis)
            }
          ]
        },
        conversation_id: executionResult.conversation_id
      };
    }

    return {
      type: 'data',
      success: true,
      message: executionResult.message || 'Data retrieved successfully',
      data: data,
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle action confirmations
  if (executionResult.action || executionResult.endpoint_name) {
    return {
      type: 'action',
      success: true,
      message: executionResult.message || 'Action completed successfully',
      action: executionResult.action || executionResult.endpoint_name,
      conversation_id: executionResult.conversation_id
    };
  }

  // Handle text responses
  if (executionResult.content || executionResult.response) {
    return {
      type: 'text',
      success: true,
      message: executionResult.content || executionResult.response,
      conversation_id: executionResult.conversation_id
    };
  }

  // Default fallback
  return {
    type: 'text',
    success: true,
    message: executionResult.message || 'Command executed successfully',
    conversation_id: executionResult.conversation_id
  };
}

/**
 * Helper function to extract fit score from analysis text
 */
function extractFitScore(analysis: string): string {
  if (!analysis) return 'unknown';
  const lowerAnalysis = analysis.toLowerCase();

  if (lowerAnalysis.includes('excellent') || lowerAnalysis.includes('perfect')) return 'excellent';
  if (lowerAnalysis.includes('good') || lowerAnalysis.includes('well')) return 'good';
  if (lowerAnalysis.includes('fair') || lowerAnalysis.includes('moderate')) return 'fair';
  if (lowerAnalysis.includes('poor') || lowerAnalysis.includes('weak')) return 'poor';

  return 'unknown';
}

/**
 * Helper function to extract talking points from analysis text
 */
function extractTalkingPoints(analysis: string): string[] {
  if (!analysis) return [];

  return analysis
    .split('\n')
    .filter(line => /^\d+\./.test(line.trim()) || line.includes('•') || line.includes('-'))
    .map(line => line.trim())
    .slice(0, 5); // Limit to 5 points
}
