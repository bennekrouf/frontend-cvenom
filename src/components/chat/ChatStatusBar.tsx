// components/chat/ChatStatusBar.tsx
'use client';

import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';

interface ChatStatusBarProps {
  isAuthenticated: boolean;
  conversationStarted: boolean;
  conversationId: string | null;
  onResetConversation: () => void;
}

const ChatStatusBar: React.FC<ChatStatusBarProps> = ({
  isAuthenticated,
  conversationStarted,
  conversationId,
  onResetConversation,
}) => {
  if (!isAuthenticated) return null;

  const handleResetConversation = () => {
    const confirmReset = window.confirm('Start a new conversation? This will reset the chat context.');
    if (confirmReset) {
      onResetConversation();
    }
  };

  return (
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
            onClick={handleResetConversation}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors"
            title="Start new conversation"
          >
            <FiRefreshCw className="w-3 h-3" />
            <span>New Session</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatStatusBar;
