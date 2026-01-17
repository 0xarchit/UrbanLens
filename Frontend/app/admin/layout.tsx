"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/signin");
    }
  }, [loading, role, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <DashboardSidebar
        role="admin"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={signOut}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <DashboardHeader setMobileOpen={setMobileOpen} title="Admin Console" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
