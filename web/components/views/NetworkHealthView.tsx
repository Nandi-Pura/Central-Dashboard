import React from "react";
import HeroHealth from "../HeroHealth";
import KpiRow from "../KpiRow";

interface NetworkHealthViewProps {
  data: any;
}

function HealthHistoryBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-slate-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}50` }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function NetworkHealthView({ data }: NetworkHealthViewProps) {
  if (!data) return null;

  const siteHealth = [
    { name: "Site A — Main Office", score: 92, devices: 58, clients: 210 },
    { name: "Site B — Branch Office", score: 78, devices: 24, clients: 85 },
    { name: "Site C — Data Center", score: 99, devices: 16, clients: 42 },
    { name: "Site D — Warehouse", score: 65, devices: 18, clients: 50 },
  ];

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-white">Network Health</h2>
        <p className="text-xs text-slate-500 mt-0.5">Global health overview and per-site breakdown</p>
      </div>

      <HeroHealth
        healthScore={data.healthScore}
        healthLevel={data.healthLevel}
        summary={data.summary}
        aps={data.aps}
        switches={data.switches}
        gateways={data.gateways}
      />

      <KpiRow
        aps={data?.aps ?? { up: 0, total: 0 }}
        switches={data?.switches ?? { up: 0, total: 0 }}
        gateways={data?.gateways ?? { online: 0, total: 0 }}
        clients={data?.clients ?? { connected: 0, wireless: 0, wired: 0 }}
        alertCount={data?.alerts?.length ?? 0}
        hasCritical={data?.alerts?.some((a: any) => a.severity === "critical") ?? false}
        totalBytes={data?.traffic?.totalBytes24h ?? 0}
        throughputRate={data?.traffic?.throughputBytesPerSec ?? 0}
      />

      {/* Per-site Health */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-5">Per-Site Health Score</h3>
        <div className="space-y-6">
          {siteHealth.map((site, i) => {
            const color = site.score >= 80 ? "#10b981" : site.score >= 60 ? "#f59e0b" : "#ef4444";
            const status = site.score >= 80 ? "Healthy" : site.score >= 60 ? "Warning" : "Critical";
            return (
              <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-white">{site.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{site.devices} devices · {site.clients} clients</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}>{status}</span>
                    <span className="text-2xl font-black" style={{ color }}>{site.score}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${site.score}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health dimensions */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Health Dimension Breakdown</h3>
        <div className="space-y-3">
          <HealthHistoryBar label="Availability" value={99.4} color="#10b981" />
          <HealthHistoryBar label="Performance" value={87} color="#818cf8" />
          <HealthHistoryBar label="Security" value={94} color="#38bdf8" />
          <HealthHistoryBar label="Capacity" value={72} color="#f59e0b" />
          <HealthHistoryBar label="Client Exp." value={81} color="#34d399" />
        </div>
      </div>
    </div>
  );
}
