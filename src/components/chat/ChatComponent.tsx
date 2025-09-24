// components/chat/ChatComponent.tsx - Refactored
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaMagic } from "react-icons/fa";
import { signInWithGoogle } from '@/lib/firebase';
import { useAPI0Chat } from '@/hooks/useAPI0Chat';
import { useTranslations } from 'next-intl';
import { ChatResponseFormatter } from '@/utils/chatResponseFormatter';

// Import our new components
import ChatMessage from './ChatMessage';
import ChatInputArea from './ChatInputArea';
// import ChatStatusBar from './ChatStatusBar';
import AuthPromptModal from './AuthPromptModal';

// Import utilities
import {
  fileUtils,
  messageUtils,
  dragDropUtils,
  authUtils,
  type ChatMessage as ChatMessageType,
  type FileAttachment,
  type ExecutionResult as ChatExecutionResult
} from '@/utils/chatUtils';
// import { StandardApiResponse } from '@/types/api-responses';

// Extended result type that includes blob for file downloads
// interface ExtendedExecutionResult extends ChatExecutionResult {
//   blob?: Blob;
// }

interface ChatComponentProps {
  isVisible: boolean;
  isAuthenticated: boolean;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ isVisible, isAuthenticated }) => {
  const t = useTranslations('chat');

  // State management
  const [messages, setMessages] = useState<ChatMessageType[]>([
    messageUtils.createWelcomeMessage(isAuthenticated, t)
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

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
      // Show errors as a message
      addMessage({
        role: 'assistant',
        type: 'text',
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Message sending
  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    // For unauthenticated users, show auth prompt for commands
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
      // Enhance command with attachment context
      const enhancedCommand = messageUtils.enhanceSentenceWithAttachments(
        messageContent || "Process the uploaded files",
        messageAttachments
      );

      const result = await executeCommand(enhancedCommand, messageAttachments);

      if (result.success && result.data) {
        // Handle standardized API responses - now properly typed
        const standardResponse = result.data;

        // Check if it's actually an error response
        if (standardResponse.type === 'error') {
          let errorContent = standardResponse.error || 'Operation failed';
          if (standardResponse.suggestions && standardResponse.suggestions.length > 0) {
            errorContent += '\n\n' + t('chat.api_responses.suggestions') + '\n' +
              standardResponse.suggestions.map((s: string) => `• ${s}`).join('\n');
          }

          addMessage({
            role: 'assistant',
            type: 'text',
            content: errorContent,
          });
          return;
        }

        if (result.success && result.data) {
          // Use the formatter to create a properly formatted message
          const formatted = ChatResponseFormatter.formatResponse(result.data, t);
          setMessages(prev => [...prev, formatted.message]);
        } else {
          // Handle cases where result.data might contain error info
          const errorResponse = result.data || {
            type: 'error' as const,
            success: false,
            error: result.error || t('chat.api_responses.operation_failed'),
            suggestions: []
          };

          const formatted = ChatResponseFormatter.formatResponse(errorResponse, t);
          setMessages(prev => [...prev, formatted.message]);
        }


      } else {
        // Handle errors - now using standardized error format
        let errorMessage = result.error || t('chat.api_responses.operation_failed');
        let suggestions: string[] = [];

        // Check if the error response contains suggestions
        if (result.data?.type === 'error') {
          errorMessage = result.data.error;
          suggestions = result.data.suggestions || [];
        }

        addMessage(messageUtils.createErrorMessage(errorMessage, suggestions, t));
      }
    } catch (error) {
      addMessage(messageUtils.createErrorMessage(
        error instanceof Error ? error.message : 'Command failed'
      ));
    }
  };

  // Auth handling
  const { handleSignIn, handleClose } = authUtils.createAuthPromptHandlers(
    async () => {
      setIsSigningIn(true);
      await signInWithGoogle();
      addMessage({
        role: 'assistant',
        type: 'text',
        content: '🎉 Welcome! You can now use commands like:\n• "Generate CV for john-doe"\n• "Create person profile for jane-smith"\n• "Upload profile picture" (with image attachment)',
      });
      setIsSigningIn(false);
    },
    () => setShowAuthPrompt(false)
  );

  // Reset conversation handler
  // const handleResetConversation = () => {
  //   resetConversation();
  //   setMessages([messageUtils.createWelcomeMessage(isAuthenticated, t)]);
  // };

  // Get suggestions
  const suggestions = showSuggestions ? getCommandSuggestions(inputValue) : [];

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={handleClose}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
      />

      {/* Conversation Status Bar */}
      {/* <ChatStatusBar */}
      {/*   isAuthenticated={isAuthenticated} */}
      {/*   conversationStarted={conversationStarted} */}
      {/*   conversationId={conversationId} */}
      {/*   onResetConversation={handleResetConversation} */}
      {/* /> */}

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
            onPDFDownload={handlePDFDownload as (result: ChatExecutionResult) => void}
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
