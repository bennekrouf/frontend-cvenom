// hooks/useAPI0Chat.ts
import { useState, useCallback } from 'react';
import { getAPI0, type AnalysisResult } from '@/lib/api0';
import { useTranslations } from 'next-intl';
import { getAuth } from 'firebase/auth';

import {
  formatFileSize
} from '@/utils/fileHelpers';
import { FILE_SIZE_LIMITS } from '@/utils/fileSizeConstants';

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
  error_code?: string; // Add this if needed
  suggestions?: string[]; // Add this line
  type?: 'pdf' | 'edit' | 'data' | 'file_content' | 'image_upload' | 'conversation';
  action?: string;
  blob?: Blob;
  filename?: string;
  message?: string;
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
    sentence: string,
    attachments: FileAttachment[]
  ): Promise<Record<string, unknown>> => {

    // Use API0 to analyze and find the person parameter
    const api0 = getAPI0();
    const results = await api0.analyzeSentence(sentence, attachments);

    if (results.length === 0) {
      throw new Error('Could not understand the upload command. Try: "Upload picture for john-doe"');
    }

    const endpoint = results[0];

    // Extract person name from the endpoint parameters
    const personParam = endpoint.parameters.find(p => p.name === 'person' || p.name === 'name');
    const personName = personParam?.semantic_value || personParam?.value;

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


      // Convert base64 back to blob (file is already compressed)
      const binaryString = atob(imageAttachment.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: imageAttachment.type });
      const file = new File([blob], imageAttachment.name, { type: imageAttachment.type });

      // Final size check before upload
      if (file.size > FILE_SIZE_LIMITS.UPLOAD_HARD_LIMIT) {
        throw new Error(`File still too large after compression: ${formatFileSize(file.size)}. Please use a smaller image.`);
      }

      console.log(`Uploading compressed image: ${formatFileSize(file.size)}`);

      // Create FormData for the upload
      const formData = new FormData();
      formData.append('person', personName);
      formData.append('file', file);

      // Use the API endpoint from API0 analysis
      const uploadUrl = `${endpoint.base}/upload-picture`;

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

      // Check if this is likely an image upload before calling API0
      const hasImages = attachments.some(att => att.type.startsWith('image/'));
      const isUploadCommand = sentence.toLowerCase().includes('upload') ||
        sentence.toLowerCase().includes('picture') ||
        sentence.toLowerCase().includes('photo');

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        isExecuting: true,
      }));

      let backendResponse: Record<string, unknown>;

      if (hasImages && isUploadCommand) {
        // Handle image upload directly here with proper auth
        backendResponse = await handleImageUpload(enhancedSentence, attachments);
      } else {
        // Let API0 handle regular commands
        backendResponse = await api0.processAndExecute(enhancedSentence, attachments);
      }

      // Check if the backend returned a failure response
      if (backendResponse && typeof backendResponse === 'object' && (backendResponse.success === false || backendResponse?.data?.success === false)) {
        // This is a failure response from backend, return it directly
        // const result: ExecutionResult = {
        //   success: false,
        //   error: backendResponse.error as string || 'Operation failed',
        //   error_code: backendResponse.error_code as string,
        //   suggestions: backendResponse.suggestions as string[],
        //   // Don't wrap in data, return the failure response directly
        // };

        const result: ExecutionResult = {
          ...backendResponse as Partial<ExecutionResult>,
          success: false, // Ensure success is false
        };


        setState(prev => ({
          ...prev,
          isExecuting: false,
          lastExecution: result
        }));

        return result;
      }

      // This is a successful response, wrap it in data
      const result: ExecutionResult = {
        success: true,
        data: backendResponse,
        type: (backendResponse.type as ExecutionResult['type']) || 'data',
        action: backendResponse.action as string,
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
