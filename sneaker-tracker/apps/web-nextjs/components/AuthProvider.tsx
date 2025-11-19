/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  getIdTokenResult,
} from 'firebase/auth';
import { getAuthInstance, getGoogleProvider } from '../lib/firebaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuthInstance();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Check admin claim
      if (firebaseUser) {
        try {
          const idTokenResult = await getIdTokenResult(firebaseUser);
          setIsAdmin(Boolean(idTokenResult.claims.admin));
        } catch (error) {
          console.error('Error checking admin claim:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const auth = getAuthInstance();
      const provider = getGoogleProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const auth = getAuthInstance();
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
