import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  signInAsGuest,
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
  unauthorizedDomain: string | null;
  isGuest: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

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
        setIsGuest(user.isAnonymous || false);
        try {
          await syncUserProfile(profile);
        } catch (err: any) {
          console.warn('Profile sync notice:', err?.message);
        }
      } else {
        // If not logged into Firebase, check if local guest session was active
        const hasGuestSession = localStorage.getItem('craft_guest_session') === 'true';
        if (hasGuestSession) {
          let guestUid = localStorage.getItem('craft_guest_uid');
          if (!guestUid) {
            guestUid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            localStorage.setItem('craft_guest_uid', guestUid);
          }
          const localProfile: UserProfile = {
            uid: guestUid,
            email: null,
            displayName: 'Explorer',
            photoURL: null,
            lastLoginAt: Date.now()
          };
          setCurrentUser(localProfile);
          setIsGuest(true);
        } else {
          setFirebaseUser(null);
          setCurrentUser(null);
          setIsGuest(false);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn('Auth state notice:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    try {
      const user = await signInWithGoogle();
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Ritu',
        photoURL: user.photoURL,
        lastLoginAt: Date.now(),
      };
      setFirebaseUser(user);
      setCurrentUser(profile);
      setIsGuest(false);
      localStorage.removeItem('craft_guest_session');
      await syncUserProfile(profile);
    } catch (err: any) {
      const isUnauthorizedDomain = 
        err?.code === 'auth/unauthorized-domain' || 
        err?.message?.includes('unauthorized-domain');
        
      if (isUnauthorizedDomain) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        console.warn(`[Auth Notice] Firebase domain "${domain}" requires authorized domains setup in Firebase Console. Seamlessly entering Local Sanctuary mode.`);
        setUnauthorizedDomain(domain);

        // Transition immediately into local sanctuary so user is not blocked
        let guestUid = localStorage.getItem('craft_guest_uid');
        if (!guestUid) {
          guestUid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          localStorage.setItem('craft_guest_uid', guestUid);
        }
        const profile: UserProfile = {
          uid: guestUid,
          email: 'ritugodiyal04@gmail.com',
          displayName: 'Ritu',
          photoURL: null,
          lastLoginAt: Date.now()
        };
        setCurrentUser(profile);
        setIsGuest(true);
        localStorage.setItem('craft_guest_session', 'true');
        return;
      }

      console.warn('Sign-in cancelled or interrupted:', err?.message || err);
      setError(err?.message || 'Google sign-in could not be completed');
    }
  };

  const handleContinueAsGuest = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    try {
      // 1. Attempt anonymous Firebase auth if enabled
      const anonUser = await signInAsGuest();
      if (anonUser) {
        const profile: UserProfile = {
          uid: anonUser.uid,
          email: null,
          displayName: 'Explorer',
          photoURL: null,
          lastLoginAt: Date.now()
        };
        setFirebaseUser(anonUser);
        setCurrentUser(profile);
        setIsGuest(true);
        localStorage.setItem('craft_guest_session', 'true');
        localStorage.setItem('craft_guest_uid', anonUser.uid);
        return;
      }
    } catch (e) {
      console.warn('Anonymous auth attempt bypassed:', e);
    }

    // 2. Fallback to resilient local session
    let guestUid = localStorage.getItem('craft_guest_uid');
    if (!guestUid) {
      guestUid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('craft_guest_uid', guestUid);
    }
    const localProfile: UserProfile = {
      uid: guestUid,
      email: null,
      displayName: 'Explorer',
      photoURL: null,
      lastLoginAt: Date.now()
    };
    setCurrentUser(localProfile);
    setIsGuest(true);
    localStorage.setItem('craft_guest_session', 'true');
  };

  const handleSignOut = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    try {
      localStorage.removeItem('craft_guest_session');
      await signOutUser();
      setCurrentUser(null);
      setFirebaseUser(null);
      setIsGuest(false);
    } catch (err: any) {
      console.warn('Sign-out notice:', err);
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
        unauthorizedDomain,
        isGuest,
        signIn: handleSignIn,
        signOut: handleSignOut,
        continueAsGuest: handleContinueAsGuest,
        clearError: () => {
          setError(null);
          setUnauthorizedDomain(null);
        },
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

