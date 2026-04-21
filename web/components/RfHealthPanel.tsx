import React from "react";

interface RfHealthProps {
  rfHealth: {
    channelUtil24: number;
    channelUtil5: number;
    interference: number;
    noiseFloor: number;
    retryRate: number;
  };
}

export default function RfHealthPanel({ rfHealth = {} }: any) {
  const metrics = [
    { label: "2.4GHz Util", value: `${rfHealth?.channelUtil24 || 0}%`, status: (rfHealth?.channelUtil24 || 0) > 50 ? "warning" : "healthy" },
    { label: "5GHz Util", value: `${rfHealth?.channelUtil5 || 0}%`, status: (rfHealth?.channelUtil5 || 0) > 70 ? "warning" : "healthy" },
    { label: "Interference", value: `${rfHealth?.interference || 0}%`, status: (rfHealth?.interference || 0) > 30 ? "warning" : "healthy" },
    { label: "Noise Floor", value: `${rfHealth?.noiseFloor || 0} dBm`, status: "info" },
    { label: "Retry Rate", value: `${rfHealth?.retryRate || 0}%`, status: (rfHealth?.retryRate || 0) > 10 ? "warning" : "healthy" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-[var(--accent-green)]";
      case "warning": return "text-[var(--accent-amber)]";
      case "critical": return "text-[var(--accent-red)]";
      default: return "text-[var(--accent-blue)]";
    }
  };

  return (
    <div className="glass-card p-4 h-full flex flex-col fade-in-up">
      <h3 className="text-xs font-semibold text-[#adbac7] mb-4">RF Performance</h3>
      <div className="flex-1 space-y-3">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
            <span className="text-[11px] text-slate-500 font-medium">{m.label}</span>
            <span className={`text-[11px] font-bold font-mono ${getStatusColor(m.status)}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
