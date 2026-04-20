'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiLogOut, FiChevronDown, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import Image from 'next/image';
import { signInWithGoogle, signOutUser } from '@/lib/firebase';
import { deleteAccount } from '@/lib/api';
import { getBalance } from '@/lib/paymentService';
import { useAuth } from '@/contexts/AuthContext';

// ── Delete confirmation modal ─────────────────────────────────────────────────

interface DeleteModalProps {
  userEmail: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const DeleteAccountModal: React.FC<DeleteModalProps> = ({ userEmail, onConfirm, onCancel }) => {
  const [emailInput, setEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch balance when modal opens
  useEffect(() => {
    getBalance()
      .then(b => setBalance(b))
      .catch(() => setBalance(0))
      .finally(() => setBalanceLoading(false));

    // Auto-focus the email input after balance loads
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const emailMatches = emailInput.trim().toLowerCase() === userEmail.toLowerCase();

  const handleConfirm = async () => {
    if (!emailMatches) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch {
      setIsDeleting(false);
    }
  };

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Delete account</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Credit warning */}
        {!balanceLoading && balance !== null && balance > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-destructive">
              You have <strong>{balance} credits</strong> remaining
            </p>
            <p className="text-xs text-muted-foreground">
              Your unused credits will be permanently lost. Credits are non-refundable once the account is deleted.
            </p>
          </div>
        )}

        {/* What gets deleted */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-xs uppercase tracking-wide">What will be deleted:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>All your CV profiles and uploaded photos</li>
            <li>All generated PDF files</li>
            {balance !== null && balance > 0 && <li>{balance} remaining credits</li>}
            <li>Your account and personal data</li>
          </ul>
        </div>

        {/* Email confirmation input */}
        <div className="space-y-1.5">
          <label className="text-sm text-foreground">
            Type your email address to confirm:
            <span className="ml-1 font-mono text-xs text-muted-foreground select-all">{userEmail}</span>
          </label>
          <input
            ref={inputRef}
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && emailMatches) handleConfirm(); if (e.key === 'Escape') onCancel(); }}
            placeholder={userEmail}
            className={[
              'w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground',
              'placeholder:text-muted-foreground/50 outline-none transition-colors',
              emailInput.length > 0 && !emailMatches
                ? 'border-destructive/60 focus:border-destructive'
                : 'border-border focus:border-primary',
            ].join(' ')}
          />
          {emailInput.length > 0 && !emailMatches && (
            <p className="text-xs text-destructive">Email does not match</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={!emailMatches || isDeleting}
            className={[
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              emailMatches && !isDeleting
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-destructive/30 text-destructive-foreground/50 cursor-not-allowed',
            ].join(' ')}
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Deleting…
              </span>
            ) : (
              'Delete my account'
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Login / profile button ────────────────────────────────────────────────────

const LoginButton: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
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
    if (error) console.error('Sign-out failed:', error);
    setShowDropdown(false);
  };

  const handleDeleteClick = () => {
    setShowDropdown(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteAccount();
    await signOutUser();
  };

  // Loading state
  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />;
  }

  // Authenticated
  if (isAuthenticated && user) {
    return (
      <>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-secondary transition-colors"
          >
            {user.photoURL ? (
              <Image src={user.photoURL} alt="Profile" width={32} height={32} className="rounded-full" />
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
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <FiLogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>

              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                >
                  <FiTrash2 className="w-3 h-3" />
                  <span>Delete my account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full-screen delete confirmation modal */}
        {showDeleteModal && user.email && (
          <DeleteAccountModal
            userEmail={user.email}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}
      </>
    );
  }

  // Unauthenticated
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
        <p className="text-xs text-red-500 mt-1 max-w-48">{error}</p>
      )}
    </div>
  );
};

export default LoginButton;
