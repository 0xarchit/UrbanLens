"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiGet } from "@/lib/api";
import { Smartphone, FileText, MapPin } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Issue {
  id: string;
  description: string;
  priority: number;
  state: string;
  city: string;
  locality: string;
  created_at: string;
  primary_category: string;
  classification?: {
    primary_category: string;
    confidence: number;
  };
  images?: { file_path: string; annotated_path: string }[];
}

export default function UserDashboard() {
  const { user, role, signOut, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
       if (role !== "user") {
          router.push("/signin"); 
          return;
       }
       if (user) fetchIssues(user.id);
    }
  }, [authLoading, role, router, user]);

  const fetchIssues = async (userId: string) => {
    try {
      const token = localStorage.getItem("supabase_token");
      const res = await fetch(`${API_URL}/issues?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    }
  };

  const getStateBadge = (state: string) => {
    const styles: Record<string, string> = {
      reported: "bg-blue-100 text-blue-800",
      assigned: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-orange-100 text-orange-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-slate-100 text-slate-600",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[state] || styles.reported}`}>
        {state.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 font-medium">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Reports</h1>
              <p className="text-xs text-slate-500">Citizen Portal</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.user_metadata?.full_name || user?.email || "User"}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-white border border-slate-200 text-red-600 font-medium rounded-lg hover:bg-red-50 hover:border-red-100 transition shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-blue-900 font-bold text-lg mb-1">Make a New Report</h3>
            <p className="text-blue-700 leading-relaxed">
              To ensure data accuracy and GPS verification, new issues must be reported through the official <strong>City Issue Mobile App</strong>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Total Reports</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{issues.length}</p>
          </div>
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Resolved</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {issues.filter((i) => i.state === "resolved").length}
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">In Progress</p>
            <p className="text-3xl font-extrabold text-amber-500 mt-2">
              {issues.filter((i) => ["assigned", "in_progress"].includes(i.state)).length}
            </p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Activity</h2>

        {issues.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <FileText className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-slate-900 font-medium text-lg mt-4">No reports submitted yet</p>
            <p className="text-slate-500 mt-2">Download the mobile app to start contributing to your city.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {getStateBadge(issue.state)}
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide px-2 border-l border-slate-200">
                      {issue.classification?.primary_category || issue.primary_category || "General Issue"}
                    </span>
                  </div>
                  <span className="text-sm text-slate-400 font-medium">
                    {new Date(issue.created_at).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                   {issue.description || "No description provided"}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {issue.locality ? `${issue.locality}, ` : ""}{issue.city}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 py-8 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400">
            2026 City Department of Public Works - Secure Citizen Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
