"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Map } from "lucide-react";

interface HeatmapData {
  city: string;
  count: number;
  priority_avg: number;
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmap();
  }, []);

  const fetchHeatmap = async () => {
    try {
      const heatmapData = await apiGet<HeatmapData[]>("/admin/stats/heatmap");
      setData(heatmapData);
    } catch (error) {
      console.error("Failed to fetch heatmap:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (count: number, max: number) => {
    const intensity = count / max;
    if (intensity > 0.75) return "bg-red-600";
    if (intensity > 0.5) return "bg-orange-500";
    if (intensity > 0.25) return "bg-amber-400";
    return "bg-emerald-500";
  };

  if (loading) {
    return <div className="text-slate-600 font-medium">Loading Analytics...</div>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
       <div>
          <h2 className="text-2xl font-bold text-slate-900">Geographic Heatmap</h2>
          <p className="text-sm text-slate-500">Distribution of issues across city districts.</p>
       </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Issue Density by City</h2>
            <div className="flex gap-4 text-xs font-semibold uppercase text-slate-500">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Low</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Medium</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> High</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"></div> Critical</div>
            </div>
         </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
           <Map className="w-12 h-12 mx-auto text-slate-300" />
          <p className="text-slate-500 mt-2">No location data available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.map((item) => (
            <div
              key={item.city}
              className="group relative bg-white overflow-hidden rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                 <div 
                    className={`h-full ${getIntensityColor(item.count, maxCount)}`} 
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                 ></div>
              </div>

              <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{item.city}</h3>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-white font-bold text-sm ${getIntensityColor(item.count, maxCount)}`}>
                      {Math.round((item.count / maxCount) * 10)}
                    </span>
                 </div>
                 
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">{item.count}</span>
                    <span className="text-sm font-medium text-slate-500">issues</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
