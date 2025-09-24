// Updated ChatMessage.tsx using the attachment handler

import React from 'react';
import { FiUser } from 'react-icons/fi';
import { FaMagic } from "react-icons/fa";
import { ChatMessageRenderer } from '@/utils/chatMessageRenderer';
import { ChatAttachmentHandler, type FileAttachment } from '@/utils/chatAttachmentHandler';
import { ExecutionResult } from '@/utils/chatUtils';

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

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 break-words overflow-hidden ${message.role === 'user'
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

            {/* Use the centralized renderer */}
            <div className="chat-message">
              {ChatMessageRenderer.render(message, onPDFDownload)}
            </div>

            {/* Use the attachment handler */}
            {ChatAttachmentHandler.renderAttachments(message.attachments || [])}

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
