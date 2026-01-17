"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { ArrowLeft, Camera, Navigation, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
          className="text-slate-500 hover:text-slate-800 transition font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-5 h-5" /> Back to List
        </button>
        <a
          href={`https://www.google.com/maps?q=${task.latitude},${task.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition shadow-sm flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" /> Navigation
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {task.annotated_url ? (
              <div className="relative h-64 bg-slate-100">
                <img
                  src={task.annotated_url}
                  alt="Issue"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-64 bg-slate-100 flex items-center justify-center text-slate-400">
                No Image Available
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                  {task.category || "Issue"}
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase">
                  {task.state.replace("_", " ")}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {task.description || "Issue Report"}
              </h1>
              <p className="text-slate-600 mb-6 font-medium">
                {task.full_address}
              </p>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Reported On
                  </p>
                  <p className="text-slate-900 font-medium">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
                {task.sla_deadline && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Deadline
                    </p>
                    <p className="text-red-700 font-bold">
                      {new Date(task.sla_deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-2">
            Task Action
          </h2>

          {task.state === "assigned" || task.state === "rejected" ? (
            <div className="text-center py-6">
              <p className="text-slate-600 mb-6">
                {task.state === "rejected"
                  ? "This task was returned. Please review feedback and restart work."
                  : "You are assigned to this task. Travel to the location and start the work."}
              </p>
              <button
                onClick={handleStart}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                Start Task
              </button>
            </div>
          ) : task.state === "in_progress" ? (
            <>
              <h3 className="font-semibold text-slate-800 mb-4">
                Complete Resolution
              </h3>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Proof of Fix <span className="text-red-600">*</span>
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
                  className={`w-full p-6 border-2 border-dashed rounded-xl transition ${
                    previewUrl
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {previewUrl ? (
                    <div className="text-center">
                      <img
                        src={previewUrl}
                        alt="Proof"
                        className="h-40 mx-auto rounded-lg shadow-sm object-cover mb-4"
                      />
                      <span className="text-sm font-semibold text-blue-700">
                        Change Photo
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-500">
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="font-medium">Tap to Upload Photo</span>
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
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe the repair work completed..."
                />
              </div>

              <button
                onClick={handleComplete}
                disabled={!proofImage || submitting}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Mark as Resolved"
                )}
              </button>
            </>
          ) : task.state === "pending_verification" ? (
            <div className="text-center py-8 bg-orange-50 rounded-lg border border-orange-100">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
              <h3 className="text-lg font-bold text-orange-800">
                Under Review
              </h3>
              <p className="text-orange-600 text-sm mt-1 px-4">
                Your work has been submitted. Waiting for admin verification.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-100">
              <h3 className="text-lg font-bold text-green-800">
                Task Completed
              </h3>
              <p className="text-green-600 text-sm mt-1">
                This issue has been successfully resolved and closed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
