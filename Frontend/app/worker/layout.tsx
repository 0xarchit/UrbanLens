"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { role, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== "worker") {
      router.push("/signin");
    }
  }, [loading, role, router]);

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <DashboardSidebar 
        role="worker" 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
        desktopOpen={isSidebarOpen}
        onLogout={signOut} 
      />
      
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 h-screen overflow-hidden">
        <DashboardHeader 
            setMobileOpen={setMobileOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            title="Field Worker Portal" 
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
