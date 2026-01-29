"use client";
import Link from "next/link";
import { 
  Smartphone, 
  Zap, 
  Shield, 
  ChevronRight, 
  Radio, 
  Activity, 
  MapPin, 
  CheckCircle2,
  Building2,
  Users,
  LayoutDashboard,
  LogOut
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function LandingPage() {
  const { user, role, signOut } = useAuth();

  const getDashboardLink = () => {
    if (role === 'admin') return '/admin';
    if (role === 'worker') return '/worker';
    return '/user';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/50 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-200/40 rounded-full blur-[80px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
                  <span className="text-white">U</span>
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Urban<span className="text-blue-600">Lens</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
               <NavLink href="#features">Features</NavLink>
               <NavLink href="#stats">Live Data</NavLink>
               <NavLink href="#roadmap">Roadmap</NavLink>
            </div>

            <div className="flex gap-4 items-center">
              {user ? (
                <>
                  <button 
                    onClick={() => signOut()}
                    className="hidden sm:flex px-4 py-2 text-slate-500 hover:text-red-600 transition-colors"
                  >
                   <LogOut className="w-5 h-5" />
                  </button>
                  <Link
                    href={getDashboardLink()}
                    className="group relative px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="px-5 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors hover:bg-slate-100 rounded-lg"
                  >
                    Agent Login
                  </Link>
                  <Link
                    href="/signup"
                    className="group relative px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/30 overflow-hidden hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative flex items-center gap-2">
                      Get Started <ChevronRight className="w-4 h-4" />
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <div className="relative border-b border-slate-200 bg-gradient-to-b from-transparent to-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-8 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-bold text-slate-600 font-mono tracking-wide">
                SYSTEM ONLINE
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
              City Infrastructure, <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Reimagined by Intelligence.
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              The advanced civic reporting platform powered by AI vision analysis, 
              geo-spatial deduplication, and automated workforce routing.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <Link
                href="/signup"
                className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 hover:shadow-slate-900/30 transition-all hover:-translate-y-1 flex items-center gap-2"
              >
                Report an Issue
                <Smartphone className="w-5 h-5" />
              </Link>
              <Link
                href="/signin"
                className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-lg shadow-slate-200/50 hover:border-slate-300 flex items-center gap-2"
              >
                Track Status
                <Activity className="w-5 h-5 text-blue-600" />
              </Link>
            </div>

            {/* Live Stats Ticker */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              <StatCard label="ISSUES RESOLVED" value="12,405" icon={CheckCircle2} color="text-emerald-500 bg-emerald-50" />
              <StatCard label="ACTIVE AGENTS" value="84" icon={Users} color="text-blue-500 bg-blue-50" />
              <StatCard label="AVG. REACTION" value="1.2hrs" icon={Zap} color="text-amber-500 bg-amber-50" />
              <StatCard label="CITIES LIVE" value="3" icon={Building2} color="text-purple-500 bg-purple-50" />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Core Capabilities</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Built on a microservices architecture designed for scale, security, and speed.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Radio className="w-8 h-8 text-blue-600" />}
              title="Geo-Spatial AI"
              desc="Automatically detects duplicate reports within a 50m radius using smart cluster analysis and GPS verification."
              colorClass="bg-blue-50 group-hover:bg-blue-100/50"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-amber-500" />}
              title="Vision Agent"
              desc="Computer vision algorithms analyze uploaded photos to identify pothole severity, debris types, and hazards instantly."
              colorClass="bg-amber-50 group-hover:bg-amber-100/50"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-emerald-600" />}
              title="End-to-End Encryption"
              desc="Citizen data is AES-256 encrypted at rest. Zero-knowledge protocols ensure maximum privacy."
              colorClass="bg-emerald-50 group-hover:bg-emerald-100/50"
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-8 opacity-75 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-xs font-bold font-mono text-white">U</div>
            <span className="text-sm font-bold tracking-wide text-slate-900">URBANLENS SYSTEMS</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 Dept. of Public Works. Secure. Efficient. Transparent.
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
      {children}
    </Link>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono text-slate-500 font-bold tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 group-hover:scale-105 transition-transform origin-left font-mono">
        {value}
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  desc,
  colorClass
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  colorClass: string;
}) {
  return (
    <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/80 hover:-translate-y-1 transition-all group">
      <div className={`w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center mb-6 border border-slate-100 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm font-medium">{desc}</p>
    </div>
  );
}
