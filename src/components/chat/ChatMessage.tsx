// components/chat/ChatMessage.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { FiUser, FiDownload, FiEdit, FiImage, FiFile } from 'react-icons/fi';
import { FaMagic } from "react-icons/fa";

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
  data?: Record<string, unknown>;
  error?: string;
  type?: 'pdf' | 'edit' | 'data' | 'file_content' | 'image_upload' | 'conversation';
  action?: string;
  blob?: Blob;
  filename?: string;
  message?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  executionResult?: ExecutionResult;
  type?: 'text' | 'command' | 'result';
  attachments?: FileAttachment[];
}

interface ChatMessageProps {
  message: ChatMessage;
  onPDFDownload: (result: ExecutionResult) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPDFDownload }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderAttachments = (attachments: FileAttachment[]) => (
    <div className="mt-3 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center space-x-3 p-2 bg-secondary/50 rounded border">
          {attachment.preview ? (
            <Image
              src={attachment.preview}
              alt={attachment.name}
              width={48}
              height={48}
              className="object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
              <FiFile className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderExecutionResult = (result: ExecutionResult) => (
    <div className="mt-3 space-y-2">
      {result.type === 'pdf' && (
        <button
          onClick={() => onPDFDownload(result)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
        >
          <FiDownload className="w-3 h-3" />
          <span>Download PDF</span>
        </button>
      )}

      {result.type === 'edit' && (
        <button className="flex items-center space-x-2 px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors">
          <FiEdit className="w-3 h-3" />
          <span>Open Editor</span>
        </button>
      )}

      {result.type === 'image_upload' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 text-xs">
          <div className="flex items-center space-x-2 mb-1">
            <FiImage className="w-3 h-3 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-200">Image Processed</span>
          </div>
          <p className="text-green-700 dark:text-green-300">{result.data?.message as string}</p>
        </div>
      )}

      {result.type === 'data' && result.data && (
        <div className="mt-3">
          {renderDataDisplay(result.data)}
        </div>
      )}
    </div>
  );

  // Define proper types for display format
  interface DisplayFormatAnalysis {
    type: 'analysis';
    sections: Array<{
      title: string;
      content: string;
      score?: string;
      points?: string[];
    }>;
  }

  interface DisplayFormatTable {
    type: 'table';
    headers: string[];
    rows: string[][];
  }

  type DisplayFormat = DisplayFormatAnalysis | DisplayFormatTable | { type: 'key_value' | 'status' };

  const renderDataDisplay = (data: Record<string, unknown>) => {
    // Check if this is analysis data with display format
    if (data.display_format && typeof data.display_format === 'object') {
      const displayFormat = data.display_format as DisplayFormat;

      if (displayFormat.type === 'analysis' && 'sections' in displayFormat) {
        return (
          <div className="space-y-4 mt-3 p-4 bg-secondary/30 rounded-lg border">
            <h4 className="font-semibold text-sm">Analysis Results</h4>
            {displayFormat.sections.map((section, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium text-sm">{section.title}</h5>
                  {section.score && (
                    <span className={`text-xs px-2 py-1 rounded ${section.score === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' :
                        section.score === 'fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200' :
                          section.score === 'poor' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
                      }`}>
                      {section.score}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {section.content}
                </p>
                {section.points && section.points.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {section.points.map((point: string, pointIndex: number) => (
                      <li key={pointIndex} className="flex items-start space-x-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );
      }

      if (displayFormat.type === 'table' && 'headers' in displayFormat && 'rows' in displayFormat) {
        return (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm border border-border rounded">
              <thead className="bg-secondary">
                <tr>
                  {displayFormat.headers.map((header: string, index: number) => (
                    <th key={index} className="px-3 py-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayFormat.rows.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex} className="border-t border-border">
                    {row.map((cell: string, cellIndex: number) => (
                      <td key={cellIndex} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Fallback for other data types
    return (
      <div className="mt-3 p-3 bg-secondary/30 rounded text-sm">
        <details>
          <summary className="cursor-pointer font-medium">View Details</summary>
          <pre className="mt-2 text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${message.role === 'user'
            ? message.type === 'command'
              ? 'bg-blue-600 text-white'
              : 'bg-primary text-primary-foreground'
            : 'bg-card border border-border text-foreground'
          }`}
      >
        <div className="flex items-start space-x-2">
          {message.role === 'assistant' && (
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <FaMagic className="w-3 h-3 text-primary" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              {message.type === 'command' && (
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">CMD</span>
              )}
              {message.type === 'result' && (
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">RESULT</span>
              )}
            </div>

            <p className="text-sm leading-relaxed whitespace-pre-wrap selectable">
              {message.content}
            </p>

            {message.attachments && message.attachments.length > 0 && renderAttachments(message.attachments)}
            {message.executionResult && renderExecutionResult(message.executionResult)}

            <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
              }`}>
              {formatTime(message.timestamp)}
            </p>
          </div>

          {message.role === 'user' && (
            <div className="w-6 h-6 bg-primary-foreground/10 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
              <FiUser className="w-3 h-3 text-primary-foreground/70" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
