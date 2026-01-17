"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/signin`,
        },
      });
      
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="px-8 py-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-slate-800">CityIssue</Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
            <p className="text-slate-500 mt-2">Join as a citizen to report issues</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full py-4 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg flex items-center justify-center gap-3 transition shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {loading ? "Creating..." : "Sign up with Google"}
          </button>

          <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="text-sm font-bold text-blue-900 mb-1">Mobile App Recommended</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  For the best experience, download our mobile app. It supports GPS-verified photo uploads which are required for official reports.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
