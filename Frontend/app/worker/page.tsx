"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { apiGet } from "@/lib/api";
import {
  Coffee,
  MapPin,
  ArrowRight,
  AlertCircle,
  Calendar,
} from "lucide-react";

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
  created_at: string;
  sla_deadline: string;
}

export default function WorkerDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && role === "worker") {
      fetchTasks();
    }
  }, [authLoading, role]);

  const fetchTasks = async () => {
    try {
      const data = await apiGet<Task[]>(`/worker/tasks`);
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const getPriorityBadge = (priority: number) => {
    const badges: Record<number, { bg: string; text: string; border: string }> =
      {
        1: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
        2: {
          bg: "bg-orange-50",
          text: "text-orange-700",
          border: "border-orange-200",
        },
        3: {
          bg: "bg-yellow-50",
          text: "text-yellow-700",
          border: "border-yellow-200",
        },
        4: {
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
        },
      };
    const labels: Record<number, string> = {
      1: "Critical",
      2: "High",
      3: "Medium",
      4: "Low",
    };
    const badge = badges[priority] || badges[3];
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
      >
        {labels[priority] || "Unknown"}
      </span>
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-600 font-medium">Loading Tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Assignments</h2>
          <p className="text-sm text-slate-500">
            Tasks assigned to you for resolution.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 font-medium text-sm uppercase">
              Active Tasks
            </h3>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {
              tasks.filter((t) =>
                ["assigned", "in_progress", "rejected"].includes(t.state)
              ).length
            }
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Coffee className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 font-medium text-sm uppercase">
              Pending Review
            </h3>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {
              tasks.filter((t) =>
                ["pending_verification", "resolved"].includes(t.state)
              ).length
            }
          </p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Current Assignments
      </h3>

      {tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Coffee className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-900 font-medium mt-4 text-lg">
            All tasks completed!
          </p>
          <p className="text-slate-500 text-sm">
            Enjoy your break, no pending assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map((task) => (
            <Link key={task.id} href={`/worker/task/${task.id}`}>
              <div className="h-full p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(task.priority)}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                          task.state === "pending_verification"
                            ? "bg-orange-100 text-orange-700 border border-orange-200"
                            : task.state === "resolved"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {task.state === "pending_verification"
                          ? "Under Review"
                          : task.state.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {task.description || "Issue Report"}
                  </h3>

                  <div className="py-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {task.full_address || `${task.city}, ${task.locality}`}
                      </span>
                    </div>
                    {task.sla_deadline && (
                      <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>
                          Due:{" "}
                          {new Date(task.sla_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-mono">
                    #{task.id.slice(0, 8)}
                  </span>
                  <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Resolve <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
