"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  HardHat,
  Building2,
  Map,
  ListTodo,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  role: "admin" | "worker";
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  desktopOpen: boolean;
  onLogout: () => void;
}

export default function DashboardSidebar({
  role,
  mobileOpen,
  setMobileOpen,
  desktopOpen,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  // ... (links definition skipped for brevity if not changing, but we are inside function)
  const adminLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/issues", label: "Issues", icon: ClipboardList },
    { href: "/admin/review", label: "Review Queue", icon: CheckSquare },
    { href: "/admin/workers", label: "Workforce", icon: HardHat },
    { href: "/admin/departments", label: "Departments", icon: Building2 },
    { href: "/admin/heatmap", label: "Heatmap", icon: Map },
  ];

  const workerLinks = [{ href: "/worker", label: "My Tasks", icon: ListTodo }];

  const links = role === "admin" ? adminLinks : workerLinks;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 transition-all duration-300 ease-in-out shadow-urban-lg", // UrbanLens Light Glass
          "lg:relative lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen ? "lg:w-72" : "lg:w-0 lg:overflow-hidden lg:border-r-0"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b border-slate-100/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
               <span className="text-white font-bold font-mono">U</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">UrbanLens</span>
          </div>
          <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 ring-1 ring-blue-100">
            {role}
          </span>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-4rem)] p-4">
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                  )}
                  <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className={isActive ? "ml-1.5" : ""}>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 pt-4 space-y-1">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <Settings className="h-5 w-5 text-slate-400" />
              Settings
            </button>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
