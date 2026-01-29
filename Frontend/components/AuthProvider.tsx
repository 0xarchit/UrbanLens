"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient, Session, User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  role: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (session: Session | null) => {
    setSession(session);

    if (session?.user) {
      setUser(session.user);

      const storedUser = localStorage.getItem("user");
      let currentRole = "user";

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.email === session.user.email) {
            currentRole = parsed.role || "user";
          }
        } catch (e) {
          console.error("Error parsing stored user", e);
        }
      }
      setRole(currentRole);
      redirectToDashboard(currentRole);
    } else {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser && token) {
        try {
          const parsed = JSON.parse(storedUser);

          if (["admin", "worker"].includes(parsed.role)) {
            setUser({
              id: parsed.id,
              email: parsed.email,
              user_metadata: { full_name: parsed.name },
              app_metadata: {},
              aud: "authenticated",
              created_at: new Date().toISOString(),
            } as User);

            setRole(parsed.role);
            redirectToDashboard(parsed.role);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing stored staff user", e);
        }
      }

      setUser(null);
      setRole(null);

      if (!["/signin", "/signup", "/"].includes(window.location.pathname)) {
        router.push("/signin");
      }
    }

    setLoading(false);
  };

  const redirectToDashboard = (role: string) => {
    if (["/signin", "/signup"].includes(window.location.pathname)) {
      if (role === "admin") router.push("/admin");
      else if (role === "worker") router.push("/worker");
      else router.push("/user");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("supabase_token");
    setRole(null);
    setUser(null);
    setSession(null);
    router.push("/signin");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, role }}>
      {!loading ? (
        children
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
