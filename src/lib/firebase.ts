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

// Load config from YAML - you can move these to your config/site.yaml
const firebaseConfig = {
  apiKey: "AIzaSyATOqzoOFlejYgtKsxPhRHXHCFnR5kc8RA",
  authDomain: "semantic-27923.firebaseapp.com",
  projectId: "semantic-27923",
  storageBucket: "semantic-27923.firebasestorage.app",
  messagingSenderId: "566168954365",
  appId: "1:566168954365:web:892d52e66a40201cece594",
  measurementId: "G-1HXVGY2NFG"
};

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
  } catch (error: any) {
    console.error('Firebase Google sign-in error:', error);
    return {
      user: null,
      error: {
        code: error.code || 'unknown',
        message: error.message || 'Authentication failed'
      }
    };
  }
};

export const signOutUser = async (): Promise<AuthError | null> => {
  try {
    await signOut(auth);
    return null;
  } catch (error: any) {
    console.error('Firebase sign-out error:', error);
    return {
      code: error.code || 'unknown',
      message: error.message || 'Sign out failed'
    };
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
