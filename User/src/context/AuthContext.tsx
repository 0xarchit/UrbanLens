import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDevMode: boolean;
  signInWithGoogle: () => Promise<void>;
  continueWithDevMode: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const redirectUri = makeRedirectUri({
        scheme: 'cityissue',
        path: 'auth/callback',
      });
      
      console.log('OAuth redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        console.log('OAuth result:', result.type);
        
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          
          let accessToken = url.searchParams.get('access_token');
          let refreshToken = url.searchParams.get('refresh_token');
          
          if (!accessToken && url.hash) {
            const hashParams = new URLSearchParams(url.hash.substring(1));
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }
          
          console.log('Got tokens:', !!accessToken, !!refreshToken);
          
          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) throw sessionError;
            
            setSession(sessionData.session);
            setUser(sessionData.session?.user ?? null);
          }
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setLoading(false);
    }
  };


  const continueWithDevMode = () => {
    const devUser: User = {
      id: 'dev-user-123',
      email: 'dev@cityissue.local',
      app_metadata: {},
      user_metadata: { full_name: 'Dev User' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    setUser(devUser);
    setIsDevMode(true);
    setLoading(false);
  };

  const signOut = async () => {
    try {
      setLoading(true);
      if (!isDevMode) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      setIsDevMode(false);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isDevMode, signInWithGoogle, continueWithDevMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
