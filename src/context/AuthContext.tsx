import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  onAuthStateChanged, 
  FirebaseUser 
} from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreService';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Explorer',
          photoURL: user.photoURL,
          lastLoginAt: Date.now(),
        };
        setFirebaseUser(user);
        setCurrentUser(profile);
        try {
          await syncUserProfile(profile);
        } catch (err: any) {
          console.warn('Profile sync notice:', err?.message);
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Auth state change error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setError(null);
    try {
      const user = await signInWithGoogle();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Explorer',
        photoURL: user.photoURL,
        lastLoginAt: Date.now(),
      };
      setFirebaseUser(user);
      setCurrentUser(profile);
      await syncUserProfile(profile);
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setError(err?.message || 'Google sign-in could not be completed');
      throw err;
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOutUser();
      setCurrentUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      console.error('Sign-out failed:', err);
      setError(err?.message || 'Sign-out failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        error,
        signIn: handleSignIn,
        signOut: handleSignOut,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
