// src/utils/chatMessageRenderer.tsx
import React from 'react';
import { ChatMessage, ExecutionResult } from './chatUtils';
import {
  ErrorMessageHandler,
  HelpMessageHandler,
  FileDownloadHandler,
  DataAnalysisHandler,
  DefaultMessageHandler,
  MessageHandler
} from './chatMessageHandlers';

export class ChatMessageRenderer {
  private static handlers: MessageHandler[] = [
    new ErrorMessageHandler(),
    new HelpMessageHandler(),
    new FileDownloadHandler(),
    new DataAnalysisHandler(),
    new DefaultMessageHandler() // Keep this last as it's the fallback
  ];

  /**
   * Render a chat message using the appropriate handler
   */
  static render(
    message: ChatMessage,
    onPDFDownload?: (result: ExecutionResult) => void
  ): React.ReactNode {
    const handler = this.handlers.find(h => h.canHandle(message));
    return handler?.render(message, onPDFDownload) || null;
  }

  /**
   * Add a custom handler to the chain
   */
  static addHandler(handler: MessageHandler, position: 'start' | 'end' = 'end') {
    if (position === 'start') {
      this.handlers.unshift(handler);
    } else {
      // Insert before the default handler
      this.handlers.splice(-1, 0, handler);
    }
  }

  /**
   * Check if a message needs special execution result handling
   */
  static needsExecutionResult(message: ChatMessage): boolean {
    return message.executionResult != null &&
      (message.executionResult.type === 'pdf' ||
        (message.executionResult.type === 'data' && message.executionResult.success));
  }
}
