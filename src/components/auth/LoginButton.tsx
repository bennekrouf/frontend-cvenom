// src/components/auth/LoginButton.tsx
'use client';

import React, { useState } from 'react';
import { FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';
import { signInWithGoogle, signOutUser } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);

    const result = await signInWithGoogle();
    
    if (result.error) {
      setError(result.error.message);
      console.error('Sign-in failed:', result.error);
    }
    
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    const error = await signOutUser();
    if (error) {
      console.error('Sign-out failed:', error);
    }
    setShowDropdown(false);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
    );
  }

  // Show user profile when authenticated
  if (isAuthenticated && user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-secondary transition-colors"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <FiUser className="w-4 h-4" />
            </div>
          )}
          <FiChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg py-2 z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Show login button when not authenticated
  return (
    <div className="flex flex-col items-end">
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
        <span>{isSigningIn ? 'Signing in...' : 'Sign In'}</span>
      </button>
      
      {error && (
        <p className="text-xs text-red-500 mt-1 max-w-48">
          {error}
        </p>
      )}
    </div>
  );
};

export default LoginButton;
