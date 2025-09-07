// hooks/useAPI0Chat.ts
import { useState, useCallback } from 'react';
import { getAPI0, type AnalysisResult } from '@/lib/api0';

interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  type?: 'pdf' | 'edit' | 'data' | 'file_content';
  action?: string;
}

interface API0ChatState {
  isAnalyzing: boolean;
  isExecuting: boolean;
  lastAnalysis: AnalysisResult[] | null;
  lastExecution: ExecutionResult | null;
}

export function useAPI0Chat() {
  const [state, setState] = useState<API0ChatState>({
    isAnalyzing: false,
    isExecuting: false,
    lastAnalysis: null,
    lastExecution: null,
  });

  const executeCommand = useCallback(async (sentence: string): Promise<ExecutionResult> => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      isExecuting: false,
      lastExecution: null
    }));

    try {
      const api0 = getAPI0();
      const results = await api0.analyzeSentence(sentence);

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        isExecuting: true,
        lastAnalysis: results
      }));

      if (results.length === 0) {
        const result: ExecutionResult = {
          success: false,
          error: 'I didn\'t understand that command. Try being more specific about what you want to do with your CV.',
        };

        setState(prev => ({
          ...prev,
          isExecuting: false,
          lastExecution: result
        }));

        return result;
      }

      // Execute the best match
      const bestMatch = results[0];
      const params = bestMatch.parameters.reduce((acc, param) => {
        if (param.value) {
          acc[param.name] = param.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const executionResult = await api0.processAndExecute(sentence);

      const result: ExecutionResult = {
        success: true,
        data: executionResult,
        type: executionResult.type || 'data',
        action: executionResult.action,
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
  }, []);

  const getCommandSuggestions = useCallback((input: string): string[] => {
    const suggestions = [
      "Generate CV for john-doe in English",
      "Create person profile for jane-smith",
      "Get CV templates",
      "Edit experience section for john-doe",
      "Show my user profile",
      "Generate PDF for john-doe using keyteo template",
      "Show file tree",
      "Get file content for john-doe/cv_params.toml",
    ];

    if (!input.trim()) return suggestions.slice(0, 4);

    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(input.toLowerCase())
    );
  }, []);

  const handlePDFDownload = useCallback((result: ExecutionResult) => {
    if (result.success && result.type === 'pdf' && result.data?.blob) {
      const url = window.URL.createObjectURL(result.data.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.filename || 'cv.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  }, []);

  return {
    ...state,
    executeCommand,
    getCommandSuggestions,
    handlePDFDownload,
    isLoading: state.isAnalyzing || state.isExecuting,
  };
}
