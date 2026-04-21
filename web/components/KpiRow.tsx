import { formatBytes, formatThroughput } from "../utils/formatters";

interface KpiRowProps {
  aps: { up: number; total: number };
  switches: { up: number; total: number };
  gateways: { online: number; total: number };
  clients: { connected: number; wireless: number; wired: number };
  alertCount: number;
  hasCritical: boolean;
  totalBytes: number;
  throughputRate: number;
}

export default function KpiRow({ 
  aps = { up: 0, total: 0 }, 
  switches = { up: 0, total: 0 }, 
  gateways = { online: 0, total: 0 }, 
  clients = { connected: 0, wireless: 0, wired: 0 }, 
  alertCount = 0, 
  hasCritical = false, 
  totalBytes = 0,
  throughputRate = 0
}: KpiRowProps) {
  const totalDevices = (aps?.total || 0) + (switches?.total || 0) + (gateways?.total || 0);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Total Devices Card */}
      <div className="kpi-card fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" style={{ color: "var(--brand-primary)" }}>🖥️</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Total Devices</span>
        </div>
        <div className="text-3xl font-bold tracking-tighter mb-2" style={{ color: "var(--text-primary)" }}>
          {totalDevices}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">AP:</span>
            <span className="text-xs font-semibold text-primary">{aps?.total || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">SW:</span>
            <span className="text-xs font-semibold text-primary">{switches?.total || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">GW:</span>
            <span className="text-xs font-semibold text-primary">{gateways?.total || 0}</span>
          </div>
        </div>
      </div>

      {/* Total Clients Card */}
      <div className="kpi-card fade-in-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" style={{ color: "var(--brand-primary)" }}>👥</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Total Clients</span>
        </div>
        <div className="text-3xl font-bold tracking-tighter mb-2" style={{ color: "var(--text-primary)" }}>
          {(clients?.connected || 0).toLocaleString()}
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">Wireless:</span>
            <span className="text-xs font-semibold text-primary">{(clients?.wireless || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted">Wired:</span>
            <span className="text-xs font-semibold text-primary">{(clients?.wired || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Throughput Card */}
      <div className="kpi-card fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" style={{ color: "var(--brand-primary)" }}>⟳</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Avg Throughput</span>
          <span className="text-[9px] font-bold text-slate-500 ml-auto border border-white/5 px-1 rounded">30 MIN</span>
        </div>
        <div className="text-3xl font-bold tracking-tighter mb-2" style={{ color: "var(--text-primary)" }}>
          {formatThroughput(throughputRate)}
        </div>
        <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
          <span>Bit-rate at current interval</span>
          <span className="cursor-help opacity-40 hover:opacity-100" title="Based on bytes transferred in the last 30-minute sampling period">ⓘ</span>
        </div>
      </div>

      {/* Total Traffic Card */}
      <div className="kpi-card fade-in-up" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" style={{ color: "var(--brand-primary)" }}>📊</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">Total Traffic</span>
          <span className="text-[9px] font-bold text-slate-500 ml-auto border border-white/5 px-1 rounded">24 HOURS</span>
        </div>
        <div className="text-3xl font-bold tracking-tighter mb-2" style={{ color: "var(--text-primary)" }}>
          {formatBytes(totalBytes)}
        </div>
        <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
          <span>Accumulated data volume</span>
          <span className="cursor-help opacity-40 hover:opacity-100" title="Total bytes transferred in the last 24-hour observation window">ⓘ</span>
        </div>
      </div>
      <div className="kpi-card fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚠️</span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted">System Alerts</span>
        </div>
        <div className="text-3xl font-bold tracking-tighter mb-2" style={{ color: hasCritical ? "var(--accent-red)" : "var(--text-primary)" }}>
          {alertCount}
        </div>
        <div className="text-[10px] font-medium text-muted">
          {hasCritical ? "Critical issues requiring attention" : alertCount > 0 ? "Potential issues detected" : "No active alerts"}
        </div>
      </div>
    </div>
  );
}
