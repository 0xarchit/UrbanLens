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
  onLogout: () => void;
}

export default function DashboardSidebar({
  role,
  mobileOpen,
  setMobileOpen,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

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
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <span className="text-xl font-bold tracking-tight">CityIssue</span>
          <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-xs font-semibold uppercase">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 pt-4 space-y-1">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <Settings className="h-5 w-5" />
              Settings
            </button>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
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
