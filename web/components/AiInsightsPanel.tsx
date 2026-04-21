import React from "react";

interface Insight {
  type: "warning" | "info" | "success";
  message: string;
}

interface AiInsightsPanelProps {
  insights: Insight[];
  healthScore: number;
}

const typeConfig = {
  warning: { icon: "⚡", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  info: { icon: "💡", color: "#316dca", bg: "rgba(49,109,202,0.1)", border: "rgba(49,109,202,0.2)" },
  success: { icon: "✓", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" }
};

export default function AiInsightsPanel({ insights, healthScore }: AiInsightsPanelProps) {
  return (
    <div className="glass-card p-5 fade-in-up" style={{ background: "var(--bg-card)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 text-white shadow-lg shadow-indigo-500/10"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          ✦
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight" style={{ color: "var(--text-primary)" }}>AI Insights</h3>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Network Analysis</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm"
            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border-subtle)" }}>
            Real-time
          </span>
        </div>
      </div>

      <div className="mb-4 h-px" style={{ background: "var(--divider)" }} />

      {insights.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-10 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const cfg = typeConfig[insight.type] || typeConfig.info;
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border transition-all hover:translate-x-1"
                style={{ background: cfg.bg, borderColor: cfg.border }}
              >
                <span className="text-base leading-none flex-shrink-0 mt-0.5">{cfg.icon}</span>
                <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insight.message}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 p-3 rounded-xl border transition-colors shadow-sm" style={{ background: "var(--accent-soft)", borderColor: "var(--border-subtle)" }}>
        <div className="text-[10px] uppercase tracking-widest font-black mb-1" style={{ color: "var(--accent)" }}>Executive Summary</div>
        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          {healthScore >= 80
            ? `Network is stable with a ${healthScore}% health score. No immediate action required.`
            : healthScore >= 60
            ? `Network health is at ${healthScore}%. Some issues detected — review alerts for guidance.`
            : `Network is under stress at ${healthScore}% health. Immediate attention recommended.`}
        </p>
      </div>
    </div>
  );
}
