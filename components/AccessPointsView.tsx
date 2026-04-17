/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, Fragment } from "react";

// Dynamic uptime formatter: seconds → "X years Y months Z days A hours B mins"
const formatUptime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "N/A";
  const s = Math.floor(seconds);
  const years   = Math.floor(s / (365 * 24 * 3600));
  const months  = Math.floor((s % (365 * 24 * 3600)) / (30 * 24 * 3600));
  const days    = Math.floor((s % (30 * 24 * 3600)) / (24 * 3600));
  const hours   = Math.floor((s % (24 * 3600)) / 3600);
  const mins    = Math.floor((s % 3600) / 60);

  if (years > 0)  return `${years}y ${months}mo ${days}d`;
  if (months > 0) return `${months}mo ${days}d ${hours}h`;
  if (days > 0)   return `${days}d ${hours}h ${mins}m`;
  if (hours > 0)  return `${hours}h ${mins}m`;
  return `${mins} mins`;
};

// Memory % used from free + total bytes
const calcMemPct = (memFree: unknown, memTotal: unknown): { pct: number; label: string } | null => {
  const free  = Number(memFree);
  const total = Number(memTotal);
  if (!total || isNaN(free) || total === 0) return null;
  const pct = Math.round(((total - free) / total) * 100);
  return { pct, label: `${pct}% used (${Math.round(free / 1024 / 1024)} MB free / ${Math.round(total / 1024 / 1024)} MB total)` };
};

const getBarColor = (pct: number, thresholds = [60, 80]) =>
  pct >= thresholds[1] ? "bg-red-500" : pct >= thresholds[0] ? "bg-amber-500" : "bg-emerald-500";

