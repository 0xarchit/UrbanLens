"use client";
import { useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import {
  HardHat,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
  department_id: string;
  is_active: boolean;
  current_workload: number;
  max_workload: number;

  resolved_total?: number;
  efficiency?: number;
}

interface WorkerPerformance {
  id: string;
  resolved_total: number;
  efficiency: number;
}

export default function WorkersPage() {
  const { data: departmentsData, loading: deptLoading, revalidate: revalidateDept } = useCachedFetch<Department[]>("/admin/departments");
  const { data: workersData, loading: workersLoading, revalidate: revalidateWorkers } = useCachedFetch<Worker[]>("/admin/members");
  const { data: perfData, loading: perfLoading, revalidate: revalidatePerf } = useCachedFetch<WorkerPerformance[]>("/admin/workers/performance");
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department_id: "",
    role: "worker",
  });

  const [search, setSearch] = useState("");

  const departments = departmentsData || [];
  
  const workers = useMemo(() => {
    if (!workersData) return [];
    const perfMap = new Map((perfData || []).map(p => [p.id, p]));
    
    return workersData.map((w) => {
      const perf = perfMap.get(w.id);
      return {
        ...w,
        resolved_total: perf?.resolved_total || 0,
        efficiency: perf?.efficiency || 0,
      };
    });
  }, [workersData, perfData]);

  const loading = deptLoading || workersLoading || perfLoading;

  const refreshAll = () => {
    revalidateDept();
    revalidateWorkers();
    revalidatePerf();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/admin/members", formData);
      setShowForm(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        department_id: "",
        role: "worker",
      });
      refreshAll();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create worker";
      alert(message);
    }
  };

  const getDepartmentName = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : "Unassigned";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const filteredWorkers = workers
    .filter((w) => w.role !== "admin")
    .filter(
      (w) =>
        search === "" ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.email.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Workforce Management
          </h2>
          <p className="text-sm text-slate-500">
            Manage field workers, assign tasks, and monitor performance.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Enroll Worker
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">
              New Worker Enrollment
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="worker@city.gov"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Set Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Assign Department
                </label>
                <select
                  title="department"
                  value={formData.department_id}
                  onChange={(e) =>
                    setFormData({ ...formData, department_id: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                Enroll Worker
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search workers by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 flex items-center gap-2 hover:bg-slate-50">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <p className="text-sm font-medium text-slate-500">
            Active Workforce ({filteredWorkers.length})
          </p>
        </div>

        {filteredWorkers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <HardHat className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-slate-500 mt-2">No field workers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map((worker) => (
              <div
                key={worker.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 border border-slate-200">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">
                        {worker.name}
                      </h3>
                      <p className="text-xs text-slate-500">{worker.email}</p>
                    </div>
                  </div>
                  {!worker.is_active && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                      INACTIVE
                    </span>
                  )}
                </div>

                <div className="py-3 border-t border-slate-100 mb-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Department</span>
                    <span className="font-medium text-slate-900">
                      {getDepartmentName(worker.department_id)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Efficiency</span>
                    <span className="font-medium text-slate-900 flex items-center gap-1">
                      {worker.efficiency}{" "}
                      <span className="text-xs text-slate-400">/week</span>
                      {worker.efficiency && worker.efficiency > 5 && (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Resolved</span>
                    <span className="font-medium text-slate-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {worker.resolved_total}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">
                      Current Workload
                    </span>
                    <span className="text-slate-900 font-bold">
                      {worker.current_workload} / {worker.max_workload}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        worker.current_workload >= worker.max_workload
                          ? "bg-red-500"
                          : worker.current_workload > worker.max_workload * 0.7
                            ? "bg-amber-500"
                            : "bg-blue-600"
                      }`}
                      style={{
                        width: `${Math.min(
                          (worker.current_workload /
                            (worker.max_workload || 10)) *
                            100,
                          100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                  {worker.current_workload >= worker.max_workload && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Overloaded
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
