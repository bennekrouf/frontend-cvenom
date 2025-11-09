// components/chat/ChatInputArea.tsx
'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { FiSend, FiPaperclip, FiX } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { formatFileSize } from '@/utils/chatUtils';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  preview?: string;
}

interface ChatInputAreaProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  attachments: FileAttachment[];
  onFileSelect: (files: FileList | null) => void;
  onRemoveAttachment: (id: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  suggestions: string[];
  showSuggestions: boolean;
  onSuggestionClick: (suggestion: string) => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  isLoading,
  isAuthenticated,
  suggestions,
  showSuggestions,
  onSuggestionClick,
}) => {
  const t = useTranslations('chat');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputValue.trim() || attachments.length > 0) && !isLoading) {
        onSendMessage();
      }
      return;
    }
    onKeyPress(e);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <div className="text-xs text-muted-foreground mb-2">
            {t('attachments')} ({attachments.length}):
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                <div className="flex items-center space-x-2 p-2 bg-secondary rounded border">
                  {attachment.preview ? (
                    <Image
                      src={attachment.preview}
                      alt={attachment.name}
                      width={32}
                      height={32}
                      className="object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <FiPaperclip className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate max-w-20">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                  </div>
                  <button
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                  >
                    <FiX className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <div className="text-xs text-muted-foreground mb-2">Suggested commands:</div>
          <div className="space-y-1">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full text-left px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAuthenticated
                ? attachments.length > 0
                  ? "Add a message about the attached files..."
                  : t('input_placeholder_authenticated')
                : t('input_placeholder_guest')
            }
            className="w-full pl-4 pr-20 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            disabled={isLoading}
            rows={1}
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.json"
            onChange={(e) => onFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title={t('attach_files')}
              disabled={isLoading}
            >
              <FiPaperclip className="w-4 h-4" />
            </button>

            <button
              onClick={onSendMessage}
              disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
              className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message (Enter)"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isAuthenticated ? t('footer_text') : t('footer_text_guest')}
        </p>
      </div>
    </div>
  );
};

export default ChatInputArea;
