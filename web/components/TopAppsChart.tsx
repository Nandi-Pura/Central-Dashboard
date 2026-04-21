import React from "react";
import { formatBytes } from "../utils/formatters";

interface AppData {
  name: string;
  rx: number;
  tx: number;
  pct: number;
}

interface TopAppsChartProps {
  data: AppData[];
}

export default function TopAppsChart({ data }: TopAppsChartProps) {
  return (
    <div className="glass-card p-5 h-80 flex flex-col fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Top Applications by Bandwidth</h3>
          <p className="text-[10px] text-slate-600 mt-1">Real-time AppRF traffic analytics</p>
        </div>
        <span className="text-sm opacity-50">📊</span>
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar pr-1">
        {data.length === 0 ? (
           <div className="flex-1 flex items-center justify-center text-[10px] text-slate-600 italic">No AppRF data detected</div>
        ) : data.map((item, i) => (
          <div key={i} className="space-y-1.5 group">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-300 group-hover:text-indigo-400 transition-colors">{item.name}</span>
              <span className="text-slate-500">{formatBytes((item?.rx || 0) + (item?.tx || 0))}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-1000 ease-out"
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
