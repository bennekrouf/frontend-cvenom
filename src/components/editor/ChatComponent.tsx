// components/ChatComponent.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiDownload, FiEdit, FiFile, FiPaperclip, FiX, FiImage } from 'react-icons/fi';
import { FaMagic } from "react-icons/fa";
import { signInWithGoogle } from '@/lib/firebase';
import { useAPI0Chat } from '@/hooks/useAPI0Chat';
import { useTranslations } from 'next-intl';
import { FILE_SIZE_LIMITS } from '@/utils/fileSizeConstants';
import { compressImage } from '@/utils/imageCompression';
import { FiRefreshCw } from 'react-icons/fi';

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
    conversationId,
    conversationStarted,
    resetConversation,
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
        alert(t('unsupported_file_type'));
        continue;
      }

      // Check size before processing
      const maxSize = isImageFile(file) ? FILE_SIZE_LIMITS.IMAGE_MAX_INITIAL : FILE_SIZE_LIMITS.OTHER_MAX_INITIAL;
      if (file.size > maxSize) {
        alert(t('file_too_large'));
        continue;
      }

      try {
        // Compress images, keep others as-is
        const processedFile = isImageFile(file)
          ? await compressImage(file, FILE_SIZE_LIMITS.COMPRESSED_TARGET)
          : file;

        const base64Data = await fileToBase64(processedFile);
        const preview = isImageFile(file) ? await createImagePreview(processedFile) : undefined;

        const attachment: FileAttachment = {
          id: Date.now().toString() + i,
          name: file.name,
          type: processedFile.type,
          size: processedFile.size,
          data: base64Data,
          preview
        };

        console.log(`File processed: ${file.name}, Original: ${formatFileSize(file.size)}, Final: ${formatFileSize(processedFile.size)}`);

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

          // Extract clean message from backend response
          let backendMessage = '';
          if (result.data && typeof result.data === 'object') {
            const backendData = result.data as Record<string, unknown>;

            // Look for message in the nested data structure
            if (backendData.data && typeof backendData.data === 'object') {
              const nestedData = backendData.data as Record<string, unknown>;
              backendMessage = nestedData.message as string || '';
            } else {
              backendMessage = backendData.message as string || '';
            }
          }

          // Handle different response types with clean messages
          if (result.type === 'image_upload') {
            responseContent = `✅ ${backendMessage || 'Image processed successfully!'}`;
            resultData = result as ExecutionResult;
          }
          else if (result.type === 'pdf') {
            responseContent = `✅ ${backendMessage || 'CV generated successfully! Click below to download.'}`;
            resultData = result as ExecutionResult;
            handlePDFDownload(result);
          }
          else if (result.type === 'edit') {
            responseContent = `✅ ${backendMessage || `Ready to edit: ${result.data?.section as string} section for ${result.data?.person as string}`}`;
            resultData = result as ExecutionResult;
          }
          else if (result.type === 'file_content') {
            responseContent = `✅ ${backendMessage || `File content retrieved: ${result.data?.path as string}`}`;
            resultData = result as ExecutionResult;
          }
          else {
            // For other types, use the backend message if available
            responseContent = backendMessage ? `✅ ${backendMessage}` : '✅ Command executed successfully!';
            resultData = result as ExecutionResult;
          }

          addMessage({
            role: 'assistant',
            type: 'result',
            content: responseContent,
            ...(resultData && { executionResult: resultData }),
          });
        } else {
          // Handle both top-level error and nested data.error
          let errorMessage = result.error || 'Operation failed';
          let errorSuggestions: string[] = [];

          // Check if error is nested inside data property
          if (result.data && typeof result.data === 'object') {
            const errorData = result.data as Record<string, unknown>;
            if (errorData.error && typeof errorData.error === 'string') {
              errorMessage = errorData.error as string;
            }
            if (errorData.suggestions && Array.isArray(errorData.suggestions)) {
              errorSuggestions = errorData.suggestions as string[];
            }
          }

          // Also check for suggestions at top level
          if (result.suggestions && Array.isArray(result.suggestions)) {
            errorSuggestions = result.suggestions as string[];
          }

          // Format suggestions as clean text without quotes
          let suggestionsText = '';
          if (errorSuggestions.length > 0) {
            suggestionsText = errorSuggestions
              .map(suggestion => suggestion.replace(/^['"]|['"]$/g, '')) // Remove surrounding quotes if any
              .join('\n• ');

            if (suggestionsText) {
              suggestionsText = '\n\nSuggestions:\n• ' + suggestionsText;
            }
          }

          addMessage({
            role: 'assistant',
            type: 'text',
            content: `❌ ${errorMessage}${suggestionsText}`,
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


      {/* Conversation Status Bar */}
      {isAuthenticated && (
        <div className="border-b border-border bg-secondary/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {conversationStarted && conversationId ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-mono text-muted-foreground">
                  Session: {conversationId.slice(-8)}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-muted-foreground">Ready to start conversation</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {conversationStarted && (
              <button
                onClick={() => {
                  const confirmReset = window.confirm('Start a new conversation? This will reset the chat context.');
                  if (confirmReset) {
                    resetConversation();
                    setMessages([{
                      id: Date.now().toString(),
                      role: 'assistant',
                      type: 'text',
                      content: 'New conversation started! How can I help you with your CV?',
                      timestamp: new Date(),
                    }]);
                  }
                }}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
                title="Start new conversation"
              >
                <FiRefreshCw className="w-3 h-3" />
                <span>New Session</span>
              </button>
            )}
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
