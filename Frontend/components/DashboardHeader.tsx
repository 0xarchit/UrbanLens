

"use client";
import { useState } from "react";
import { Search, Bell, Menu, User } from "lucide-react";

interface HeaderProps {
    setMobileOpen: (open: boolean) => void;
    toggleSidebar?: () => void;
    title?: string;
}

export default function DashboardHeader({ setMobileOpen, toggleSidebar, title = "Dashboard" }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/60 bg-white/60 backdrop-blur-md px-4 shadow-sm sm:px-6 lg:px-8 transition-all duration-300">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => {
                        setMobileOpen(true); // Always open mobile menu
                        toggleSidebar?.();   // Toggle desktop if function exists
                    }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100/80 hover:text-slate-700 transition-colors"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search issues, workers..." 
                        className="h-10 w-64 rounded-full border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                </div>

                <button className="relative rounded-full bg-white p-2.5 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-blue-600 hover:ring-blue-200 transition-all">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white"></span>
                </button>

                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-white shadow-sm ring-2 ring-blue-50">
                    <User className="h-5 w-5" />
                </div>
            </div>
        </header>
    );
}
