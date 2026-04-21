import React, { useState, useMemo } from "react";

interface NetworkDevice {
  id: string;
  type: string;
  model?: string;
  serial: string;
  macAddress: string;
  ipAddress: string;
  cpu: string;
  mem: string;
  uptime: string;
  status: string;
  site?: string;
  label?: string;
  firmware?: string;
  clientCount?: number;
}

interface NetworkDevicesTableProps {
  data: NetworkDevice[];
  onDeviceClick: (device: NetworkDevice) => void;
}

export default function NetworkDevicesTable({ data, onDeviceClick }: NetworkDevicesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterSite, setFilterSite] = useState("All Sites");
  const [filterLabel, setFilterLabel] = useState("All Labels");
  
  // Sorting & Pagination State
  const [sortField, setSortField] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const formatUptimeValue = (seconds: any) => {
    if (seconds === undefined || seconds === null || seconds === "-") return "-";
    const sec = Number(seconds);
    if (isNaN(sec)) return seconds;
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc"); // Default to desc for metrics
    }
  };

  // Processing Data
  const processedData = useMemo(() => {
    let filtered = data.filter(device => {
      const matchesSearch = (device.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (device.serial || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "All" || device.type === filterType;
      const matchesSite = filterSite === "All Sites" || device.site === filterSite;
      const matchesLabel = filterLabel === "All Labels" || device.label === filterLabel;
      
      return matchesSearch && matchesType && matchesSite && matchesLabel;
    });

    // Sorting
    filtered.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle percentage strings for CPU/MEM
      if (typeof valA === "string" && valA.endsWith("%")) valA = parseFloat(valA);
      if (typeof valB === "string" && valB.endsWith("%")) valB = parseFloat(valB);
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchTerm, filterType, filterSite, filterLabel, sortField, sortOrder]);

  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(processedData.length / pageSize);

  const sitesList = ["All Sites", ...Array.from(new Set(data.map(d => d.site).filter(Boolean)))];
  const labelsList = ["All Labels", ...Array.from(new Set(data.map(d => d.label).filter(Boolean)))];

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "up" || s === "online") return "text-green-400 bg-green-400/10 border-green-400/20";
    if (s === "down" || s === "offline") return "text-red-400 bg-red-400/10 border-red-400/20";
    if (s === "warning") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header & Filters */}
      <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Infrastructure Detail</h2>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 shadow-inner">
            {["All", "AP", "Switch", "Gateway"].map(type => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setCurrentPage(1); }}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${filterType === type ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 px-2 py-1.5 rounded-lg outline-none cursor-pointer">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>Show {n}</option>)}
          </select>
          
          <select value={filterSite} onChange={(e) => { setFilterSite(e.target.value); setCurrentPage(1); }} className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer">
            {sitesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filterLabel} onChange={(e) => { setFilterLabel(e.target.value); setCurrentPage(1); }} className="bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer">
            {labelsList.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]">⌕</span>
            <input 
              type="text" 
              placeholder="SEARCH SERIAL OR HOSTNAME..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-3 py-1.5 w-48 bg-slate-950 border border-slate-800 text-[10px] rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-700 font-bold tracking-wider"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-slate-950/30 text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] border-b border-slate-800">
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort("id")}>Hostname / ID {sortField === "id" && (sortOrder === "asc" ? "↑" : "↓")}</th>
              <th className="py-4 px-6">Type / Model</th>
              <th className="py-4 px-6">Firmware</th>
              <th className="py-4 px-6 cursor-pointer hover:text-indigo-400 transition-colors text-center" onClick={() => handleSort("clientCount")}>Clients {sortField === "clientCount" && (sortOrder === "asc" ? "↑" : "↓")}</th>
              <th className="py-4 px-6 text-center">
                <span className="cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort("cpu")}>CPU {sortField === "cpu" && (sortOrder === "asc" ? "↑" : "↓")}</span>
                <span className="mx-2 text-slate-700">/</span>
                <span className="cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => handleSort("mem")}>MEM {sortField === "mem" && (sortOrder === "asc" ? "↑" : "↓")}</span>
              </th>
              <th className="py-4 px-6 text-right">Uptime</th>
              <th className="py-4 px-6 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-600 text-xs font-medium tracking-wide">No devices match your current filters.</td>
              </tr>
            ) : (
              paginatedData.map((device, i) => (
                <tr key={i} className="hover:bg-indigo-500/[0.02] transition-colors group">
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getStatusStyle(device.status)}`}>
                      {device.status || "Unknown"}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-white text-xs font-bold font-mono hover:text-indigo-400 hover:underline cursor-pointer transition-colors inline-block" onClick={() => onDeviceClick(device)}>{device.id}</div>
                    <div className="text-[10px] text-slate-600 mt-1 font-mono uppercase tracking-tight">{device.serial}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[10px] font-bold text-slate-400 border border-slate-800 px-2 py-0.5 rounded bg-slate-800/50">{device.type} • {device.model}</span>
                  </td>
                  <td className="py-4 px-6 text-[10px] font-mono text-slate-500">{device.firmware || "—"}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-xs font-black text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-md">{device.clientCount || 0}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[8px] text-slate-600 uppercase font-black">CPU</span>
                        <span className={`text-[10px] font-mono ${parseFloat(device?.cpu || "0") > 80 ? "text-red-400" : "text-slate-300"}`}>{device?.cpu || "-"}</span>
                      </div>
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[8px] text-slate-600 uppercase font-black">MEM</span>
                        <span className={`text-[10px] font-mono ${parseFloat(device?.mem || "0") > 80 ? "text-red-400" : "text-slate-300"}`}>{device?.mem || "-"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right text-xs font-mono text-slate-500">{formatUptimeValue(device.uptime)}</td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => onDeviceClick(device)} className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-indigo-500/20 text-indigo-400 transition-all" title="View Details">
                      <span className="text-lg">↗️</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/20 text-[10px] uppercase font-bold tracking-widest text-slate-500">
        <div>Showing {(currentPage-1)*pageSize + 1} to {Math.min(currentPage*pageSize, processedData.length)} of {processedData.length} devices</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-800 disabled:opacity-30 transition-all">Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i+1)} className={`w-8 h-8 rounded border transition-all ${currentPage === i+1 ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-800 hover:bg-slate-800"}`}>{i+1}</button>
          )).slice(Math.max(0, currentPage-3), Math.min(totalPages, currentPage+2))}
          <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded border border-slate-800 hover:bg-slate-800 disabled:opacity-30 transition-all">Next</button>
        </div>
      </div>
    </div>
  );
}
