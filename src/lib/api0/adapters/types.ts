export interface AnalysisSection {
  title: string;
  content: string;
  score?: string;
  points?: string[];
}

export interface DisplayFormat {
  type: 'key_value' | 'analysis' | 'table' | 'status';
  sections?: AnalysisSection[];
  headers?: string[];
  rows?: string[][];
  current?: string;
  total?: string;
  percentage?: number;
}

export type StandardApiResponse =
  | {
    type: 'text';
    success: true;
    message: string;
    conversation_id?: string;
  }
  | {
    type: 'file';
    success: true;
    message: string;
    file_type: string;
    filename: string;
    download_url?: string;
    blob_data?: Blob;
    conversation_id?: string;
  }
  | {
    type: 'data';
    success: true;
    message: string;
    data: Record<string, unknown>;
    display_format?: DisplayFormat;
    conversation_id?: string;
  }
  | {
    type: 'action';
    success: true;
    message: string;
    action?: string;
    next_actions?: string[];
    conversation_id?: string;
  }
  | {
    type: 'error';
    success: false;
    error: string;
    error_code?: string;
    suggestions?: string[];
    conversation_id?: string;
  };
