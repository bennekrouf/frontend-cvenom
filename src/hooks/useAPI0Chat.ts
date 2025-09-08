// hooks/useAPI0Chat.ts
import { useState, useCallback } from 'react';
import { getAPI0, type AnalysisResult } from '@/lib/api0';
import { useTranslations } from 'next-intl';
import { getAuth } from 'firebase/auth';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
  preview?: string; // for images
}

interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  type?: 'pdf' | 'edit' | 'data' | 'file_content' | 'image_upload' | 'conversation';
  action?: string;
}

interface API0ChatState {
  isAnalyzing: boolean;
  isExecuting: boolean;
  lastAnalysis: AnalysisResult[] | null;
  lastExecution: ExecutionResult | null;
}

export function useAPI0Chat() {
  const t = useTranslations('chat.suggestions');

  const [state, setState] = useState<API0ChatState>({
    isAnalyzing: false,
    isExecuting: false,
    lastAnalysis: null,
    lastExecution: null,
  });

  const handleImageUpload = useCallback(async (
    endpoint: AnalysisResult,
    attachments: FileAttachment[]
  ): Promise<Record<string, unknown>> => {
    // Extract person name from the endpoint parameters or ask user to specify
    const personParam = endpoint.parameters.find(p => p.name === 'person' || p.name === 'name');
    const personName = personParam?.semantic_value;

    if (!personName) {
      throw new Error('Please specify which collaborator to upload the image for (e.g., "Upload picture for john-doe")');
    }

    // Get the first image attachment
    const imageAttachment = attachments.find(att => att.type.startsWith('image/'));
    if (!imageAttachment) {
      throw new Error('No image attachment found');
    }

    try {
      // Get Firebase auth token
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Please sign in to upload images');
      }
      const token = await user.getIdToken();

      // Convert base64 back to blob for upload
      const binaryString = atob(imageAttachment.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: imageAttachment.type });
      const file = new File([blob], imageAttachment.name, { type: imageAttachment.type });

      // Create FormData for the upload
      const formData = new FormData();
      formData.append('person', personName);
      formData.append('file', file);

      // Use the direct backend URL from API0 response
      const uploadUrl = `${endpoint.base}${endpoint.path}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json() as Record<string, unknown>;

      return {
        type: 'image_upload',
        success: true,
        message: `Profile picture uploaded successfully for ${personName}`,
        data: {
          person: personName,
          filename: imageAttachment.name,
          ...data
        }
      };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

      // Enhance sentence with attachment context for API0
      let enhancedSentence = sentence;
      if (attachments.length > 0) {
        const imageAttachments = attachments.filter(att => att.type.startsWith('image/'));
        const otherAttachments = attachments.filter(att => !att.type.startsWith('image/'));

        if (imageAttachments.length > 0) {
          enhancedSentence += ` with ${imageAttachments.length} image attachment${imageAttachments.length > 1 ? 's' : ''}`;
        }
        if (otherAttachments.length > 0) {
          enhancedSentence += ` with ${otherAttachments.length} file attachment${otherAttachments.length > 1 ? 's' : ''}`;
        }
      }

      const results = await api0.analyzeSentence(enhancedSentence);

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

      // Get the best match
      const bestMatch = results[0];

      // Check if this is an image upload operation
      const isImageUpload = attachments.some(att => att.type.startsWith('image/')) &&
        (bestMatch.endpoint_name.toLowerCase().includes('upload') ||
          bestMatch.endpoint_name.toLowerCase().includes('picture') ||
          sentence.toLowerCase().includes('upload') ||
          sentence.toLowerCase().includes('picture'));

      console.log('API0 Best Match:', bestMatch);
      console.log('Is Image Upload:', isImageUpload);
      console.log('Attachments:', attachments.length);

      let executionResult: Record<string, unknown>;

      if (isImageUpload && attachments.length > 0) {
        // Handle image upload specifically using API0 endpoint
        console.log('Taking image upload path');
        executionResult = await handleImageUpload(bestMatch, attachments);
      } else {
        // Handle regular command execution
        console.log('Taking regular command path');
        executionResult = await api0.processAndExecute(sentence, attachments);
      }

      const result: ExecutionResult = {
        success: true,
        data: executionResult,
        type: (executionResult.type as ExecutionResult['type']) || 'data',
        action: executionResult.action as string,
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
  }, [handleImageUpload]);

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
      'Upload profile picture for john-doe', // Add image-related suggestions
      'Process uploaded image for CV',
      'Set profile picture using attached image'
    ];

    if (!input.trim()) return suggestions.slice(0, 4);

    return suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(input.toLowerCase())
    );
  }, [t]);

  const handlePDFDownload = useCallback((result: ExecutionResult) => {
    if (result.success && result.type === 'pdf' && result.data?.blob) {
      const blob = result.data.blob as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (result.data.filename as string) || 'cv.pdf';
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
