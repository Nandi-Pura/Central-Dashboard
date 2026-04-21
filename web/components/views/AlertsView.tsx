import React, { useState } from "react";
import AlertsPanel from "../AlertsPanel";

interface AlertsViewProps {
  alerts: any[];
  onDeviceClick?: (deviceId: string) => void;
}

export default function AlertsView({ alerts, onDeviceClick }: AlertsViewProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);
  const critical = alerts.filter(a => a.severity === "critical").length;
  const warning = alerts.filter(a => a.severity === "warning").length;
  const info = alerts.filter(a => a.severity === "info").length;

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-white">Alerts & Events</h2>
        <p className="text-xs text-slate-500 mt-0.5">Prioritized network events and incident log</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card text-center cursor-pointer" onClick={() => setFilter("critical")} style={{ border: `1px solid ${filter === "critical" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.06)"}` }}>
          <div className="text-3xl font-black text-rose-400">{critical}</div>
          <div className="text-xs text-slate-500 mt-1">Critical</div>
        </div>
        <div className="kpi-card text-center cursor-pointer" onClick={() => setFilter("warning")} style={{ border: `1px solid ${filter === "warning" ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.06)"}` }}>
          <div className="text-3xl font-black text-amber-400">{warning}</div>
          <div className="text-xs text-slate-500 mt-1">Warning</div>
        </div>
        <div className="kpi-card text-center cursor-pointer" onClick={() => setFilter("info")} style={{ border: `1px solid ${filter === "info" ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}` }}>
          <div className="text-3xl font-black text-blue-400">{info}</div>
          <div className="text-xs text-slate-500 mt-1">Info</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(["all", "critical", "warning", "info"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all capitalize"
            style={{
              background: filter === f ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              color: filter === f ? "#818cf8" : "#94a3b8",
              border: `1px solid ${filter === f ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`
            }}>
            {f === "all" ? `All (${alerts.length})` : f}
          </button>
        ))}
      </div>

      <AlertsPanel alerts={filtered} onDeviceClick={onDeviceClick} />
    </div>
  );
}
