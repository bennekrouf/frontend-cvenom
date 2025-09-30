// src/utils/chatMessageHandlers.ts
import { ChatMessage, ExecutionResult } from './chatUtils';

export interface MessageHandler {
  canHandle(message: ChatMessage): boolean;
  render(message: ChatMessage, onPDFDownload?: (result: ExecutionResult) => void): React.ReactNode;
}

/**
 * Handler for error messages - clean display with suggestions
 */
export class ErrorMessageHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return message.role === 'assistant' &&
      message.content.startsWith('❌');
  }

  render(message: ChatMessage): React.ReactNode {
    const lines = message.content.split('\n');
    const errorLine = lines[0];
    const suggestionIndex = lines.findIndex(line => line.includes('Suggestions:') || line.includes('suggestions:'));

    if (suggestionIndex === -1) {
      return (
        <div className="text-sm text-red-600">
          {errorLine}
        </div>
      );
    }

    const suggestions = lines.slice(suggestionIndex + 1)
      .filter(line => line.startsWith('•'))
      .map(line => line.substring(1).trim());

    return (
      <div className="text-sm">
        <div className="text-red-600 mb-2">{errorLine}</div>
        {suggestions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded">
            <div className="text-blue-800 dark:text-blue-200 font-medium text-xs mb-1">
              💡 Suggestions:
            </div>
            <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

/**
 * Handler for help messages - formatted capability lists
 */
export class HelpMessageHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return message.role === 'assistant' &&
      message.content.includes('Available Capabilities');
  }

  render(message: ChatMessage): React.ReactNode {
    const lines = message.content.split('\n');
    const titleLine = lines.find(line => line.includes('Available Capabilities'));
    const contentStart = lines.findIndex(line => line.includes('Available Capabilities')) + 1;
    const content = lines.slice(contentStart).join('\n').trim();

    return (
      <div className="text-sm">
        <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 p-3 rounded">
          <div className="text-purple-800 dark:text-purple-200 font-medium text-xs mb-2">
            {titleLine}
          </div>
          <div className="text-purple-700 dark:text-purple-300 text-xs whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Handler for success messages with file downloads
 */
export class FileDownloadHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return message.executionResult?.type === 'pdf' &&
      message.executionResult?.success === true;
  }

  render(message: ChatMessage, onPDFDownload?: (result: ExecutionResult) => void): React.ReactNode {
    const result = message.executionResult!;

    const handleDownload = () => {
      if (result.blob) {
        // Create download link directly if we have the blob
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (onPDFDownload) {
        // Fallback to the provided handler
        onPDFDownload(result);
      }
    };

    return (
      <div className="text-sm">
        <div className="text-green-600 mb-2">
          {message.content}
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Download PDF</span>
        </button>
      </div>
    );
  }
}

/**
 * Handler for error data - shows only suggestions, not the full data analysis
 */
export class ErrorDataHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return message.executionResult?.type === 'data' &&
      message.executionResult?.data != null &&
      this.isErrorData(message.executionResult.data);
  }

  private isErrorData(data: Record<string, unknown>): boolean {
    return data.type === 'error' &&
      data.success === false &&
      Array.isArray(data.suggestions);
  }

  render(message: ChatMessage): React.ReactNode {
    const errorData = message.executionResult!.data as {
      error: string;
      suggestions: string[];
      error_code?: string;
    };

    return (
      <div className="text-sm">
        <div className="text-red-600 mb-2">❌ {errorData.error}</div>
        {errorData.suggestions && errorData.suggestions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded">
            <div className="text-blue-800 dark:text-blue-200 font-medium text-xs mb-1">
              💡 Suggestions:
            </div>
            <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
              {errorData.suggestions.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

/**
 * Handler for data analysis results - direct display only
 */
export class DataAnalysisHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return message.executionResult?.type === 'data' &&
      message.executionResult?.success === true &&
      message.executionResult?.data != null &&
      !this.isErrorData(message.executionResult.data);
  }

  private isErrorData(data: Record<string, unknown>): boolean {
    return data.type === 'error' && data.success === false;
  }

  render(message: ChatMessage): React.ReactNode {
    const result = message.executionResult!;
    const data = result.data as Record<string, unknown>;

    // Check if this is error data - show only suggestions
    if (data.type === 'error' && data.success === false) {
      const errorData = data as {
        error: string;
        suggestions?: string[];
        error_code?: string;
      };

      return (
        <div className="text-sm">
          <div className="text-red-600 mb-2">❌ {errorData.error}</div>
          {errorData.suggestions && errorData.suggestions.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded">
              <div className="text-blue-800 dark:text-blue-200 font-medium text-xs mb-1">
                💡 Suggestions:
              </div>
              <ul className="text-blue-700 dark:text-blue-300 text-xs space-y-1">
                {errorData.suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // For data with message field - display directly
    if (data.message && typeof data.message === 'string') {
      return (
        <div className="text-sm">
          {/* <div className="text-green-600 mb-2">✅ Analysis Complete</div> */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded">
            <div className="text-blue-800 dark:text-blue-200 text-sm whitespace-pre-wrap">
              {data.message}
            </div>
          </div>
        </div>
      );
    }

    // Fallback - just show the success message
    return (
      <div className="text-sm">
        <div className="text-green-600">
          ✅ {message.content}
        </div>
      </div>
    );
  }
}

/**
 * Default handler for regular text messages
 */
export class DefaultMessageHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return true; // Default handler accepts all messages
  }

  render(message: ChatMessage): React.ReactNode {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap selectable break-words overflow-wrap-anywhere">
        {message.content}
      </div>
    );
  }
}
