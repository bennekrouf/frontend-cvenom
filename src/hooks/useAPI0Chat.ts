// src/hooks/useAPI0Chat.ts - Updated to use standardized API0 responses
import { useState, useCallback } from 'react';
import { getAPI0 } from '@/lib/api0';
import { useTranslations } from 'next-intl';
import { getAuth } from 'firebase/auth';
import { StandardApiResponse } from '@/types/api-responses';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  preview?: string;
}

interface ExecutionResult {
  success: boolean;
  data?: StandardApiResponse;
  error?: string;
  type?: string;
  message?: string;
  conversation_id?: string;
}

interface API0ChatState {
  isAnalyzing: boolean;
  isExecuting: boolean;
  lastExecution: ExecutionResult | null;
  conversationId: string | null;
  conversationStarted: boolean;
}

export function useAPI0Chat() {
  const t = useTranslations('chat.suggestions');

  const [state, setState] = useState<API0ChatState>({
    isAnalyzing: false,
    isExecuting: false,
    lastExecution: null,
    conversationId: null,
    conversationStarted: false,
  });

  const startConversation = useCallback(async (): Promise<string> => {
    try {
      const api0 = getAPI0();
      const conversationId = await api0.startConversation({
        application: 'cvenom',
        user_type: 'cv_creator',
        timestamp: new Date().toISOString()
      });

      setState(prev => ({
        ...prev,
        conversationId,
        conversationStarted: true,
      }));

      return conversationId;
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }, []);

  const resetConversation = useCallback(() => {
    const api0 = getAPI0();
    api0.resetConversation();

    setState(prev => ({
      ...prev,
      conversationId: null,
      conversationStarted: false,
      lastExecution: null,
    }));
  }, []);

  const executeCommand = useCallback(async (
    sentence: string,
    attachments: FileAttachment[] = []
  ): Promise<ExecutionResult> => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      isExecuting: false,
      lastExecution: null
    }));

    try {
      const api0 = getAPI0();

      // Ensure conversation is started for authenticated users
      const auth = getAuth();
      if (auth.currentUser && !state.conversationStarted) {
        await startConversation();
      }

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        isExecuting: true,
      }));

      // Use the new standardized method
      const backendResponse = await api0.processAndExecuteStandard(sentence, attachments);

      // Update conversation ID if provided
      if (backendResponse.data?.conversation_id && backendResponse.data.conversation_id !== state.conversationId) {
        setState(prev => ({
          ...prev,
          conversationId: backendResponse.data?.conversation_id || null,
          conversationStarted: true,
        }));
      }

      const result: ExecutionResult = {
        success: backendResponse.success,
        data: backendResponse.data,
        error: backendResponse.error,
        type: backendResponse.data?.type,
        conversation_id: backendResponse.data?.conversation_id || state.conversationId || undefined,
      };

      setState(prev => ({
        ...prev,
        isExecuting: false,
        lastExecution: result
      }));

      return result;
    } catch (error) {
      const result: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
      };

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        isExecuting: false,
        lastExecution: result
      }));

      return result;
    }
  }, [state.conversationStarted, state.conversationId, startConversation]);

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

  const handlePDFDownload = useCallback((result: ExecutionResult) => {
    if (result.success && result.data?.type === 'file' && result.data.file_type === 'pdf') {
      console.log('Downloading PDF:', result.data.filename);
      // PDF download logic handled by the calling component
    }
  }, []);

  return {
    ...state,
    executeCommand,
    getCommandSuggestions,
    handlePDFDownload,
    startConversation,
    resetConversation,
    isLoading: state.isAnalyzing || state.isExecuting,
  };
}
