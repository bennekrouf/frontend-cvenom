// hooks/useAPI0Chat.ts
import { useState, useCallback } from 'react';
import { processCommand, resetConversation as resetAPI0Conversation, getConversationId } from '@/lib/api0';
// import type { StandardApiResponse } from '@/lib/api0/adapters/types';
import type { StandardApiResponse } from '@/lib/api0';
import { useTranslations } from 'next-intl';
import type { FileAttachment } from '@/utils/chatUtils';

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

export function useAPI0Chat() {
  const t = useTranslations('chat.suggestions');

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

  const getCommandSuggestions = useCallback((input: string): string[] => {
    const suggestions = [
      t('generate_cv'),
      t('create_profile'),
      t('get_templates'),
      t('edit_experience'),
      t('show_profile'),
      t('generate_pdf'),
      t('show_file_tree'),
      t('get_file_content'),
      t('delete_collaborator'),
      t('upload_picture'),
      t('process_image'),
      t('set_profile_picture'),
      t('analyze_job_fit'),
      t('cv_writing_tips')
    ];

    if (!input.trim()) return suggestions.slice(0, 4);

    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(input.toLowerCase())
    );
  }, [t]);

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
