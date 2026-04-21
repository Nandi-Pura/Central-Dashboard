import React from "react";
import { formatBytes } from "../utils/formatters";

interface ClientData {
  name: string;
  mac: string;
  usage: number;
}

export default function TopClientsChart({ data }: { data: ClientData[] }) {
  const barColor = "var(--accent)";

  if (!data || data.length === 0) return <div className="glass-card p-4 h-full"><div className="skeleton w-full h-full" /></div>;

  const maxUsage = Math.max(...(data || []).map(d => d?.usage || 0), 0.01);

  return (
    <div className="glass-card p-4 h-full flex flex-col fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Top Clients</h3>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Usage</span>
      </div>
      <div className="flex-1 space-y-3.5">
        {data.map((client, i) => {
          const pct = Math.max(5, (client.usage / maxUsage) * 100);
          return (
            <div key={i}>
              <div className="flex justify-between items-end mb-1">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{client.name}</span>
                  <span className="text-[9px] font-mono tracking-tight" style={{ color: "var(--text-muted)" }}>{client.mac}</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{formatBytes(client?.usage || 0)}</span>
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
