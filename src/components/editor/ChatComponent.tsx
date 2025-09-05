'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiUser, FiTrash2, FiLock } from 'react-icons/fi';
import { FaMagic } from "react-icons/fa";
import { signInWithGoogle } from '@/lib/firebase';

import { useTranslations } from 'next-intl';
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatComponentProps {
  isVisible: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

// Configuration - in a real app, load this from your config
const CHAT_CONFIG = {
  maxMessages: 20,
  flushWarningMessage: "You've reached the message limit. Would you like to clear the chat history to continue?"
};

const ChatComponent: React.FC<ChatComponentProps> = ({ isVisible, isAuthenticated, loading }) => {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: isAuthenticated
        ? t('welcome_authenticated')
        : t('welcome_guest'),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFlushDialog, setShowFlushDialog] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when component becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Update welcome message when authentication state changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: isAuthenticated
          ? 'Hello! I\'m here to help you with your CV creation and editing. How can I assist you today?'
          : 'Welcome! I can help you with CV creation and editing. Sign in to save your progress and access advanced features, or feel free to ask questions to get started!',
        timestamp: new Date(),
      }]);
    }
  }, [isAuthenticated, messages.length]);

  // Check if message limit is reached
  const checkMessageLimit = () => {
    return messages.length >= CHAT_CONFIG.maxMessages;
  };

  // Flush chat history
  const flushMessages = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: isAuthenticated
          ? 'Chat history has been cleared. How can I help you with your CV?'
          : 'Chat history has been cleared. I can help you with CV questions, or sign in for the full experience!',
        timestamp: new Date(),
      },
    ]);
    setShowFlushDialog(false);
  };

  // Handle authentication
  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      setShowAuthPrompt(false);

      // Add welcome message after successful sign-in
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Great! You\'re now signed in. I can now help you with advanced CV features like file editing and collaboration. What would you like to work on?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, welcomeMessage]);
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
    setIsSigningIn(false);
  };

  // Fake responses for demonstration
  const getFakeResponse = (userMessage: string, isAuth: boolean): string => {
    const authenticatedResponses = [
      "I can help you create a professional CV. What specific section would you like to work on?",
      "That's a great question! For CV writing, I'd recommend focusing on quantifiable achievements.",
      "I see you're working on your resume. Would you like tips on formatting or content structure?",
      "Based on your message, here are some suggestions for improving your CV...",
      "Let me help you with that. CV optimization is all about highlighting your unique value proposition.",
      "I understand what you're looking for. The key to a standout CV is clear, concise communication of your skills.",
    ];

    const unauthenticatedResponses = [
      "I can give you some general CV tips! For personalized assistance and file editing, consider signing in.",
      "Here's some advice for CV writing. Sign in to access advanced features like template editing and collaboration.",
      "That's a good question about CVs! I can provide basic guidance, or you can sign in for the full experience.",
      "For CV optimization, focus on clear achievements. Sign in to work with actual CV files and templates.",
      "I can help with general CV advice! For editing your actual CV files, you'll want to sign in first.",
      "Great question! I can share CV best practices. Sign in to access collaborative features and file editing.",
    ];

    const responses = isAuth ? authenticatedResponses : unauthenticatedResponses;
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Simulate typing delay
  const simulateTyping = async (response: string) => {
    setIsTyping(true);

    // Simulate typing delay based on message length
    const typingDelay = Math.min(response.length * 30, 2000) + 500;

    await new Promise(resolve => setTimeout(resolve, typingDelay));

    setIsTyping(false);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // For unauthenticated users, show auth prompt after a few messages
    if (!isAuthenticated && messages.length >= 5) {
      setShowAuthPrompt(true);
      return;
    }

    // Check message limit for authenticated users
    if (isAuthenticated && checkMessageLimit()) {
      setShowFlushDialog(true);
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Check again after adding user message (for assistant response)
    const currentLength = messages.length + 1;
    if (isAuthenticated && currentLength >= CHAT_CONFIG.maxMessages) {
      setShowFlushDialog(true);
      return;
    }

    // Generate and add fake response
    const response = getFakeResponse(userMessage.content, isAuthenticated);
    await simulateTyping(response);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Authentication Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FiLock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Enhanced Experience Available</h3>
                <p className="text-sm text-muted-foreground">Get the most out of your CV assistant</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in to unlock advanced features like file editing, collaboration tools, and unlimited conversations.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Continue as Guest
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
                <span>{isSigningIn ? 'Signing in...' : 'Sign In with Google'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flush Dialog */}
      {showFlushDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-foreground mb-4">Chat Limit Reached</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {CHAT_CONFIG.flushWarningMessage}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowFlushDialog(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={flushMessages}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <FiTrash2 className="w-4 h-4" />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <FaMagic className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">CV Assistant</h2>
              <p className="text-xs text-muted-foreground">
                {isAuthenticated
                  ? t('header_subtitle_authenticated')
                  : t('header_subtitle_guest')
                }
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {isAuthenticated ? (
              `${messages.length}/${CHAT_CONFIG.maxMessages} messages`
            ) : (
              loading ? 'Checking auth...' : 'Guest mode'
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
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
                  <p className="text-sm leading-relaxed selectable">{message.content}</p>
                  <p className={`text-xs mt-2 ${message.role === 'user'
                    ? 'text-primary-foreground/70'
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

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaMagic className="w-3 h-3 text-primary" />
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
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAuthenticated
              ? "Ask me anything about CV creation..."
              : "Ask me about CV tips... (Sign in for advanced features)"
            }
            className="w-full pl-4 pr-12 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none selectable"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message (Enter)"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {isAuthenticated
            ? 'Press Enter to send • This is a demo chat with fake responses'
            : 'Press Enter to send • Sign in to unlock unlimited conversations and CV editing'
          }
        </p>
      </div>
    </div>
  );
};

export default ChatComponent;
