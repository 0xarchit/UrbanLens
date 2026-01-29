"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronRight, AlertCircle, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useCachedFetch } from "@/hooks/useCachedFetch";

interface AdminIssueListItem {
  id: string;
  description: string;
  state: string;
  priority: number;
  city: string;
  created_at: string;
  department: string;
  assigned_to: string;
  category: string;
  thumbnail: string;
  locality?: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface IssuesResponse {
  items: AdminIssueListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      setStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Construct Query URL dynamically
  const queryUrl = useMemo(() => {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort_by: sort,
      sort_order: order,
    });

    if (debouncedSearch) query.append("search", debouncedSearch);
    if (status) query.append("status", status);
    if (priority) query.append("priority", priority);

    return `/admin/issues?${query.toString()}`;
  }, [page, limit, sort, order, debouncedSearch, status, priority]);

  const { data: issuesData, loading } = useCachedFetch<IssuesResponse>(queryUrl);

  const issues = issuesData?.items || [];
  const meta: Meta = {
    total: issuesData?.total || 0,
    page: issuesData?.page || 1,
    limit: issuesData?.limit || 10,
    pages: issuesData?.pages || 0,
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= meta.pages) {
      setPage(newPage);
    }
  };

  const getStateBadge = (state: string) => {
    const styles: Record<string, string> = {
      reported: "bg-blue-100 text-blue-700 border-blue-200",
      assigned: "bg-purple-100 text-purple-700 border-purple-200",
      in_progress: "bg-amber-100 text-amber-700 border-amber-200",
      pending_verification: "bg-orange-100 text-orange-700 border-orange-200",
      resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      closed: "bg-slate-100 text-slate-600 border-slate-200",
      escalated: "bg-red-100 text-red-700 border-red-200 animate-pulse",
      rejected: "bg-gray-100 text-gray-500 border-gray-200 line-through",
      verified: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          styles[state] || "bg-gray-100 text-gray-800"
        }`}
      >
        {state.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Issue Management
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor, assign, and resolve reported city issues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatus("pending_verification")}
            className="px-4 py-2 bg-orange-100 text-orange-800 text-sm font-medium rounded-lg hover:bg-orange-200 transition flex items-center gap-2 border border-orange-200"
          >
            <AlertCircle className="w-4 h-4" />
            Pending Reviews
          </button>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-urban-sm p-4 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by ID, description, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 bg-white/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-sans"
            />
          </div>

          <select
            aria-label="Filter by Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 bg-white/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-sans"
          >
            <option value="">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            aria-label="Filter by Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 bg-white/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-sans"
          >
            <option value="">All Priorities</option>
            <option value="1">Critical (P1)</option>
            <option value="2">High (P2)</option>
            <option value="3">Medium (P3)</option>
            <option value="4">Low (P4)</option>
          </select>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
            Loading issues...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-xs uppercase text-slate-500 bg-slate-50/80 font-mono tracking-wider">
                  <th className="px-4 py-3 font-semibold">Issue</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">
                    <button
                      onClick={() => {
                        setSort("priority");
                        setOrder(order === "asc" ? "desc" : "asc");
                      }}
                      className="flex items-center gap-1 hover:text-slate-800 transition-colors"
                    >
                      Priority <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">
                    <button
                      onClick={() => {
                        setSort("created_at");
                        setOrder(order === "asc" ? "desc" : "asc");
                      }}
                      className="flex items-center gap-1 hover:text-slate-800 transition-colors"
                    >
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No issues found matching your filters.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr
                      key={issue.id}
                      className="group hover:bg-blue-50/30 transition-colors duration-200"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200">
                            {issue.thumbnail ? (
                              <img
                                src={issue.thumbnail}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-400">
                                <AlertCircle className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 truncate max-w-50 font-display">
                              {issue.category || "Uncategorized Issue"}
                            </div>
                            <div className="text-xs text-slate-500 truncate max-w-50 font-sans">
                              {issue.description || "No description provided"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700 font-medium">
                            {issue.city || "Unknown"}
                          </span>
                          <span className="text-xs text-slate-500 truncate max-w-37.5">
                            {issue.locality || ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold border ${
                            issue.priority === 1
                              ? "bg-red-50 text-red-600 border-red-100"
                              : issue.priority === 2
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : issue.priority === 3
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-green-50 text-green-600 border-green-100"
                          }`}
                        >
                          P{issue.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStateBadge(issue.state)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {issue.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 ring-2 ring-white shadow-sm">
                              {issue.assigned_to.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-700">{issue.assigned_to}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">
                            Unassigned
                          </span>
                        )}
                        {issue.department && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {issue.department}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <span className="font-medium">{new Date(issue.created_at).toLocaleDateString()}</span>
                        <div className="text-xs text-slate-400 font-mono">
                          {new Date(issue.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/issues/${issue.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200/60 pt-4 mt-4">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {(meta.page - 1) * meta.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{meta.total}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page === 1}
              className="px-3.5 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page === meta.pages}
              className="px-3.5 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
