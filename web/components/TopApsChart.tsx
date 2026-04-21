import React from "react";
import { formatBytes } from "../utils/formatters";

interface ApData {
  name: string;
  usage: number;
}

interface TopApsChartProps {
  data: ApData[];
}

export default function TopApsChart({ data }: TopApsChartProps) {
  const barColor = "var(--accent)";

  if (!data || data.length === 0) return <div className="glass-card p-4 h-full"><div className="skeleton w-full h-full" /></div>;

  const maxUsage = Math.max(...data.map(d => d?.usage || 0), 0.01);

  return (
    <div className="glass-card p-4 h-full flex flex-col fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Top Access Points</h3>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Volume</span>
      </div>
      <div className="flex-1 space-y-3.5">
        {(data || []).map((ap, i) => {
          const usageVal = ap?.usage || 0;
          const pct = Math.max(5, (usageVal / maxUsage) * 100);
          return (
            <div key={i}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-[11px] font-medium font-mono" style={{ color: "var(--text-secondary)" }}>{ap.name}</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{formatBytes(usageVal)}</span>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
