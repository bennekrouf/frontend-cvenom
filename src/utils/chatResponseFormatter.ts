// src/utils/chatResponseFormatter.ts
import { StandardApiResponse } from '@/types/api-responses';
import { ChatMessage, ExecutionResult } from './chatUtils';

export interface FormattedChatResponse {
  message: ChatMessage;
  shouldShowExecutionResult: boolean;
}

export class ChatResponseFormatter {
  /**
   * Format a standardized API response for display in chat
   */
  static formatResponse(
    response: StandardApiResponse,
    t: (key: string) => string
  ): FormattedChatResponse {
    switch (response.type) {
      case 'text':
        return this.formatTextResponse(response);

      case 'file':
        return this.formatFileResponse(response);

      case 'data':
        return this.formatDataResponse(response);

      case 'action':
        return this.formatActionResponse(response, t);

      case 'error':
        return this.formatErrorResponse(response, t);

      default:
        return this.formatUnknownResponse(response, t);
    }
  }

  private static formatTextResponse(response: StandardApiResponse & { type: 'text' }): FormattedChatResponse {
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        type: 'text',
        content: `${response.message}`,
        timestamp: new Date(),
      },
      shouldShowExecutionResult: false
    };
  }

  private static formatFileResponse(response: StandardApiResponse & { type: 'file' }): FormattedChatResponse {
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        type: 'result',
        content: `${response.message}`,
        timestamp: new Date(),
        executionResult: {
          success: true,
          type: 'pdf',
          filename: response.filename,
          blob: response.blob_data,
        } as ExecutionResult
      },
      shouldShowExecutionResult: true
    };
  }

  private static formatDataResponse(response: StandardApiResponse & { type: 'data' }): FormattedChatResponse {
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        type: 'result',
        content: `${response.message}`,
        timestamp: new Date(),
        executionResult: {
          success: true,
          type: 'data',
          data: response.data,
        } as ExecutionResult
      },
      shouldShowExecutionResult: true
    };
  }

  private static formatActionResponse(
    response: StandardApiResponse & { type: 'action' },
    t: (key: string) => string
  ): FormattedChatResponse {
    let content = response.message;

    if (response.next_actions && response.next_actions.length > 0) {
      content += '\n\n' + t('chat.api_responses.next_steps') + '\n' +
        response.next_actions.map((action: string) => `• ${action}`).join('\n');
    }

    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        type: 'result',
        content,
        timestamp: new Date(),
      },
      shouldShowExecutionResult: false
    };
  }

  private static formatErrorResponse(
    response: StandardApiResponse & { type: 'error' },
    t: (key: string) => string
  ): FormattedChatResponse {
    let content = `❌ ${response.error}`;

    if (response.suggestions && response.suggestions.length > 0) {
      content += '\n\n' + t('chat.api_responses.suggestions') + '\n' +
        response.suggestions.map((suggestion: string) => `• ${suggestion}`).join('\n');
    }

    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        type: 'text', // Keep as 'text', not 'result'
        content,
        timestamp: new Date(),
        // NO executionResult for errors!
      },
      shouldShowExecutionResult: false
    };
  }

  private static formatUnknownResponse(
    response: StandardApiResponse,
    t: (key: string) => string
  ): FormattedChatResponse {
    // Log the unknown response for debugging
    console.warn('Unknown response format:', response);

    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        type: 'text',
        content: `❓ ${t('chat.api_responses.unknown_format')}`,
        timestamp: new Date(),
      },
      shouldShowExecutionResult: false
    };
  }

  private static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
