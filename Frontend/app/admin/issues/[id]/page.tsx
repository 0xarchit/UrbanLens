"use client";

export const runtime = "edge";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Building2,
  Calendar,
  Activity,
  Layers,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Pencil,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";

interface IssueDetail {
  issue: {
    id: string;
    description: string;
    state: string;
    priority: number;
    latitude: number;
    longitude: number;
    city: string;
    locality: string;
    full_address: string;
    image_urls: string[];
    annotated_urls: string[];
    proof_image_url: string | null;
    created_at: string;
    confidence: number;
    category: string;
    validation_source: string;
    validation_reason: string;
    is_duplicate: boolean;
    sla_deadline: string;
    assigned_member_id?: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  worker: {
    id: string;
    name: string;
    email: string;
  } | null;
  events: {
    id: string;
    type: string;
    agent: string;
    data: string;
    created_at: string;
  }[];
  duplicates: any[];
}

interface Worker {
  id: string;
  name: string;
}

export default function IssueDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedPriority, setSelectedPriority] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) throw new Error("Missing NEXT_PUBLIC_API_URL");

  useEffect(() => {
    if (id) {
      fetchIssueDetails();
      fetchWorkers();
    }
  }, [id]);

  const fetchWorkers = async () => {
    try {
      const res = await apiGet<Worker[]>("/admin/members?role=worker");
      setWorkers(res || []);
    } catch (e) {
      console.error("Failed to fetch workers", e);
    }
  };

  const fetchIssueDetails = async () => {
    try {
      const result = await apiGet<IssueDetail>(`/admin/issues/${id}/details`);
      setData(result);
      if (result) {
        setSelectedPriority(result.issue.priority || 3);
        setSelectedWorker(result.worker?.id || "");
      }
    } catch (error) {
      console.error("Failed to fetch details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updateData: any) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/admin/issues/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Failed to update");

      await fetchIssueDetails();
      setEditingAssignment(false);
      setEditingPriority(false);
    } catch (e) {
      console.error(e);
      alert("Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!confirm(`Are you sure you want to ${status} this issue?`)) return;
    setActionLoading(true);
    try {
      await apiPost(`/admin/issues/${id}/review`, { status });
      fetchIssueDetails();
    } catch (error) {
      console.error("Review failed:", error);
      alert("Failed to update issue status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolutionReview = async (action: "approve" | "reject") => {
    const note = prompt(
      action === "reject" ? "Reason for rejection:" : "Optional approval note:",
    );
    if (action === "reject" && !note) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(
        `${API_URL}/admin/issues/${id}/approve_resolution`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ action, comment: note }),
        },
      );

      if (!res.ok) throw new Error("Status update failed");

      await fetchIssueDetails();
    } catch (error) {
      console.error("Resolution review failed:", error);
      alert("Failed to update resolution status.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500">Loading details...</div>
    );
  if (!data)
    return <div className="p-8 text-center text-red-500">Issue not found</div>;

  const { issue, department, worker, events } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/issues"
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              Issue #{issue.id.slice(0, 8)}
              <span
                className={`text-sm px-2.5 py-0.5 rounded-full border font-medium uppercase tracking-wide 
                ${
                  issue.state === "reported"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : issue.state === "resolved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {issue.state.replace("_", " ")}
              </span>
            </h1>
            <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              Reported on {new Date(issue.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {issue.state === "pending_confirmation" && (
            <>
              <button
                onClick={() => handleReview("rejected")}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
              >
                Reject & Close
              </button>
              <button
                onClick={() => handleReview("approved")}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Approve & Assign
              </button>
            </>
          )}

          {issue.state === "pending_verification" && (
            <>
              <button
                onClick={() => handleResolutionReview("reject")}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
              >
                Reject Incomplete Work
              </button>
              <button
                onClick={() => handleResolutionReview("approve")}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Verify & Approve
              </button>
            </>
          )}

          <button
            className="p-2 text-slate-400 hover:text-slate-600"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-slate-400" />
              Evidence Photos
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Original Report
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {issue.image_urls.map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative group"
                    >
                      <img
                        src={url}
                        alt={`Original ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm"
                        >
                          View Full
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {issue.annotated_urls && issue.annotated_urls.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">
                    AI Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {issue.annotated_urls.map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-blue-200 relative group"
                      >
                        <img
                          src={url}
                          alt={`Analyzed ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          AI Detected
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm"
                          >
                            View Full
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {issue.proof_image_url && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">
                    Work Completion Proof
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-green-200 relative group">
                      <img
                        src={issue.proof_image_url}
                        alt="Work Proof"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                        Worker Proof
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={issue.proof_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-xs font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm"
                        >
                          View Full
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {issue.image_urls.length === 0 && !issue.proof_image_url && (
                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  No images attached
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" />
              Analysis & Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">
                    Category
                  </label>
                  <div className="text-slate-900 font-medium">
                    {issue.category || "Uncategorized"}
                  </div>
                  {issue.confidence > 0 && (
                    <div className="text-xs text-slate-500">
                      AI Confidence: {(issue.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">
                    Description
                  </label>
                  <p className="text-slate-900 text-sm leading-relaxed">
                    {issue.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">
                    Location
                  </label>
                  <div className="flex items-start gap-2 text-slate-900">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium">
                        {issue.locality
                          ? `${issue.locality}, ${issue.city}`
                          : issue.city}
                      </div>
                      {issue.full_address && (
                        <div className="text-slate-600 text-xs mt-0.5 leading-relaxed border-l-2 border-slate-200 pl-2 my-1">
                          {issue.full_address}
                        </div>
                      )}
                      <div className="text-slate-400 text-xs font-mono mt-1">
                        {issue.latitude.toFixed(6)},{" "}
                        {issue.longitude.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-500 uppercase">
                      Priority
                    </label>
                    <button
                      onClick={() => setEditingPriority(!editingPriority)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition-all"
                      aria-label="Edit Priority"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  {editingPriority ? (
                    <div className="flex gap-2 mt-1">
                      <select
                        aria-label="Select priority"
                        value={selectedPriority}
                        onChange={(e) =>
                          setSelectedPriority(Number(e.target.value))
                        }
                        className="bg-white border rounded px-2 py-1 text-sm flex-1"
                      >
                        <option value="1">P1 - Critical</option>
                        <option value="2">P2 - High</option>
                        <option value="3">P3 - Medium</option>
                        <option value="4">P4 - Low</option>
                      </select>
                      <button
                        onClick={() =>
                          handleUpdate({ priority: selectedPriority })
                        }
                        className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                        aria-label="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPriority(false)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold mt-1
                     ${
                       issue.priority === 1
                         ? "bg-red-100 text-red-700"
                         : issue.priority === 2
                           ? "bg-orange-100 text-orange-700"
                           : issue.priority === 3
                             ? "bg-yellow-100 text-yellow-700"
                             : "bg-green-100 text-green-700"
                     }`}
                    >
                      P{issue.priority} Level
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
              Assignment
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Department</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {department?.name || "Not Assigned"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 group relative">
                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingAssignment(!editingAssignment)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500"
                    aria-label="Edit Assignment"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">Worker</div>

                  {editingAssignment ? (
                    <div className="flex flex-col gap-2 mt-1">
                      <select
                        aria-label="Select worker"
                        value={selectedWorker}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="bg-white border rounded px-2 py-1 text-sm w-full"
                      >
                        <option value="">Unassigned</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleUpdate({
                              assigned_member_id: selectedWorker || null,
                            })
                          }
                          className="flex-1 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingAssignment(false)}
                          className="flex-1 py-1 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-slate-900">
                        {worker?.name || "Unassigned"}
                      </div>
                      {worker && (
                        <div className="text-xs text-slate-400">
                          {worker.email}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {issue.sla_deadline && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <div>
                      <div className="text-[10px] font-bold uppercase">
                        SLA Deadline
                      </div>
                      <div className="text-xs font-semibold">
                        {new Date(issue.sla_deadline).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">
              Activity Audit
            </h3>

            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Layers className="w-24 h-24" />
            </div>

            <div className="space-y-0 text-sm relative border-l-2 border-slate-100 ml-2">
              {events.map((event, idx) => (
                <div key={idx} className="pl-6 pb-6 relative last:pb-0">
                  <div className="absolute -left-2.25 top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      {event.agent || "System"}
                    </span>
                    <span className="text-xs text-slate-500 mb-1">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                    <span className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      {event.data}
                    </span>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="pl-6 text-slate-400 italic">
                  No activity recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
