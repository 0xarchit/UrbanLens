"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ImageIcon, 
  Activity,
  Maximize2
} from "lucide-react";
import Link from "next/link";

interface IssueEvent {
  id: string;
  event_type: string;
  created_at: string;
  data: any;
}

interface Issue {
  id: string;
  description: string;
  state: string;
  city: string;
  locality: string;
  created_at: string;
  full_address: string;
  priority: number;
  category: string;
  confidence: number;
  image_urls: string[];
  annotated_urls: string[];
  validation_source: string;
  sla_deadline?: string;
  is_duplicate: boolean;
  history?: IssueEvent[];
}

export default function UserIssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchIssueDetails(params.id as string);
    }
  }, [params.id]);

  const fetchIssueDetails = async (id: string) => {
    try {
      // Using generic endpoint - typically users can access their own issues
      const data = await apiGet<Issue>(`/issues/${id}`);
      setIssue(data);
    } catch (error) {
      console.error("Failed to fetch issue details:", error);
      // alert("Failed to load issue details."); 
    } finally {
      setLoading(false);
    }
  };

  const getStateBadge = (state: string) => {
    const styles: Record<string, string> = {
      reported: "bg-blue-100 text-blue-800 border-blue-200",
      assigned: "bg-amber-100 text-amber-800 border-amber-200",
      in_progress: "bg-orange-100 text-orange-800 border-orange-200",
      resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
      closed: "bg-slate-100 text-slate-600 border-slate-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${styles[state] || styles.reported}`}
      >
        {state.replace("_", " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-urban-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-urban-primary"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-urban-bg p-8 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-slate-700">Issue Not Found</h2>
        <Link href="/user" className="mt-4 text-urban-primary hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-urban-bg font-sans pb-12">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-urban-primary/5 rounded-full blur-[80px]"></div>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/user"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-urban-primary mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-slate-400 bg-white/50 px-2 py-0.5 rounded text-sm border border-slate-200">
                  #{issue.id.slice(0, 8)}
                </span>
                {getStateBadge(issue.state)}
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {issue.category || "Reported Issue"}
              </h1>
            </div>
            {issue.priority && (
               <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Priority Level</div>
                  <div className={`text-lg font-bold px-4 py-1 rounded-full border border-slate-200 inline-block bg-white shadow-sm ${
                      issue.priority === 1 ? 'text-red-600 border-red-100 bg-red-50' : 
                      issue.priority === 2 ? 'text-orange-600 border-orange-100 bg-orange-50' : 
                      'text-slate-700'
                  }`}>
                      {issue.priority === 1 ? 'Critical' : issue.priority === 2 ? 'High' : 'Normal'}
                  </div>
               </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details & Evidence */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Analysis & Location */}
            <div className="card bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                   <Activity className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Issue Details & Analysis</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Description</label>
                    <p className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {issue.description || "No description provided."}
                    </p>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">AI Confidence</label>
                    <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-urban-primary rounded-full" 
                                style={{ width: `${(issue.confidence || 0) * 100}%` }}
                            ></div>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-700">
                            {issue.confidence ? `${(issue.confidence * 100).toFixed(1)}%` : "N/A"}
                        </span>
                    </div>
                 </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Location</label>
                 <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <MapPin className="w-5 h-5 text-urban-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-slate-900 font-medium">{issue.full_address || issue.locality}</p>
                        <p className="text-xs text-slate-500 mt-1">{issue.city}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Evidence Gallery */}
            <div className="card bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                   <ImageIcon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Evidence & AI Vision</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Image */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700">Original Photo</h3>
                  </div>
                  <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                    {issue.image_urls?.[0] ? (
                      <>
                        <img 
                          src={issue.image_urls[0]} 
                          alt="Original Issue" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <a href={issue.image_urls[0]} target="_blank" rel="noopener noreferrer" className="bg-white/90 backdrop-blur text-slate-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                <Maximize2 className="w-4 h-4" /> View Full Size
                            </a>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Annotated Image */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-urban-primary flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-urban-primary animate-pulse"></span>
                       Vision Agent Analysis
                    </h3>
                  </div>
                  <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-urban-primary/20 shadow-lg shadow-urban-primary/5 group">
                    {issue.annotated_urls?.[0] ? (
                      <>
                        <img 
                            src={issue.annotated_urls[0]} 
                            alt="AI Analysis" 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <a href={issue.annotated_urls[0]} target="_blank" rel="noopener noreferrer" className="bg-urban-primary/90 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                <Maximize2 className="w-4 h-4" /> Inspect Analysis
                            </a>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-slate-50/5">
                        <Activity className="w-8 h-8 opacity-50 mb-2" />
                        <span className="text-xs">Processing visualization...</span>
                      </div>
                    )}
                    
                    {/* Badge Overlay */}
                    <div className="absolute bottom-3 right-3">
                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            Object Detection v2
                        </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Timeline */}
          <div className="space-y-8">
            <div className="card bg-white/80 backdrop-blur-md h-full">
               <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                   <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Status Timeline</h2>
              </div>

              <div className="relative pl-4 border-l-2 border-slate-100 space-y-8 py-2">
                {issue.state === 'reported' && (
                    <div className="relative">
                        <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-blue-500 bg-white ring-4 ring-blue-50"></span>
                        <h4 className="text-sm font-bold text-slate-900">Report Submitted</h4>
                        <p className="text-xs text-slate-500 mt-1">Issue has been received and is being processed by our AI systems.</p>
                        <span className="text-[10px] font-mono text-slate-400 mt-2 block">
                            {new Date(issue.created_at).toLocaleString()}
                        </span>
                    </div>
                )}
                
                {issue.state === 'resolved' && (
                     <div className="relative">
                        <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-emerald-500 bg-emerald-500 ring-4 ring-emerald-50"></span>
                        <h4 className="text-sm font-bold text-emerald-700">Issue Resolved</h4>
                        <p className="text-xs text-slate-500 mt-1">Work has been completed and verified.</p>
                     </div>
                )}

                {/* Default Start */}
                <div className="relative opacity-60">
                    <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-slate-300 bg-white"></span>
                    <h4 className="text-sm font-bold text-slate-600">Issue Created</h4>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                            {new Date(issue.created_at).toLocaleString()}
                    </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
