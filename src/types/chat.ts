// Single source of truth
import type { StandardApiResponse } from '@/lib/api0/adapters/types';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  preview?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'command' | 'result';
  response?: StandardApiResponse;
  executionResult?: {
    success: boolean;
    type?: 'pdf' | 'data' | 'text' | 'error';
    data?: unknown;
    blob?: Blob;
    filename?: string;
  };
  attachments?: FileAttachment[];
}
