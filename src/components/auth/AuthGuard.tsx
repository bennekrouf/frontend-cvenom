// src/components/auth/AuthGuard.tsx
'use client';

import React from 'react';
import { FiLock, FiUser } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  message?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  message = "Please sign in to access this feature"
}) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If authentication is not required, always show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If user is authenticated, show children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default auth required message
  return (
    <AuthPrompt message={message} />
  );
};

interface AuthPromptProps {
  message: string;
}

const AuthPrompt: React.FC<AuthPromptProps> = ({ message }) => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await signInWithGoogle();
    setIsSigningIn(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-lg">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <FiLock className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Authentication Required</h3>
      <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
        {message}
      </p>
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSigningIn ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <FiUser className="w-4 h-4" />
        )}
        <span>{isSigningIn ? 'Signing in...' : 'Sign In with Google'}</span>
      </button>
    </div>
  );
};

export default AuthGuard;
