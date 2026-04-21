import React, { useState, useMemo } from "react";

interface DevicesViewProps {
  aps: { up: number; down: number; total: number; uplinkDown?: number };
  switches: { up: number; down: number; total: number };
  gateways: { online: number; offline: number; total: number };
  networkDevices: any[];
  onDeviceClick: (device: any) => void;
}

function DeviceTypeCard({
  icon, label, up, down, total
}: { icon: string; label: string; up: number; down: number; total: number }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-sm font-bold opacity-90">{label}</h3>
          <p className="text-[10px] text-muted font-medium uppercase tracking-wider">{total} Total Units</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold text-muted">Online</span>
          <span className="text-lg font-black text-[#3fb950]">{up}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold text-muted">Offline</span>
          <span className="text-lg font-black text-[#f85149]">{down}</span>
        </div>
      </div>
    </div>
  );
}

const formatUptimeValue = (seconds: any) => {
  if (seconds === undefined || seconds === null || seconds === "-") return "-";
  const sec = Number(seconds);
  if (isNaN(sec)) return seconds;
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
};

export default function DevicesView({ 
  aps = { up: 0, down: 0, total: 0 }, 
  switches = { up: 0, down: 0, total: 0 }, 
  gateways = { online: 0, offline: 0, total: 0 }, 
  networkDevices = [], 
  onDeviceClick 
}: DevicesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDevices = useMemo(() => {
    return networkDevices.filter(d => 
      (d.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.serial || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.ipAddress || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.macAddress || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [networkDevices, searchTerm]);

  return (
    <div className="space-y-4 fade-in-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DeviceTypeCard icon="📡" label="Access Points" up={aps.up} down={aps.down} total={aps.total} />
        <DeviceTypeCard icon="🔀" label="Switches" up={switches.up} down={switches.down} total={switches.total} />
        <DeviceTypeCard icon="🌐" label="Gateways" up={gateways.online} down={gateways.offline} total={gateways.total} />
      </div>

      {/* Device Table */}
      <div className="glass-card shadow-xl border-0">
        <div className="p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: "var(--border-subtle)" }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Device Inventory</h3>
            <p className="text-[10px] text-muted">Live snapshot of infrastructure health</p>
          </div>
          
          <div className="relative group min-w-[280px]">
             <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
             <input 
                type="text" 
                placeholder="Search by SN, MAC, Hostname..."
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-md py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase font-bold tracking-wider" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                <th className="py-3 px-5">Hostname / Serial</th>
                <th className="py-3 px-5">IP Address</th>
                <th className="py-3 px-5">Firmware</th>
                <th className="py-3 px-5 text-center">CPU/Mem</th>
                <th className="py-3 px-5 text-center">Clients</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Uptime</th>
                <th className="py-3 px-5 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="text-[11px] divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {filteredDevices.map((d, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-all group border-0">
                  <td className="py-4 px-5">
                    <div className="font-bold text-primary group-hover:text-[var(--brand-primary)] transition-colors">{d.id}</div>
                    <div className="text-[9px] font-mono text-muted mt-0.5">{d.serial}</div>
                  </td>
                  <td className="py-4 px-5 font-mono text-muted">{d.ipAddress || "-"}</td>
                  <td className="py-4 px-5 text-muted">{d.firmware || "-"}</td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold">C: {d.cpu}</span>
                      <span className="text-[9px] text-muted">M: {d.mem}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className="bg-[var(--bg-secondary)] px-2 py-0.5 rounded font-bold text-primary">{d.clientCount || 0}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={`inline-flex items-center gap-1.5 ${d.status === "Up" || d.status === "online" ? "text-emerald-500" : "text-rose-500"} font-bold`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                      <span className="text-[10px] uppercase tracking-wider">{d.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-muted">{formatUptimeValue(d.uptime)}</td>
                  <td className="py-3 px-5 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeviceClick(d); }}
                      className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-all text-muted hover:text-primary border border-transparent hover:border-[var(--border-subtle)]"
                      title="View Details"
                    >
                      ↗️
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-muted italic">
                    <div className="mb-2 text-2xl opacity-20">🔍</div>
                    No devices match your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
