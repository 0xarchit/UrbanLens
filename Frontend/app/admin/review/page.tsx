"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { CheckCircle2, XCircle } from "lucide-react";

interface Issue {
  id: string;
  description: string;
  state: string;
  city: string;
  locality: string;
  created_at: string;
  full_address: string;
  images: { file_path: string; annotated_path: string }[];
  priority: number;
}

export default function ManualReviewPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingIssues();
  }, []);

  const fetchPendingIssues = async () => {
    try {
      const data = await apiGet<{ items: Issue[] }>("/issues?state=reported");
      setIssues(data.items || []);
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    try {
      const data = await apiPost<{ message: string }>(`/admin/issues/${id}/review`, { status });
      setIssues(prev => prev.filter(i => i.id !== id));
      alert(data.message);
    } catch (error) {
      console.error("Review failed", error);
      alert("Failed to review issue");
    }
  };

  if (loading) {
    return <div className="text-slate-600 font-medium">Loading Reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-slate-900">Manual Review Queue</h2>
            <p className="text-sm text-slate-500">Validate incoming citizen reports before assignment.</p>
         </div>
         <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
             {issues.length} Pending
         </div>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-400" />
          <p className="text-slate-900 font-medium mt-4 text-lg">All caught up!</p>
          <p className="text-slate-500">No issues pending manual review.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-1/3 h-64 md:h-auto bg-slate-100 relative">
                  {issue.images?.[0] ? (
                      <img 
                          src={issue.images[0].annotated_path || issue.images[0].file_path} 
                          alt="Evidence" 
                          className="w-full h-full object-cover"
                      />
                  ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">No Image</div>
                  )}
              </div>

              <div className="p-6 md:w-2/3 flex flex-col justify-between">
                  <div>
                      <div className="flex justify-between items-start mb-2">
                           <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase">
                              {issue.city}
                           </span>
                           <span className="text-xs text-slate-400">
                              {new Date(issue.created_at).toLocaleDateString()}
                           </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{issue.description || "No description"}</h3>
                      <p className="text-slate-600 text-sm mb-4">{issue.full_address || issue.locality}</p>
                  </div>

                  <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
                      <button 
                          onClick={() => handleReview(issue.id, "approved")}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-2"
                      >
                          <CheckCircle2 className="w-4 h-4" /> Approve & Assign
                      </button>
                      <button 
                          onClick={() => handleReview(issue.id, "rejected")}
                          className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                      >
                          <XCircle className="w-4 h-4" /> Reject
                      </button>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
