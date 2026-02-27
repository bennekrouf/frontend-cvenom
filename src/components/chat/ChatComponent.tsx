// src/components/chat/ChatComponent.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaMagic } from "react-icons/fa";
import { signInWithGoogle } from '@/lib/firebase';
import { useAPI0Chat } from '@/hooks/useAPI0Chat';
import { useTranslations } from 'next-intl';
import { ChatRenderer } from '@/lib/chat-renderer';

// Import our new components
import ChatMessage from './ChatMessage';
import ChatInputArea from './ChatInputArea';
import AuthPromptModal from './AuthPromptModal';

// Import utilities
import {
  fileUtils,
  messageUtils,
  dragDropUtils,
  authUtils,
  type ChatMessage as ChatMessageType,
  type FileAttachment,
} from '@/utils/chatUtils';
import { StandardApiResponse } from '@/lib/api0';
import { useChatPersistence } from '@/hooks/useChatPersistence';

interface ChatComponentProps {
  isVisible: boolean;
  isAuthenticated: boolean;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ isVisible, isAuthenticated }) => {
  const t = useTranslations('chat');
  const { saveChat, loadChat } = useChatPersistence();

  // State management
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Custom hook for API0 chat functionality
  const {
    isLoading,
    executeCommand,
    getCommandSuggestions,
    handlePDFDownload,
  } = useAPI0Chat();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update the load effect
  useEffect(() => {
    console.log('🔄 Load effect running...');
    const savedMessages = loadChat();
    console.log('📥 Got saved messages:', savedMessages.length);
    if (savedMessages.length > 0) {
      console.log('✅ Setting saved messages');
      setMessages(savedMessages);
    } else {
      console.log('👋 Setting welcome message');
      setMessages([messageUtils.createWelcomeMessage(isAuthenticated, t)]);
    }
  }, []);

  // Save on messages change
  useEffect(() => {
    saveChat(messages);
  }, [messages]);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
  }, [isVisible]);

  useEffect(() => {
    // Focus on initial mount
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }, 200);
  }, []);

  // Message management
  const addMessage = (message: Omit<ChatMessageType, 'id' | 'timestamp'>) => {
    const newMessage = messageUtils.createMessage(message);
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  // File handling
  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const { attachments: newAttachments, errors } = await fileUtils.processFiles(files);

    if (errors.length > 0) {
      addMessage({
        role: 'assistant',
        content: `❌ File processing errors:\n${errors.map(e => `• ${e}`).join('\n')}`
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Drag and drop handlers
  const { handleDragOver, handleDragLeave, handleDrop } = dragDropUtils.createDragHandlers(
    () => setIsDragOver(true),
    () => setIsDragOver(false),
    handleFileSelect
  );

  // Input handling
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(value.length > 2 && isAuthenticated);
  };

  const handleKeyPress = () => {
    // No longer needed - handled in ChatInputArea
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
  };

  // Message sending
  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    // Add user message
    addMessage({
      role: 'user',
      content: inputValue.trim() || 'Attached files',
      attachments: [...attachments]
    });

    const messageContent = inputValue.trim();
    const messageAttachments = [...attachments];

    // Clear input and attachments
    setInputValue('');
    setAttachments([]);
    setShowSuggestions(false);

    try {
      const enhancedCommand = messageUtils.enhanceSentenceWithAttachments(
        messageContent || "Process the uploaded files",
        messageAttachments
      );

      const result = await executeCommand(enhancedCommand, messageAttachments);

      if (result.success && result.data) {
        const formatted = ChatRenderer.formatResponse(result.data, t);
        setMessages(prev => [...prev, formatted.message]);
      } else {
        let errorResponse: StandardApiResponse;

        if (result.data) {
          errorResponse = result.data;
        } else {
          errorResponse = {
            type: 'error',
            success: false,
            error: result.error || t('chat.api_responses.operation_failed'),
            suggestions: []
          };
        }

        const formatted = ChatRenderer.formatResponse(errorResponse, t);
        setMessages(prev => [...prev, formatted.message]);
      }
    } catch (error) {
      addMessage(messageUtils.createErrorMessage(
        error instanceof Error ? error.message : 'Command failed'
      ));
    } finally {
      // Focus back to textarea after response
      setTimeout(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
  };

  // Auth handling
  const { handleSignIn, handleClose } = authUtils.createAuthPromptHandlers(
    async () => {
      setIsSigningIn(true);
      await signInWithGoogle();
      addMessage({
        role: 'assistant',
        content: '🎉 Welcome! You can now use commands like:\n• "Generate CV for john-doe"\n• "Create profile profile for jane-smith"\n• "Upload profile picture" (with image attachment)',
      });
      setIsSigningIn(false);
    },
    () => setShowAuthPrompt(false)
  );

  // Get suggestions
  const suggestions = showSuggestions ? getCommandSuggestions(inputValue) : [];

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={handleClose}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
      />

      {/* Messages Area */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 chat-container ${isDragOver ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
            <div className="text-center">
              <FaMagic className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium text-primary">Drop files here</p>
              <p className="text-sm text-muted-foreground">Images, PDFs, and text files supported</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onPDFDownload={handlePDFDownload}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaMagic className="w-3 h-3 text-primary animate-pulse" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInputArea
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        attachments={attachments}
        onFileSelect={handleFileSelect}
        onRemoveAttachment={removeAttachment}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        onSuggestionClick={handleSuggestionClick}
      />
    </div>
  );
};

export default ChatComponent;
