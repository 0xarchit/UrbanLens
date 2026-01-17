"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronRight, AlertCircle, ArrowUpDown } from "lucide-react";
import Link from "next/link";

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

export default function IssuesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [issues, setIssues] = useState<AdminIssueListItem[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchIssues();
  }, [meta.page, debouncedSearch, status, priority, sort, order]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        sort_by: sort,
        sort_order: order,
      });

      if (debouncedSearch) query.append("search", debouncedSearch);
      if (status) query.append("status", status);
      if (priority) query.append("priority", priority);

      const data = await apiGet<{
        items: AdminIssueListItem[];
        total: number;
        page: number;
        limit: number;
        pages: number;
      }>(`/admin/issues?${query.toString()}`);
      setIssues(data.items || []);
      setMeta({
        total: data.total,
        page: data.page,
        limit: data.limit,
        pages: data.pages,
      });
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= meta.pages) {
      setMeta((prev) => ({ ...prev, page: newPage }));
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, description, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            aria-label="Filter by Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mr-2"></div>
            Loading issues...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50/50">
                  <th className="px-4 py-3 font-semibold">Issue</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">
                    <button
                      onClick={() => {
                        setSort("priority");
                        setOrder(order === "asc" ? "desc" : "asc");
                      }}
                      className="flex items-center gap-1 hover:text-slate-800"
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
                      className="flex items-center gap-1 hover:text-slate-800"
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
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-slate-200 overflow-hidden shrink-0 relative">
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
                            <div className="text-sm font-medium text-slate-900 truncate max-w-50">
                              {issue.category || "Uncategorized Issue"}
                            </div>
                            <div className="text-xs text-slate-500 truncate max-w-50">
                              {issue.description || "No description provided"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700">
                            {issue.city || "Unknown"}
                          </span>
                          <span className="text-xs text-slate-500 truncate max-w-37.5">
                            {issue.locality || ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            issue.priority === 1
                              ? "text-red-600"
                              : issue.priority === 2
                                ? "text-orange-600"
                                : issue.priority === 3
                                  ? "text-amber-600"
                                  : "text-green-600"
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
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                              {issue.assigned_to.charAt(0)}
                            </div>
                            {issue.assigned_to}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Unassigned
                          </span>
                        )}
                        {issue.department && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {issue.department}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(issue.created_at).toLocaleDateString()}
                        <div className="text-xs text-slate-400">
                          {new Date(issue.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/issues/${issue.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium">
              {(meta.page - 1) * meta.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{" "}
            of <span className="font-medium">{meta.total}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={meta.page === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={meta.page === meta.pages}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
