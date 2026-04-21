import React from "react";
import ClientTrend from "../ClientTrend";
import SsidChart from "../SsidChart";
import ClientsTable from "../ClientsTable";

interface ClientsViewProps {
  clients: any;
  clientList: any[];
  ssidTrend?: any[];
  onClientClick: (client: any) => void;
  theme: "dark" | "light";
}

export default function ClientsView({ clients, clientList = [], ssidTrend = [], onClientClick, theme }: ClientsViewProps) {
  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <h2 className="text-lg font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Client Management</h2>
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Connected users, devices, and session insights</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Connected", value: clients?.connected ?? 0, color: "#316dca", icon: "◎" },
          { label: "Wireless Clients", value: clients?.wireless ?? 0, color: "#3fb950", icon: "📶" },
          { label: "Wired Clients", value: clients?.wired ?? 0, color: "#539bf5", icon: "🔌" },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</span>
            </div>
            <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ClientTrend
          trend={clients?.trend ?? []}
          theme={theme}
        />
        <SsidChart trend={ssidTrend} theme={theme} />
      </div>

      {/* Detailed Clients Table */}
      <ClientsTable data={clientList} onClientClick={onClientClick} />
    </div>
  );
}
