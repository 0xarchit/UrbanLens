"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

export const runtime = "edge";
import { ArrowLeft, Camera, Navigation, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) throw new Error("Missing NEXT_PUBLIC_API_URL");

interface Task {
  id: string;
  description: string;
  priority: number;
  state: string;
  city: string;
  locality: string;
  full_address: string;
  latitude: number;
  longitude: number;
  image_url: string;
  annotated_url: string;
  category: string;
  created_at: string;
  sla_deadline: string;
}

export default function TaskDetailPage() {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const data = await apiGet<Task>(`/worker/tasks/${taskId}`);
      setTask(data);
    } catch (error) {
      console.error("Failed to fetch task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleStart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/worker/tasks/${taskId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchTask();
      } else {
        console.error("Failed to start task");
      }
    } catch (error) {
      console.error("Error starting task:", error);
    }
  };

  const handleComplete = async () => {
    if (!proofImage) {
      alert("Please upload a proof image");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please sign in again.");
      router.push("/signin");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("proof_image", proofImage);
      if (notes) formData.append("notes", notes);

      const res = await fetch(`${API_URL}/worker/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        router.push("/worker");
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to complete task");
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-slate-600 font-medium">Loading Task Details...</div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-500 text-lg">Task not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 font-medium hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-900 transition font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/50"
        >
          <ArrowLeft className="w-5 h-5" /> Back to List
        </button>
        <a
          href={`https://www.google.com/maps?q=${task.latitude},${task.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 transform hover:-translate-y-0.5"
        >
          <Navigation className="w-4 h-4" /> Navigation
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-urban-sm overflow-hidden">
            {task.annotated_url ? (
              <div className="relative h-72 bg-slate-100 group">
                <img
                  src={task.annotated_url}
                  alt="Issue"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                <div className="absolute bottom-4 left-4 text-white">
                    <p className="font-bold text-lg text-shadow-sm">{task.category}</p>
                </div>
              </div>
            ) : (
              <div className="h-64 bg-slate-100 flex items-center justify-center text-slate-400">
                No Image Available
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${
                    task.state === 'pending_verification' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    task.state === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {task.state.replace("_", " ")}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-auto">
                   ID: {task.id.slice(0, 8)}
                </span>
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                {task.description || "Issue Report"}
              </h1>
              <p className="text-slate-600 mb-8 font-medium text-lg leading-relaxed">
                {task.full_address}
              </p>

              <div className="grid grid-cols-2 gap-6 py-6 border-t border-slate-200/60">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Reported On
                  </p>
                  <p className="text-slate-900 font-bold text-lg font-mono">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
                {task.sla_deadline && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                      Deadline
                    </p>
                    <p className="text-red-600 font-bold text-lg font-mono">
                      {new Date(task.sla_deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-urban-sm p-8 h-fit sticky top-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200/60 pb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
            Task Action
          </h2>

          {task.state === "assigned" || task.state === "rejected" ? (
            <div className="text-center py-6">
              <p className="text-slate-600 mb-8 font-medium">
                {task.state === "rejected"
                  ? "This task was returned. Please review feedback and restart work."
                  : "You are assigned to this task. Travel to the location and start the work."}
              </p>
              <button
                onClick={handleStart}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1"
              >
                Start Task
              </button>
            </div>
          ) : task.state === "in_progress" ? (
            <>
              <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">
                Complete Resolution
              </h3>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Proof of Fix <span className="text-red-500">*</span>
                </label>
                <input
                  title="image"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`w-full p-8 border-2 border-dashed rounded-2xl transition-all group ${
                    previewUrl
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                  }`}
                >
                  {previewUrl ? (
                    <div className="text-center">
                      <img
                        src={previewUrl}
                        alt="Proof"
                        className="h-48 mx-auto rounded-xl shadow-md object-cover mb-4"
                      />
                      <span className="text-sm font-bold text-blue-600 group-hover:text-blue-700">
                        Change Photo
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <div className="p-4 bg-slate-100 rounded-full mb-3 group-hover:bg-blue-100 transition-colors">
                         <Camera className="w-8 h-8" />
                      </div>
                      <span className="font-bold">Tap to Upload Photo</span>
                    </div>
                  )}
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                  rows={4}
                  placeholder="Describe the repair work completed..."
                />
              </div>

              <button
                onClick={handleComplete}
                disabled={!proofImage || submitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-1 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Mark as Resolved"
                )}
              </button>
            </>
          ) : task.state === "pending_verification" ? (
            <div className="text-center py-10 bg-orange-50/50 rounded-2xl border border-orange-100">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-orange-900 mb-2">
                Under Review
              </h3>
              <p className="text-orange-700 font-medium px-4">
                Your work has been submitted. Waiting for admin verification.
              </p>
            </div>
          ) : (
            <div className="text-center py-10 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <div className="w-8 h-8 text-emerald-600 font-bold text-2xl">✓</div>
              </div>
              <h3 className="text-xl font-bold text-emerald-900 mb-2">
                Task Completed
              </h3>
              <p className="text-emerald-700 font-medium">
                This issue has been successfully resolved and closed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
