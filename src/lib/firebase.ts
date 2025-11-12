// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseConfig } from './config';

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase - avoid duplicate initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Auth functions with clear error handling
export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResult {
  user: User | null;
  error: AuthError | null;
}

export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return {
      user: result.user,
      error: null
    };
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Firebase Google sign-in error:', error);
    return {
      user: null,
      error: {
        code: firebaseError.code || 'unknown',
        message: firebaseError.message || 'Authentication failed'
      }
    };
  }
};

export const signOutUser = async (): Promise<AuthError | null> => {
  try {
    await signOut(auth);
    return null;
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Firebase sign-out error:', error);
    return {
      code: firebaseError.code || 'unknown',
      message: firebaseError.message || 'Sign out failed'
    };
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
