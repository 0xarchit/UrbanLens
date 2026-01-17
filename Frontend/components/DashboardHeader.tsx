"use client";
import { useState } from "react";
import { Search, Bell, Menu, User } from "lucide-react";

interface HeaderProps {
    setMobileOpen: (open: boolean) => void;
    title?: string;
}

export default function DashboardHeader({ setMobileOpen, title = "Dashboard" }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setMobileOpen(true)}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-slate-800 hidden sm:block">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search issues, workers..." 
                        className="h-9 w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <button className="relative rounded-full bg-slate-50 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border border-white"></span>
                </button>

                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                    <User className="h-5 w-5" />
                </div>
            </div>
        </header>
    );
}
