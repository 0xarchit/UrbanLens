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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.push("/signin");
    }
  }, [loading, role, router]);

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-urban-bg font-sans overflow-hidden relative">
      <DashboardSidebar
        role="admin"
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopOpen={isSidebarOpen}
        onLogout={signOut}
      />

      {/* Ambient Background - Global for Admin */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
           <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-urban-primary/5 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[80px]"></div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 h-screen overflow-hidden">
        <DashboardHeader 
            setMobileOpen={setMobileOpen} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            title="Admin Console" 
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