export default function AccessPointsView({
  apItems,
  rawAps,
  getClientCount,
}: {
  apItems: any[];
  rawAps?: any[];
  getClientCount: (mac: string) => number;
}) {
  const items = rawAps && rawAps.length > 0 ? rawAps : apItems;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleRow = (mac: string) => {
    const s = new Set(expandedRows);
    if (s.has(mac)) s.delete(mac); else s.add(mac);
    setExpandedRows(s);
  };

  const filtered = items.filter((ap) => {
    const term = search.toLowerCase();
    return (
      String(ap.name       || "").toLowerCase().includes(term) ||
      String(ap.macaddr    || "").toLowerCase().includes(term) ||
      String(ap.ip_address || "").toLowerCase().includes(term) ||
      String(ap.model      || "").toLowerCase().includes(term)
    );
  });

  const upCount   = items.filter(ap => String(ap.status).toLowerCase() === "up").length;
  const downCount = items.length - upCount;

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Access Points Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            <span className="v2-badge font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs mr-2">v2 API</span>
            Live metrics: CPU · Memory · Tx Power · Uptime · Client Count
          </p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{upCount}</p><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Online</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-red-500">{downCount}</p><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Offline</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-slate-700">{items.length}</p><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total APs</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" placeholder="Search name, MAC, IP, model..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 text-sm border-none bg-transparent focus:ring-0 text-slate-700 placeholder-slate-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-bold">Name / IP</th>
                <th className="px-5 py-3 font-bold">Model / Group</th>
                <th className="px-5 py-3 font-bold text-center">Clients</th>
                <th className="px-5 py-3 font-bold text-center">CPU %</th>
                <th className="px-5 py-3 font-bold text-center">Memory</th>
                <th className="px-5 py-3 font-bold text-center">Tx Power</th>
                <th className="px-5 py-3 font-bold">Uptime</th>
                <th className="px-5 py-3 font-bold text-center">Status</th>
                <th className="px-5 py-3 font-bold text-right">↕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">No access points found.</td></tr>
              ) : filtered.map((ap) => {
                const mac       = String(ap.macaddr || ap.id || "");
                const clients   = getClientCount(mac) || Number(ap.client_count || 0);
                const uptimeSec = Number(ap.uptime || 0);
                const uptimeStr = formatUptime(uptimeSec);
                const rawStat   = String(ap.status || "").toLowerCase();
                const isUp      = rawStat === "up" || rawStat === "online";
                const cpuPct    = ap.cpu_utilization !== undefined && ap.cpu_utilization !== null ? Number(ap.cpu_utilization) : null;
                const mem       = calcMemPct(ap.mem_free, ap.mem_total);
                const txPower   = ap.tx_power !== undefined && ap.tx_power !== null ? `${ap.tx_power} dBm` : "N/A";
                const isExpanded = expandedRows.has(mac);

                return (
                  <Fragment key={mac}>
                    <tr
                      className={`transition cursor-pointer ${isExpanded ? "bg-indigo-50 border-l-4 border-l-indigo-500" : "hover:bg-slate-50 border-l-4 border-l-transparent"}`}
                      onClick={() => toggleRow(mac)}
                    >
                      {/* Name / IP */}
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800 text-sm">{ap.name || "Unknown"}</p>
                        <p className="text-[10px] text-blue-500 font-mono mt-0.5">{ap.ip_address || "N/A"}</p>
                      </td>

                      {/* Model / Group */}
                      <td className="px-5 py-3.5">
                        <p className="text-slate-700 font-medium">{ap.model || "AP"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ap.group_name || ap.site || "—"}</p>
                      </td>

                      {/* Clients */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full text-xs">{clients}</span>
                      </td>

                      {/* CPU */}
                      <td className="px-5 py-3.5 text-center">
                        {cpuPct !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold text-sm ${cpuPct >= 80 ? "text-red-600" : cpuPct >= 60 ? "text-amber-500" : "text-emerald-600"}`}>{cpuPct}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-1">
                              <div className={`h-1 rounded-full ${getBarColor(cpuPct)}`} style={{ width: `${Math.min(cpuPct, 100)}%` }}></div>
                            </div>
                          </div>
                        ) : <span className="text-slate-400 text-xs italic">N/A</span>}
                      </td>

                      {/* Memory */}
                      <td className="px-5 py-3.5 text-center">
                        {mem ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold text-sm ${mem.pct >= 80 ? "text-red-600" : mem.pct >= 60 ? "text-amber-500" : "text-emerald-600"}`}>{mem.pct}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-1">
                              <div className={`h-1 rounded-full ${getBarColor(mem.pct)}`} style={{ width: `${Math.min(mem.pct, 100)}%` }}></div>
                            </div>
                          </div>
                        ) : <span className="text-slate-400 text-xs italic">N/A</span>}
                      </td>

                      {/* Tx Power */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-slate-700 font-semibold text-sm">{txPower}</span>
                      </td>

                      {/* Uptime */}
                      <td className="px-5 py-3.5">
                        <span className="text-slate-600 font-medium text-sm">{uptimeStr}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isUp ? "bg-emerald-500" : "bg-red-500"}`}></span>
                          {isUp ? "Up" : "Down"}
                        </span>
                      </td>

                      {/* Expand toggle */}
                      <td className="px-5 py-3.5 text-right">
                        <svg className={`inline w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 border-b border-slate-200">
                        <td colSpan={9} className="px-6 py-5">
                          <div className="bg-white border border-slate-200 rounded-xl shadow-inner p-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">

                            {/* MAC & Serial */}
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">MAC Address</p>
                              <p className="font-mono text-slate-700 font-bold">{mac}</p>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-3 mb-1">Serial</p>
                              <p className="font-mono text-slate-600">{ap.serial || "N/A"}</p>
                            </div>

                            {/* CPU Progress */}
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">CPU Utilization</p>
                              {cpuPct !== null ? (
                                <>
                                  <p className={`text-2xl font-bold ${cpuPct >= 80 ? "text-red-600" : cpuPct >= 60 ? "text-amber-500" : "text-emerald-600"}`}>{cpuPct}%</p>
                                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                    <div className={`h-2 rounded-full ${getBarColor(cpuPct)}`} style={{ width: `${Math.min(cpuPct, 100)}%` }}></div>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1">{cpuPct}% of 100% capacity</p>
                                </>
                              ) : <p className="text-slate-400 text-xs">Not available</p>}
                            </div>

                            {/* Memory Progress */}
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Memory Usage</p>
                              {mem ? (
                                <>
                                  <p className={`text-2xl font-bold ${mem.pct >= 80 ? "text-red-600" : mem.pct >= 60 ? "text-amber-500" : "text-emerald-600"}`}>{mem.pct}%</p>
                                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                    <div className={`h-2 rounded-full ${getBarColor(mem.pct)}`} style={{ width: `${Math.min(mem.pct, 100)}%` }}></div>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1">{mem.label}</p>
                                </>
                              ) : <p className="text-slate-400 text-xs">Not available from API</p>}
                            </div>

                            {/* Extra Details */}
                            <div className="flex flex-col gap-2">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Tx Power</p>
                                <p className="font-bold text-slate-700">{txPower}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Uptime</p>
                                <p className="font-bold text-slate-700">{uptimeStr}</p>
                                <p className="text-[10px] text-slate-400">{uptimeSec.toLocaleString()} seconds</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Firmware</p>
                                <p className="font-mono text-xs text-slate-600">{ap.firmware_version || ap.swarm_master_ip || "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
