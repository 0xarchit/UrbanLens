"use client"
import Link from "next/link";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import {
  Building2,
  Users,
  ClipboardList,
  Clock,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Stats {
  departments: number;
  members: number;
  total_issues: number;
  pending_issues: number;
  resolved_issues: number;
  verification_needed: number;
  issues_by_category: { name: string; value: number }[];
  issues_activity: { name: string; reported: number; resolved: number }[];
}

export default function AdminDashboard() {
  const { data: stats, loading } = useCachedFetch<Stats>("/admin/stats");

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasChartData =
    stats?.issues_by_category && stats.issues_by_category.length > 0;
  const hasActivityData =
    stats?.issues_activity && stats.issues_activity.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Overview
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Departments"
          value={stats?.departments || 0}
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Total Staff"
          value={stats?.members || 0}
          icon={<Users className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          title="Total Issues"
          value={stats?.total_issues || 0}
          icon={<ClipboardList className="w-5 h-5 text-slate-600" />}
        />
        <StatCard
          title="Pending"
          value={stats?.pending_issues || 0}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          alert={true}
        />
        <Link
          href="/admin/issues?status=pending_verification"
          className="block transform transition-transform hover:scale-105"
        >
          <StatCard
            title="Needs Review"
            value={stats?.verification_needed || 0}
            icon={<ClipboardCheck className="w-5 h-5 text-indigo-600" />}
            alert={(stats?.verification_needed || 0) > 0}
          />
        </Link>
        <StatCard
          title="Total Resolved"
          value={stats?.resolved_issues || 0}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-urban-sm hover:shadow-urban-md transition-all">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Weekly Activity
          </h3>
          {hasActivityData ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.issues_activity || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12, fontFamily: 'var(--font-fira-sans)' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12, fontFamily: 'var(--font-fira-sans)' }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F1F5F9" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(226, 232, 240, 0.8)",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(4px)",
                      fontFamily: 'var(--font-fira-sans)',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontFamily: 'var(--font-fira-sans)' }} />
                  <Bar
                    dataKey="reported"
                    name="Reported"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="resolved"
                    name="Resolved"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">
              No activity data available yet.
            </div>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-urban-sm hover:shadow-urban-md transition-all">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
            Issues by Category
          </h3>
          {hasChartData ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.issues_by_category}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats?.issues_by_category?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(226, 232, 240, 0.8)",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(4px)",
                      fontFamily: 'var(--font-fira-sans)',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'var(--font-fira-sans)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">
              No category data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  alert = false,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 shadow-urban-sm hover:shadow-urban-md transition-all hover:-translate-y-1 group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider font-mono">
          {title}
        </h3>
        <p
          className={`text-3xl font-extrabold mt-2 tracking-tight ${
            alert ? "text-amber-600" : "text-slate-900"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
