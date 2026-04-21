import React, { useState } from "react";

interface Client {
  mac: string;
  name: string;
  ip: string;
  status: string;
  type: "Wired" | "Wireless";
  ssid: string;
  apName?: string;
  signal?: number;
  os?: string;
}

interface ClientsTableProps {
  data: Client[];
  onClientClick?: (client: any) => void;
}

export default function ClientsTable({ data, onClientClick }: ClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Wired" | "Wireless">("All");

  const filteredData = data.filter(c => {
    const matchesSearch = (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.mac || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const getSignalIcon = (s: number | undefined) => {
    if (s === undefined) return "🔌";
    if (s >= -60) return "📶 Full";
    if (s >= -75) return "📶 Med";
    return "📶 Low";
  };

  const getSignalColor = (s: number | undefined) => {
    if (s === undefined) return "text-slate-500";
    if (s >= -60) return "text-emerald-400";
    if (s >= -75) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#adbac7]">Connected Clients</h3>
          <div className="flex bg-[#161b22] p-0.5 rounded border border-white/5">
            {["All", "Wireless", "Wired"].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${filterType === type ? "bg-[#316dca] text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">⌕</span>
          <input 
            type="text" 
            placeholder="Search MAC or Hostname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-64 bg-[#161b22] border border-white/10 text-[11px] rounded focus:outline-none focus:border-[#316dca60] text-slate-300 placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase font-bold text-slate-500 border-b border-white/5" style={{ background: "rgba(0,0,0,0.2)" }}>
              <th className="py-2.5 px-4 text-center w-12">#</th>
              <th className="py-2.5 px-4">Client Detail</th>
              <th className="py-2.5 px-4">OS</th>
              <th className="py-2.5 px-4 text-center">Connection</th>
              <th className="py-2.5 px-4">SSID Name</th>
              <th className="py-2.5 px-4">Network / AP</th>
              <th className="py-2.5 px-4">IP Address</th>
            </tr>
          </thead>
          <tbody className="text-[11px] divide-y divide-white/5 font-medium">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 italic">No clients found matching filters</td>
              </tr>
            ) : (
              filteredData.map((c, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-4 text-center text-slate-600 font-mono">{i + 1}</td>
                  <td className="py-3 px-4">
                    <button 
                      onClick={() => onClientClick?.(c)}
                      className="text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="text-white font-bold group-hover:text-[#539bf5] transition-colors">{c.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{c.mac}</div>
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-white/5 text-[9px] font-bold uppercase">{c.os || "Generic Device"}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className={`inline-flex items-center gap-1.5 ${getSignalColor(c.type === "Wireless" ? c.signal : undefined)} font-bold`}>
                      <span>{getSignalIcon(c.type === "Wireless" ? c.signal : undefined)}</span>
                      <span className="uppercase text-[9px] tracking-tighter">{c.type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`text-white font-bold ${c.type === "Wired" ? "opacity-30" : ""}`}>{c.type === "Wireless" ? (c.ssid || "Unknown") : "—"}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-400 font-medium group-hover:text-slate-200 transition-colors">{c.apName || "—"}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{c.ip || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
