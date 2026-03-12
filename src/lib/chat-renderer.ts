// src/lib/chat-renderer.tsx  (note: .tsx extension, not .ts)
import React from 'react';
import type { ChatMessage } from '@/types/chat';
import { StandardApiResponse } from './api0';

// Declared at module level so React.lazy is only called once.
// Calling React.lazy() inside a render function creates a new lazy component
// reference on every render, causing Suspense to flash "Loading..." on every keystroke.
const ReactMarkdown = React.lazy(() => import('react-markdown'));

// ============================================================================
// RESPONSE FORMATTING (from chatResponseFormatter.ts)
// ============================================================================

export interface FormattedChatResponse {
  message: ChatMessage;
  shouldShowExecutionResult: boolean;
}

export class ChatRenderer {
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
        content: response.message,
        timestamp: new Date(),
        response: response,
      },
      shouldShowExecutionResult: false
    };
  }

  private static formatFileResponse(response: StandardApiResponse & { type: 'file' }): FormattedChatResponse {
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        response: response,
      },
      shouldShowExecutionResult: true
    };
  }

  private static formatDataResponse(response: StandardApiResponse & { type: 'data' }): FormattedChatResponse {
    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        response: response,
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
        content,
        timestamp: new Date(),
        response: response,
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
        content,
        timestamp: new Date(),
        response: response,
      },
      shouldShowExecutionResult: false
    };
  }

  private static formatUnknownResponse(
    response: StandardApiResponse,
    t: (key: string) => string
  ): FormattedChatResponse {
    console.warn('Unknown response format:', response);

    return {
      message: {
        id: this.generateId(),
        role: 'assistant',
        content: `❓ ${t('chat.api_responses.unknown_format')}`,
        timestamp: new Date(),
        response: response,
      },
      shouldShowExecutionResult: false
    };
  }

  private static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // ============================================================================
  // MESSAGE RENDERING (from chatMessageRenderer.ts + chatMessageHandlers.tsx)
  // ============================================================================

  /**
   * Render a chat message using the appropriate handler
   */
  static renderMessage(
    message: ChatMessage,
    onPDFDownload?: (response: StandardApiResponse) => void
  ): React.ReactNode {
    // Error messages
    if (this.isErrorMessage(message)) {
      return this.renderErrorMessage(message);
    }

    // Help messages
    if (this.isHelpMessage(message)) {
      return this.renderHelpMessage(message);
    }

    // File download messages
    if (this.isFileDownload(message)) {
      return this.renderFileDownload(message, onPDFDownload);
    }

    // Data analysis messages
    if (this.isDataAnalysis(message)) {
      return this.renderDataAnalysis(message);
    }

    // Default text message
    return this.renderDefaultMessage(message);
  }

  // ============================================================================
  // MESSAGE TYPE DETECTION
  // ============================================================================

  private static isErrorMessage(message: ChatMessage): boolean {
    return message.response?.type === 'error' ||
      (message.role === 'assistant' && message.content?.startsWith('❌'));
  }

  private static isHelpMessage(message: ChatMessage): boolean {
    return message.role === 'assistant' &&
      message.content?.includes('Available Capabilities');
  }

  private static isFileDownload(message: ChatMessage): boolean {
    return message.response?.type === 'file' &&
      message.response?.success === true;
  }

  private static isDataAnalysis(message: ChatMessage): boolean {
    return message.response?.type === 'data' &&
      message.response?.success === true;
  }

  // ============================================================================
  // MESSAGE RENDERERS
  // ============================================================================

  private static renderErrorMessage(message: ChatMessage): React.ReactNode {
    // Handle StandardApiResponse error
    if (message.response?.type === 'error') {
      const errorResponse = message.response;
      return React.createElement(
        'div',
        { className: 'text-sm' },
        React.createElement('div', { className: 'text-red-600 mb-2' }, `❌ ${errorResponse.error}`),
        errorResponse.suggestions && errorResponse.suggestions.length > 0 &&
        React.createElement(
          'div',
          { className: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded' },
          React.createElement(
            'div',
            { className: 'text-blue-800 dark:text-blue-200 font-medium text-xs mb-1' },
            '💡 Suggestions:'
          ),
          React.createElement(
            'ul',
            { className: 'text-blue-700 dark:text-blue-300 text-xs space-y-1' },
            errorResponse.suggestions.map((suggestion: string, index: number) =>
              React.createElement('li', { key: index }, `• ${suggestion}`)
            )
          )
        )
      );
    }

    // Handle legacy text-based errors
    const lines = message.content.split('\n');
    const errorLine = lines[0];
    const suggestionIndex = lines.findIndex(line => line.includes('Suggestions:') || line.includes('suggestions:'));

    if (suggestionIndex === -1) {
      return React.createElement('div', { className: 'text-sm text-red-600' }, errorLine);
    }

    const suggestions = lines.slice(suggestionIndex + 1)
      .filter(line => line.startsWith('•'))
      .map(line => line.substring(1).trim());

    return React.createElement(
      'div',
      { className: 'text-sm' },
      React.createElement('div', { className: 'text-red-600 mb-2' }, errorLine),
      suggestions.length > 0 &&
      React.createElement(
        'div',
        { className: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded' },
        React.createElement(
          'div',
          { className: 'text-blue-800 dark:text-blue-200 font-medium text-xs mb-1' },
          '💡 Suggestions:'
        ),
        React.createElement(
          'ul',
          { className: 'text-blue-700 dark:text-blue-300 text-xs space-y-1' },
          suggestions.map((suggestion, index) =>
            React.createElement('li', { key: index }, `• ${suggestion}`)
          )
        )
      )
    );
  }

  private static renderHelpMessage(message: ChatMessage): React.ReactNode {
    const lines = message.content.split('\n');
    const titleLine = lines.find(line => line.includes('Available Capabilities'));
    const contentStart = lines.findIndex(line => line.includes('Available Capabilities')) + 1;
    const content = lines.slice(contentStart).join('\n').trim();

    return React.createElement(
      'div',
      { className: 'text-sm' },
      React.createElement(
        'div',
        { className: 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-3 rounded' },
        React.createElement(
          'div',
          { className: 'text-purple-800 dark:text-purple-200 font-medium text-xs mb-2' },
          titleLine
        ),
        React.createElement(
          'div',
          { className: 'text-purple-700 dark:text-purple-300 text-xs whitespace-pre-wrap' },
          content
        )
      )
    );
  }

  private static renderFileDownload(
    message: ChatMessage,
    onPDFDownload?: (response: StandardApiResponse) => void
  ): React.ReactNode {
    const response = message.response!;

    if (response.type !== 'file') return null;

    const handleDownload = () => {
      if (response.blob_data) {
        const url = window.URL.createObjectURL(response.blob_data);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (onPDFDownload) {
        onPDFDownload(response);
      }
    };

    return React.createElement(
      'div',
      { className: 'text-sm' },
      React.createElement('div', { className: 'text-green-600 mb-2' }, message.content),
      React.createElement(
        'button',
        {
          onClick: handleDownload,
          className: 'flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors'
        },
        React.createElement(
          'svg',
          { className: 'w-3 h-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          })
        ),
        React.createElement('span', null, 'Download PDF')
      )
    );
  }

  private static renderDataAnalysis(message: ChatMessage): React.ReactNode {
    const response = message.response!;

    if (response.type !== 'data') return null;

    const data = response.data;

    // ── Known response shapes ─────────────────────────────────────────────

    // /api/me → { uid, email, name, tenant_name }
    if (data && typeof data === 'object' && 'uid' in data) {
      const u = data as { email?: string; name?: string; tenant_name?: string };
      return React.createElement('div', { className: 'text-sm space-y-1' },
        u.name && React.createElement('div', { className: 'font-medium' }, u.name),
        u.email && React.createElement('div', { className: 'text-muted-foreground' }, u.email),
        u.tenant_name && React.createElement('div', { className: 'text-xs text-muted-foreground' }, `Tenant: ${u.tenant_name}`),
      );
    }

    // /api/payment/balance → { balance }
    if (data && typeof data === 'object' && 'balance' in data && Object.keys(data as object).length <= 3) {
      const b = data as { balance: number };
      return React.createElement('div', { className: 'text-sm' },
        React.createElement('span', { className: 'font-medium' }, '💳 Credits: '),
        React.createElement('span', null, b.balance.toLocaleString()),
      );
    }

    // /api/optimize → data: { optimized_typst, job_title, company_name, optimizations, keyword_analysis }
    if (data && typeof data === 'object' && 'optimized_typst' in data) {
      const o = data as { job_title?: string; company_name?: string; optimizations?: string[]; keyword_analysis?: string };
      return React.createElement('div', { className: 'text-sm space-y-2' },
        (o.job_title || o.company_name) && React.createElement('div', { className: 'font-medium' },
          [o.job_title, o.company_name].filter(Boolean).join(' — ')),
        o.optimizations?.length && React.createElement('div', null,
          React.createElement('div', { className: 'text-xs font-medium text-muted-foreground mb-1' }, 'Optimizations applied:'),
          ...o.optimizations.map((opt, i) => React.createElement('div', { key: i, className: 'text-xs' }, `• ${opt}`))
        ),
        o.keyword_analysis && React.createElement('div', { className: 'text-xs text-muted-foreground whitespace-pre-wrap' }, o.keyword_analysis),
      );
    }

    // /api/translate → data: { translated_content }
    if (data && typeof data === 'object' && 'translated_content' in data) {
      const t = data as { translated_content: string };
      return React.createElement('div', { className: 'text-sm' },
        React.createElement('div', { className: 'text-xs text-muted-foreground mb-1' }, '✅ Translation complete'),
        React.createElement('pre', { className: 'text-xs bg-muted p-2 rounded overflow-auto max-h-64 whitespace-pre-wrap' }, t.translated_content),
      );
    }

    // /api/files/tree or cv-data → large raw object with no message field — show key summary
    if (data && typeof data === 'object' && !('message' in (data as object))) {
      const keys = Object.keys(data as object);
      const summary = keys.length <= 6 ? keys.join(', ') : `${keys.slice(0, 5).join(', ')} … +${keys.length - 5} more`;
      return React.createElement('div', { className: 'text-sm' },
        React.createElement('div', { className: 'text-green-600 mb-1' }, `✅ ${message.content.split('\n')[0]}`),
        React.createElement('div', { className: 'text-xs text-muted-foreground' }, summary),
      );
    }

    // ── Fallback: message field in blue box ───────────────────────────────
    const msgField = (data as { message?: string } | undefined)?.message;
    if (msgField && typeof msgField === 'string') {
      return React.createElement('div', { className: 'text-sm' },
        React.createElement('div', { className: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded' },
          React.createElement('div', { className: 'text-blue-800 dark:text-blue-200 text-sm whitespace-pre-wrap' }, msgField)
        )
      );
    }

    return React.createElement('div', { className: 'text-sm' },
      React.createElement('div', { className: 'text-green-600' }, `✅ ${message.content}`)
    );
  }

  private static renderDefaultMessage(message: ChatMessage): React.ReactNode {
    // Check if content contains markdown syntax
    const hasMarkdownSyntax = message.content.includes('#') ||
      message.content.includes('**') ||
      message.content.includes('###') ||
      message.content.includes('####') ||
      message.content.includes('- ');

    if (hasMarkdownSyntax) {
      return React.createElement(
        'div',
        { className: 'prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-li:text-foreground' },
        React.createElement(
          React.Suspense,
          { fallback: React.createElement('div', { className: 'text-sm' }, 'Loading...') },
          React.createElement(ReactMarkdown, {}, message.content)
        )
      );
    }

    return React.createElement(
      'div',
      { className: 'text-sm leading-relaxed whitespace-pre-wrap selectable break-words overflow-wrap-anywhere' },
      message.content
    );
  }
}
