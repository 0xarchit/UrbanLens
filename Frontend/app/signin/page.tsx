"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/AuthProvider";
import { HardHat, ShieldCheck, AlertTriangle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type LoginType = "staff" | "user";
type StaffRole = "admin" | "worker";

export default function SignInPage() {
  const { role } = useAuth();
  const router = useRouter();
  
  const [loginType, setLoginType] = useState<LoginType>("user");
  const [staffRole, setStaffRole] = useState<StaffRole>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role) {
      if (role === "admin") router.replace("/admin");
      else if (role === "worker") router.replace("/worker");
      else router.replace("/user");
    }
  }, [role, router]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, expected_role: staffRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      window.location.reload(); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/user` },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="px-8 py-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-slate-800">CityIssue</Link>
          <span className="text-sm text-slate-500 font-medium">Secure Login</span>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Access the municipal portal</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
            <button
              onClick={() => setLoginType("user")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                loginType === "user" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Citizen
            </button>
            <button
              onClick={() => setLoginType("staff")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                loginType === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Staff
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}

          {loginType === "user" ? (
            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-3 transition"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                {loading ? "Connecting..." : "Continue with Google"}
              </button>
              <p className="text-xs text-slate-500 text-center mt-4">
                Secure authentication via Supabase. We do not store your Google password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStaffRole("worker")}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    staffRole === "worker"
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <HardHat className="w-4 h-4" /> Field Worker
                </button>
                <button
                  type="button"
                  onClick={() => setStaffRole("admin")}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    staffRole === "admin"
                      ? "bg-purple-50 border-purple-200 text-purple-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Administrator
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent transition text-slate-900"
                  placeholder="name@city.gov"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent transition text-slate-900"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow-md disabled:opacity-70"
              >
                {loading ? "Verifying..." : "Access Portal"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-sm text-slate-500">
               New citizen? <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">Create account</Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
