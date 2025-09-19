// components/chat/AuthPromptModal.tsx
'use client';

import React from 'react';
import { FiUser } from 'react-icons/fi';
import { FaMagic } from "react-icons/fa";

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  isSigningIn: boolean;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  isSigningIn,
}) => {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSignIn}
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
  );
};

export default AuthPromptModal;
