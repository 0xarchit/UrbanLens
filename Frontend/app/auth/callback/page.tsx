"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (session) {
        const user = session.user;

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.role === "admin") router.push("/admin");
          else if (parsed.role === "worker") router.push("/worker");
          else router.push("/user");
        } else {
          router.push("/user");
        }
      } else {
        const timer = setTimeout(() => {
          router.push("/signin?error=callback_timeout");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Authenticating...</h2>
        <p className="text-slate-500">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
