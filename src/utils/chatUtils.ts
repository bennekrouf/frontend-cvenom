// utils/chatUtils.ts
import { FILE_SIZE_LIMITS } from '@/utils/fileSizeConstants';
import { compressImage } from '@/utils/imageCompression';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
  preview?: string; // for images
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  executionResult?: ExecutionResult;
  type?: 'text' | 'command' | 'result';
  attachments?: FileAttachment[];
}

export interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  type?: 'pdf' | 'edit' | 'data' | 'file_content' | 'image_upload' | 'conversation';
  action?: string;
  blob?: Blob;
  filename?: string;
  message?: string;
}

// File handling utilities
export const fileUtils = {
  isImageFile: (file: File): boolean => {
    return file.type.startsWith('image/');
  },

  isSupportedFile: (file: File): boolean => {
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json'
    ];
    return supportedTypes.includes(file.type) || file.type.startsWith('image/');
  },

  fileToBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  createImagePreview: (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  processFiles: async (files: FileList): Promise<{
    attachments: FileAttachment[];
    errors: string[];
  }> => {
    const newAttachments: FileAttachment[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!fileUtils.isSupportedFile(file)) {
        errors.push(`File type not supported: ${file.name}`);
        continue;
      }

      // Check size before processing
      const maxSize = fileUtils.isImageFile(file)
        ? FILE_SIZE_LIMITS.IMAGE_MAX_INITIAL
        : FILE_SIZE_LIMITS.OTHER_MAX_INITIAL;

      if (file.size > maxSize) {
        errors.push(`File too large: ${file.name} (${fileUtils.formatFileSize(file.size)})`);
        continue;
      }

      try {
        // Compress images, keep others as-is
        const processedFile = fileUtils.isImageFile(file)
          ? await compressImage(file, FILE_SIZE_LIMITS.COMPRESSED_TARGET)
          : file;

        const base64Data = await fileUtils.fileToBase64(processedFile);
        const preview = fileUtils.isImageFile(file)
          ? await fileUtils.createImagePreview(processedFile)
          : undefined;

        const attachment: FileAttachment = {
          id: Date.now().toString() + i,
          name: file.name,
          type: processedFile.type,
          size: processedFile.size,
          data: base64Data,
          preview
        };

        newAttachments.push(attachment);
      } catch (error) {
        console.error('Error processing file:', error);
        errors.push(`Error processing file: ${file.name}`);
      }
    }

    return { attachments: newAttachments, errors };
  }
};

// Message utilities
export const messageUtils = {
  createMessage: (
    content: Omit<ChatMessage, 'id' | 'timestamp'>
  ): ChatMessage => ({
    ...content,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
  }),

  formatTime: (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  enhanceSentenceWithAttachments: (
    sentence: string,
    attachments: FileAttachment[]
  ): string => {
    if (attachments.length === 0) return sentence;

    const imageAttachments = attachments.filter(att => att.type.startsWith('image/'));
    const otherAttachments = attachments.filter(att => !att.type.startsWith('image/'));

    let enhanced = sentence;

    if (imageAttachments.length > 0) {
      enhanced += ` with ${imageAttachments.length} image attachment${imageAttachments.length > 1 ? 's' : ''}`;
    }
    if (otherAttachments.length > 0) {
      enhanced += ` with ${otherAttachments.length} file attachment${otherAttachments.length > 1 ? 's' : ''}`;
    }

    return enhanced;
  },

  createWelcomeMessage: (isAuthenticated: boolean, t: (key: string) => string): ChatMessage => {
    return messageUtils.createMessage({
      role: 'assistant',
      type: 'text',
      content: isAuthenticated
        ? t('welcome_authenticated')
        : t('welcome_guest'),
    });
  },

  createSuccessMessage: (content: string): ChatMessage => {
    return messageUtils.createMessage({
      role: 'assistant',
      type: 'result',
      content: `✅ ${content}`,
    });
  },

  createErrorMessage: (error: string, suggestions?: string[]): ChatMessage => {
    let content = `❌ ${error}`;
    if (suggestions && suggestions.length > 0) {
      content += '\n\nSuggestions:\n' + suggestions.map(s => `• ${s}`).join('\n');
    }

    return messageUtils.createMessage({
      role: 'assistant',
      type: 'text',
      content,
    });
  }
};

// Drag and drop utilities
export const dragDropUtils = {
  createDragHandlers: (
    onDragOver: () => void,
    onDragLeave: () => void,
    onDrop: (files: FileList) => void
  ) => ({
    handleDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver();
    },

    handleDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      onDragLeave();
    },

    handleDrop: (e: React.DragEvent) => {
      e.preventDefault();
      onDragLeave();
      onDrop(e.dataTransfer.files);
    }
  })
};

// Auth prompt utilities
export const authUtils = {
  createAuthPromptHandlers: (
    onSignIn: () => Promise<void>,
    onClose: () => void
  ) => ({
    handleSignIn: async () => {
      try {
        await onSignIn();
        onClose();
      } catch (error) {
        console.error('Sign-in failed:', error);
      }
    },

    handleClose: () => {
      onClose();
    }
  })
};
