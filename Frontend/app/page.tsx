import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">
                C
              </div>
              <span className="text-xl font-bold text-slate-900">
                CityIssue
              </span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/signin"
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition shadow-sm"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-slate-600">
                Official Municipal Portal
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Building a Beter City,
              <br />
              <span className="text-blue-700">Together.</span>
            </h1>

            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The official platform for reporting and tracking civic
              infrastructure issues. Powered by AI for faster resolution and
              transparency.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
              >
                Report an Issue
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <Link
                href="/signin"
                className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
              >
                Track Status
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="📱"
              title="Mobile Reporting"
              desc="Use our secure mobile app to capture issues with GPS verification and live proof."
            />
            <FeatureCard
              icon="⚡"
              title="Quick Resolution"
              desc="AI-driven categorization ensures your report reaches the right department instantly."
            />
            <FeatureCard
              icon="🛡️"
              title="Transparent & Secure"
              desc="End-to-end encryption with real-time status updates at every step."
            />
          </div>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 font-medium">
            © 2026 City Department of Public Works
          </p>
          <div className="mt-4 flex justify-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-slate-600">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-600">
              Terms of Service
            </a>
            <a href="#" className="hover:text-slate-600">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-2xl mb-6 border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
