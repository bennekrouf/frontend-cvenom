// Single source of truth

import { StandardApiResponse } from "@/lib/api0";

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
