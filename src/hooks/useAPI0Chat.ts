// hooks/useAPI0Chat.ts
import { useState, useCallback } from 'react';
import {
  processCommand,
  resetConversation as resetAPI0Conversation,
  getConversationId,
  getEndpointSuggestions,
} from '@/lib/api0';
import type { StandardApiResponse } from '@/lib/api0';
import type { FileAttachment } from '@/utils/chatUtils';
// Note: useTranslations removed — suggestions are now driven by the api0 endpoint manifest

interface API0ChatResult {
  success: boolean;
  data?: StandardApiResponse;
  error?: string;
}

interface API0ChatState {
  isLoading: boolean;
  lastExecution: API0ChatResult | null;
  conversationId: string | null;
}

/** How many suggestions to show when the input is empty (first-open state). */
const DEFAULT_SUGGESTION_LIMIT = 4;

export function useAPI0Chat() {
  const [state, setState] = useState<API0ChatState>({
    isLoading: false,
    lastExecution: null,
    conversationId: null,
  });

  const resetConversation = useCallback(() => {
    resetAPI0Conversation();
    setState(prev => ({
      ...prev,
      conversationId: null,
      lastExecution: null,
    }));
  }, []);

  const executeCommand = useCallback(async (
    sentence: string,
    attachments: FileAttachment[] = []
  ): Promise<API0ChatResult> => {
    setState(prev => ({ ...prev, isLoading: true, lastExecution: null }));

    try {
      const result = await processCommand(sentence, attachments);

      // Update conversation ID if it changed
      const newConversationId = getConversationId();
      if (newConversationId !== state.conversationId) {
        setState(prev => ({ ...prev, conversationId: newConversationId }));
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastExecution: result
      }));

      return result;
    } catch (error) {
      const result: API0ChatResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastExecution: result
      }));

      return result;
    }
  }, [state.conversationId]);

  /**
   * Returns suggestion labels sourced from the live api0 endpoint manifest.
   * When input is empty, returns the first DEFAULT_SUGGESTION_LIMIT endpoints
   * (a helpful "what can I do?" prompt on first open).
   * When input has text, filters by partial match on both text and description.
   */
  const getCommandSuggestions = useCallback((input: string): string[] => {
    return getEndpointSuggestions(
      input,
      input.trim() ? undefined : DEFAULT_SUGGESTION_LIMIT,
    );
  }, []);

  const handlePDFDownload = useCallback((response: StandardApiResponse) => {
    if (response.type === 'file' && response.success && response.blob_data) {
      const url = window.URL.createObjectURL(response.blob_data);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  }, []);

  return {
    ...state,
    executeCommand,
    getCommandSuggestions,
    handlePDFDownload,
    resetConversation,
    conversationStarted: !!state.conversationId,
  };
}
