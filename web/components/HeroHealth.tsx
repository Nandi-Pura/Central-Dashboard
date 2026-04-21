import React from "react";

interface HeroHealthProps {
  healthScore: number;
  healthLevel: string;
  summary: string;
  aps: { up: number; down: number; total: number };
  switches: { up: number; down: number; total: number };
  gateways: { online: number; offline: number; total: number };
}

export default function HeroHealth({ 
  healthScore = 0, 
  healthLevel = "info", 
  summary = "Loading health data...", 
  aps = { up: 0, down: 0, total: 0 }, 
  switches = { up: 0, down: 0, total: 0 }, 
  gateways = { online: 0, offline: 0, total: 0 } 
}: HeroHealthProps) {
  const isHealthy = healthLevel === "excellent" || healthLevel === "healthy";
  const isWarning = healthLevel === "good";
  const isCritical = healthLevel === "critical";

  const glowClass = isHealthy ? "hero-glow-green" : isWarning ? "hero-glow-yellow" : "hero-glow-red";
  const scoreTextClass = isHealthy ? "gradient-text-health" : isWarning ? "gradient-text-warning" : "gradient-text-critical";
  const statusLabel = isHealthy ? "Healthy" : isWarning ? "Warning" : "Critical";
  const statusColor = isHealthy ? "#10b981" : isWarning ? "#f59e0b" : "#ef4444";
  const statusBg = isHealthy ? "rgba(16,185,129,0.1)" : isWarning ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  const statusBorder = isHealthy ? "rgba(16,185,129,0.3)" : isWarning ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";

  const arc = (pct: number) => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);
    return { strokeDasharray: `${circ}`, strokeDashoffset: offset };
  };
  const arcStyle = arc(healthScore);

  return (
    <div
      className={`glass-card p-6 ${glowClass} fade-in-up`}
      style={{
        background: `var(--bg-secondary)`,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background grid pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Radial Score */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" className="score-animate" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r="52" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r="52" fill="none"
              stroke={statusColor} strokeWidth="8"
              strokeLinecap="round"
              style={{ ...arcStyle, transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 6px ${statusColor}40)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: "none" }}>
            <span className={`text-4xl font-black leading-none ${scoreTextClass}`}>{healthScore}</span>
            <span className="text-xs font-semibold mt-1" style={{ color: "var(--text-muted)" }}>Health</span>
          </div>
        </div>

        {/* Status info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Network Health Score</h2>
            <span
              className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm"
              style={{ color: statusColor, background: statusBg, border: `1px solid ${statusBorder}` }}
            >
              ● {statusLabel}
            </span>
          </div>
          <p className="text-sm font-medium mb-5 max-w-2xl" style={{ color: "var(--text-muted)" }}>{summary}</p>

          {/* Device summary mini row */}
          <div className="flex flex-wrap gap-4">
            <DeviceChip label="Access Points" up={aps?.up || 0} down={aps?.down || 0} total={aps?.total || 0} icon="📡" />
            <DeviceChip label="Switches" up={switches?.up || 0} down={switches?.down || 0} total={switches?.total || 0} icon="🔀" />
            <DeviceChip label="Gateways" up={gateways?.online || 0} down={gateways?.offline || 0} total={gateways?.total || 0} icon="🌐" />
          </div>
        </div>

        {/* Right side quick stats */}
        <div className="flex flex-col gap-2 text-right lg:min-w-[120px]">
          <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>Trend</div>
          <div className="text-2xl font-bold trend-up">↑ 3%</div>
          <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>Uptime</div>
          <div className="text-xl font-bold" style={{ color: "var(--accent)" }}>99.4%</div>
        </div>
      </div>
    </div>
  );
}

function DeviceChip({ label, up, down, total, icon }: { label: string; up: number; down: number; total: number; icon: string }) {
  const pct = total > 0 ? Math.round((up / total) * 100) : 100;
  const isOk = down === 0;
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all shadow-sm"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
      <span className="text-base">{icon}</span>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{up}<span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>/{total}</span></span>
          {down > 0 && <span className="text-[10px] text-rose-500 font-bold">{down} offline</span>}
          {down === 0 && <span className="text-[10px] text-emerald-500 font-bold">All UP</span>}
        </div>
      </div>
      <div className="ml-1">
        <div className="text-xs font-bold" style={{ color: isOk ? "#10b981" : "#f59e0b" }}>{pct}%</div>
      </div>
    </div>
  );
}
