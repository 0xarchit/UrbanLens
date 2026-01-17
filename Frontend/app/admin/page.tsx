"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import {
  Building2,
  Users,
  ClipboardList,
  Clock,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await apiGet<Stats>("/admin/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="text-slate-600 font-medium">Loading Dashboard...</div>
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
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
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
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748B", fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F1F5F9" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend iconType="circle" />
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

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
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
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
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
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">
          {title}
        </h3>
        <p
          className={`text-3xl font-extrabold mt-1 ${
            alert ? "text-amber-600" : "text-slate-900"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
