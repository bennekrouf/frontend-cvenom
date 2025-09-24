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
 * Handler for data analysis results - collapsible view
 */
export class DataAnalysisHandler implements MessageHandler {
  canHandle(message: ChatMessage): boolean {
    return message.executionResult?.type === 'data' &&
      message.executionResult?.success === true &&
      message.executionResult?.data != null;
  }

  render(message: ChatMessage): React.ReactNode {
    const result = message.executionResult!;

    return (
      <div className="text-sm">
        <div className="text-green-600 mb-2">
          {message.content}
        </div>
        <div className="bg-secondary/30 rounded p-3">
          <details>
            <summary className="cursor-pointer font-medium text-foreground hover:text-primary">
              View Analysis Results
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              {Object.entries(result.data as Record<string, unknown>).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium capitalize text-foreground">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <div className="ml-2 whitespace-pre-wrap text-muted-foreground">
                    {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    );
  }
}

/**
 * Default handler for regular text messages
 */
export class DefaultMessageHandler implements MessageHandler {
  canHandle(): boolean {
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
