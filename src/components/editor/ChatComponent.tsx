// components/ChatComponent.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiDownload, FiEdit, FiFile, FiPaperclip, FiX, FiImage } from 'react-icons/fi';
import { FaMagic } from "react-icons/fa";
import { signInWithGoogle } from '@/lib/firebase';
import { useAPI0Chat } from '@/hooks/useAPI0Chat';
import { useTranslations } from 'next-intl';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  executionResult?: ExecutionResult;
  type?: 'text' | 'command' | 'result';
  attachments?: FileAttachment[];
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

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
  preview?: string; // for images
}

interface ChatComponentProps {
  isVisible: boolean;
  isAuthenticated: boolean;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ isVisible, isAuthenticated }) => {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      type: 'text',
      content: isAuthenticated
        ? t('welcome_authenticated')
        : t('welcome_guest'),
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    executeCommand,
    getCommandSuggestions,
    handlePDFDownload,
  } = useAPI0Chat();

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

  // File handling functions
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/');
  };

  const isSupportedFile = (file: File): boolean => {
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
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!isSupportedFile(file)) {
        alert(`File type ${file.type} is not supported. Supported types: images, PDF, text files.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      try {
        const base64Data = await fileToBase64(file);
        const preview = isImageFile(file) ? await createImagePreview(file) : undefined;

        const attachment: FileAttachment = {
          id: Date.now().toString() + i,
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data,
          preview
        };

        newAttachments.push(attachment);
      } catch (error) {
        console.error('Error processing file:', error);
        alert(`Error processing file ${file.name}`);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    // For unauthenticated users, show auth prompt for commands
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

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

    if (isAuthenticated) {
      try {
        let commandToExecute = messageContent;

        // If there are image attachments, enhance the command for API0
        const imageAttachments = messageAttachments.filter(att => isImageFile({ type: att.type } as File));

        console.log('Chat: messageAttachments:', messageAttachments.length);
        console.log('Chat: imageAttachments:', imageAttachments.length);

        if (imageAttachments.length > 0) {
          // If no text command provided, suggest image-related commands
          if (!messageContent.trim()) {
            commandToExecute = "Process the uploaded image for CV profile picture";
          } else {
            // Enhance existing command with image context
            commandToExecute = `${messageContent} using the uploaded image`;
          }
        }

        console.log('Chat: calling executeCommand with attachments:', messageAttachments.length);
        const result = await executeCommand(commandToExecute, messageAttachments);

        if (result.success) {
          let responseContent = '';
          let resultData = null;

          // Handle conversation responses
          if (result.type === 'conversation') {
            addMessage({
              role: 'assistant',
              type: 'text',
              content: result.data?.content as string || result.data?.response as string || 'I can help you with CV questions.',
            });
            return;
          }

          // Handle image upload responses
          if (result.type === 'image_upload') {
            responseContent = `✅ Image processed successfully! ${result.data?.message as string || ''}`;
            resultData = result as ExecutionResult; // Add explicit cast
          }
          // For PDF:
          else if (result.type === 'pdf') {
            responseContent = '✅ CV generated successfully! Click below to download.';
            resultData = result as ExecutionResult; // Add explicit cast
            handlePDFDownload(result);
          }
          // For edit:
          else if (result.type === 'edit') {
            responseContent = `✅ Ready to edit: ${result.data?.section as string} section for ${result.data?.person as string}`;
            resultData = result as ExecutionResult; // Add explicit cast
          }
          // For file content:
          else if (result.type === 'file_content') {
            responseContent = `✅ File content retrieved: ${result.data?.path as string}`;
            resultData = result as ExecutionResult; // Add explicit cast
          }
          // For other types:
          else {
            responseContent = '✅ Command executed successfully!';
            if (result.data) {
              resultData = result as ExecutionResult; // Add explicit cast
              responseContent += `\n\nResult: ${JSON.stringify(result.data, null, 2)}`;
            }
          }

          addMessage({
            role: 'assistant',
            type: 'result',
            content: responseContent,
            ...(resultData && { executionResult: resultData }),
          });
        } else {
          addMessage({
            role: 'assistant',
            type: 'text',
            content: `❌ ${result.error}`,
          });
        }
      } catch (error) {
        addMessage({
          role: 'assistant',
          type: 'text',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Command failed'}`,
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 2 && isAuthenticated);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      setShowAuthPrompt(false);
      addMessage({
        role: 'assistant',
        type: 'text',
        content: '🎉 Welcome! You can now use commands like:\n• "Generate CV for john-doe"\n• "Create person profile for jane-smith"\n• "Upload profile picture" (with image attachment)',
      });
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
    setIsSigningIn(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const suggestions = showSuggestions ? getCommandSuggestions(inputValue) : [];

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FaMagic className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">CV Commands Available</h3>
                <p className="text-sm text-muted-foreground">Sign in to execute CV operations</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Commands like CV generation, file editing, and image processing require authentication to access your CVenom account.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSigningIn ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiUser className="w-4 h-4" />
                )}
                <span>{isSigningIn ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDragOver ? 'bg-primary/5 border-2 border-dashed border-primary' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
            <div className="text-center">
              <FiPaperclip className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium text-primary">Drop files here</p>
              <p className="text-sm text-muted-foreground">Images, PDFs, and text files supported</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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

                  <p className="text-sm leading-relaxed whitespace-pre-wrap selectable">{message.content}</p>

                  {/* Display attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center space-x-3 p-2 bg-secondary/50 rounded border">
                          {attachment.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={attachment.preview}
                              alt={attachment.name}
                              className="w-12 h-12 object-cover rounded"
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
                  )}

                  {/* Execution result actions */}
                  {message.executionResult && (
                    <div className="mt-3 space-y-2">
                      {message.executionResult.type === 'pdf' && (
                        <button
                          onClick={() => handlePDFDownload(message.executionResult!)}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                        >
                          <FiDownload className="w-3 h-3" />
                          <span>Download PDF</span>
                        </button>
                      )}
                      {message.executionResult.type === 'edit' && (
                        <button
                          className="flex items-center space-x-2 px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors"
                        >
                          <FiEdit className="w-3 h-3" />
                          <span>Open Editor</span>
                        </button>
                      )}
                      {message.executionResult.type === 'image_upload' && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiImage className="w-3 h-3 text-green-600" />
                            <span className="font-medium text-green-800 dark:text-green-200">Image Processed</span>
                          </div>
                          <p className="text-green-700 dark:text-green-300">{message.executionResult.data?.message as string}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className={`text-xs mt-2 ${message.role === 'user'
                    ? 'text-white/70'
                    : 'text-muted-foreground'
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

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="border-t border-border bg-card px-4 py-2">
          <div className="text-xs text-muted-foreground mb-2">Attachments ({attachments.length}):</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                <div className="flex items-center space-x-2 p-2 bg-secondary rounded border">
                  {attachment.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.preview}
                      alt={attachment.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <FiFile className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate max-w-20">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
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
        <div className="border-t border-border bg-card px-4 py-2">
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
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={isAuthenticated
              ? attachments.length > 0
                ? "Add a message about the attached files..."
                : t('input_placeholder_authenticated')
              : t('input_placeholder_guest')
            }
            className="w-full pl-4 pr-20 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            disabled={isLoading}
          />

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.json"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Attach files (images, PDFs, text)"
              disabled={isLoading}
            >
              <FiPaperclip className="w-4 h-4" />
            </button>

            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
              className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message (Enter)"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input Area footer text */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isAuthenticated
            ? t('footer_text')
            : t('footer_text_guest')
          }
        </p>
      </div>
    </div>
  );
};

export default ChatComponent;
