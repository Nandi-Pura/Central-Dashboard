import React from "react";

interface Alert {
  id: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  count: number;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onDeviceClick?: (deviceId: string) => void;
}

const severityConfig = {
  critical: {
    label: "Critical",
    color: "#f87171",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    dot: "critical",
    icon: "▲"
  },
  warning: {
    label: "Warning",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    dot: "warning",
    icon: "⚠"
  },
  info: {
    label: "Info",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    dot: "healthy",
    icon: "ℹ"
  }
};

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AlertsPanel({ alerts, onDeviceClick }: AlertsPanelProps) {
  const critical = alerts.filter(a => a.severity === "critical");
  const warning = alerts.filter(a => a.severity === "warning");
  const info = alerts.filter(a => a.severity === "info");

  const ordered = [...critical, ...warning, ...info];

  return (
    <div className="glass-card p-5 fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Alerts & Events</h3>
          <p className="text-xs text-slate-500 mt-0.5">Grouped by priority</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => (window as any).resetAlerts && (window as any).resetAlerts()}
            className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 rounded transition-all flex items-center gap-1"
            title="Reset Alert Counts"
          >
            <span>↻</span>
            <span>Reset</span>
          </button>
          <div className="flex items-center gap-2">
            {critical.length > 0 && <span className="badge-critical">{critical.length} Critical</span>}
            {warning.length > 0 && <span className="badge-warning">{warning.length} Warn</span>}
            {info.length > 0 && <span className="badge-info">{info.length} Info</span>}
          </div>
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">✓</div>
          <div className="text-sm font-medium text-emerald-400">All Clear</div>
          <div className="text-xs mt-1">No alerts in the last 24 hours</div>
        </div>
      ) : (
        <div className="space-y-2">
          {ordered.map((alert) => {
            const cfg = severityConfig[alert.severity] || severityConfig.info;
            return (
              <div
                key={alert.id}
                onClick={() => onDeviceClick && onDeviceClick(alert.id)}
                className="flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer hover:brightness-125"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`
                }}
              >
                <span className="text-base leading-none flex-shrink-0 mt-0.5" style={{ color: cfg.color }}>{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 leading-relaxed truncate">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500">{timeAgo(alert.timestamp)}</span>
                    {alert.count > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: cfg.color, background: `${cfg.color}20` }}>
                        {alert.count}× occurrences
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
