'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiLogOut, FiChevronDown, FiTrash2 } from 'react-icons/fi';
import Image from 'next/image';
import { signInWithGoogle, signOutUser } from '@/lib/firebase';
import { deleteAccount } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setDeleteConfirm(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

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

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount();
      await signOutUser();
    } catch (e) {
      console.error('Account deletion failed:', e);
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
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
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => { setShowDropdown(!showDropdown); setDeleteConfirm(false); }}
          className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-secondary transition-colors"
        >
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <FiUser className="w-4 h-4" />
            </div>
          )}
          <FiChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-52 bg-background border border-border rounded-lg shadow-lg py-2 z-50">
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
            <div className="border-t border-border mt-1 pt-1">
              {deleteConfirm ? (
                <div className="px-3 py-2">
                  <p className="text-xs text-destructive mb-2">
                    This will permanently delete all your data. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="flex-1 text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 text-xs px-2 py-1 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                >
                  <FiTrash2 className="w-3 h-3" />
                  <span>Delete my account</span>
                </button>
              )}
            </div>
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
