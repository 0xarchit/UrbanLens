import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { CONFIG_ERROR, supabase } from "../config/supabase";
import { config } from "../config/env";
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "../lib/googleAuthSafe";
import { Alert } from "react-native";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDevMode: boolean;
  configError: string | null;
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
  const [configError] = useState<string | null>(CONFIG_ERROR);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: config.GOOGLE_CLIENT_ID,
        scopes: ["email", "profile"],
        offlineAccess: true,
      });
    } catch (e: any) {
      if (e.message?.includes("RNGoogleSignin")) {
        console.warn(
          "Google Sign-In not supported in Expo Go. Use a development build or 'Dev Mode'.",
        );
      } else {
        console.error("Google Sign-In config error:", e);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      if (!supabase) {
        Alert.alert("Configuration Error", "Supabase is not configured.");
        return;
      }

      setLoading(true);

      // 1. Check Play Services (Android)
      try {
        await GoogleSignin.hasPlayServices();
      } catch (e: any) {
        if (e.message?.includes("RNGoogleSignin")) {
          Alert.alert(
            "Expo Go Detected",
            "Native Google Sign-In is not supported in Expo Go. Please use 'Dev Mode' or build a development client.",
          );
          setLoading(false);
          return;
        }
        throw e;
      }

      // 2. Native Sign In
      const userInfo = await GoogleSignin.signIn();

      // 3. Get ID Token
      if (userInfo.data?.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });

        if (error) throw error;

        // Critical: Update state immediately to trigger UI refresh
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
      } else {
        throw new Error("No ID token returned from Google Sign-In");
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log("User cancelled the login flow");
            break;
          case statusCodes.IN_PROGRESS:
            console.log("Sign in is in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert(
              "Error",
              "Google Play Services not available or outdated.",
            );
            break;
          default:
            console.error("Google Sign-In Error:", error);
            Alert.alert("Google Sign-In Error", error.message);
        }
      } else {
        console.error("An error occurred:", error);
        Alert.alert("Sign-In Failed", error.message || "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  const continueWithDevMode = () => {
    const devUser: User = {
      id: "dev-user-123",
      email: "dev@cityissue.local",
      app_metadata: {},
      user_metadata: { full_name: "Dev User" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    setUser(devUser);
    setIsDevMode(true);
    setLoading(false);
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // Sign out from Google Native SDK first
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.warn("Google Sign-Out error (ignoring):", e);
      }

      if (!isDevMode && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      setIsDevMode(false);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isDevMode,
        configError,
        signInWithGoogle,
        continueWithDevMode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
