"use client";
import { useEffect, useState } from "react";
// Removed duplicate imports
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
import { Skeleton } from "@/components/ui/Skeleton";

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

import { useCachedFetch } from "@/hooks/useCachedFetch";

// ... existing imports

export default function WorkerDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Use cached fetch for instant load + background update
  const { data: tasksData, loading: tasksLoading } = useCachedFetch<Task[]>(
    role === "worker" ? "/worker/tasks" : "" 
  );

  const tasks = tasksData || [];
  
  // Combine loading states
  const isLoading = authLoading || (tasksLoading && tasks.length === 0);


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
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
        },
        4: {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
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
        className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border} flex items-center gap-1.5`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${priority === 1 ? 'bg-red-500' : priority === 2 ? 'bg-orange-500' : priority === 3 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
        {labels[priority] || "Unknown"}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>

        <Skeleton className="h-6 w-40 mb-4" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Assignments</h2>
          <p className="text-sm text-slate-500">
            Tasks assigned to you for resolution.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-urban-sm hover:shadow-urban-md transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider font-mono">
              Active Tasks
            </h3>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tighter">
            {
              tasks.filter((t) =>
                ["assigned", "in_progress", "rejected"].includes(t.state)
              ).length
            }
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-urban-sm hover:shadow-urban-md transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shadow-sm">
              <Coffee className="w-5 h-5" />
            </div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider font-mono">
              Pending Review
            </h3>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tighter">
            {
              tasks.filter((t) =>
                ["pending_verification", "resolved"].includes(t.state)
              ).length
            }
          </p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
        Current Assignments
      </h3>

      {tasks.length === 0 ? (
        <div className="text-center py-16 bg-white/40 backdrop-blur-sm rounded-2xl border border-slate-200/60 border-dashed">
          <Coffee className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-900 font-bold text-lg">
            All caught up!
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Enjoy your break, no pending assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map((task) => (
            <Link key={task.id} href={`/worker/task/${task.id}`}>
              <div className="h-full p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 shadow-urban-sm hover:shadow-urban-md hover:-translate-y-1 hover:border-blue-300/50 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>
                <div>
                  <div className="flex justify-between items-start mb-4 pl-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getPriorityBadge(task.priority)}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border ${
                          task.state === "pending_verification"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : task.state === "resolved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {task.state === "pending_verification"
                          ? "Under Review"
                          : task.state.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 pl-2 group-hover:text-blue-700 transition-colors line-clamp-2 tracking-tight">
                    {task.description || "Issue Report"}
                  </h3>

                  <div className="py-3 pl-2 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                         <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate font-medium">
                        {task.full_address || `${task.city}, ${task.locality}`}
                      </span>
                    </div>
                    {task.sla_deadline && (
                      <div className="flex items-center gap-2.5 text-sm text-red-600 font-bold bg-red-50/50 p-2 rounded-lg border border-red-100/50 w-fit">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Due:{" "}
                          {new Date(task.sla_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 pl-2 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-mono font-medium bg-slate-100 px-2 py-1 rounded">
                    ID: {task.id.slice(0, 8)}
                  </span>
                  <span className="text-blue-600 text-sm font-bold flex items-center gap-1.5 group-hover:gap-2.5 transition-all bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 group-hover:bg-blue-100 group-hover:border-blue-200">
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
