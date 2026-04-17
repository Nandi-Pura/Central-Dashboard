/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, Fragment } from "react";
import dynamic from "next/dynamic";
import { DataState } from "./types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function ClientsView({ data }: { data: DataState }) {
  const [mode, setMode] = useState<"All" | "Wireless" | "Wired">("Wireless");
  const [view, setView] = useState<"Executive" | "Technical">("Executive");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getAgg = (arr: Record<string, any>[], key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = arr.reduce((acc: any, c) => {
       const val = c[key] || "Unknown";
       acc[val] = (acc[val] || 0) + 1;
       return acc;
    }, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a:any, b:any) => b.value - a.value);
  };

  const wR = data.clients?.wirelessRaw || [];
  const wiredR = data.clients?.wiredRaw || [];

  // Data Transformation
  const getSignalLabel = (db: number) => {
    if (db >= -50) return { label: "Excellent", color: "text-emerald-500", bg: "bg-emerald-100" };
    if (db >= -60) return { label: "Good", color: "text-blue-500", bg: "bg-blue-100" };
    if (db >= -70) return { label: "Fair", color: "text-amber-500", bg: "bg-amber-100" };
    return { label: "Poor", color: "text-red-500", bg: "bg-red-100" };
  };

  const getHealthLabel = (h: number) => {
    if (h >= 80) return { label: "Healthy", color: "text-emerald-500", bg: "bg-emerald-100" };
    if (h >= 50) return { label: "Warning", color: "text-amber-500", bg: "bg-amber-100" };
    return { label: "Critical", color: "text-red-500", bg: "bg-red-100" };
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const timeAgo = (timestampSec: number) => {
    if (!timestampSec) return "N/A";
    const minutes = Math.floor((Date.now() / 1000 - timestampSec) / 60);
    return `${minutes} min ago`;
  };

  // Combine and map
  const clientsList = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: Record<string, any>[] = [];
    if (mode === "All" || mode === "Wireless") {
      wR.forEach(c => list.push({ ...c, sys_type: "Wireless" }));
    }
    if (mode === "All" || mode === "Wired") {
      wiredR.forEach(c => list.push({ ...c, sys_type: "Wired" }));
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Aggregated Stats
  const activeClients = clientsList.filter(c => Number(c.last_connection_time) > 0).length;
  
  // Wireless Specific Stats
  const avgHealth = wR.length > 0 ? Math.round(wR.reduce((sum, c) => sum + Number(c.health || 0), 0) / wR.length) : 0;
  const avgSignal = wR.length > 0 ? Math.round(wR.reduce((sum, c) => sum + Number(c.signal_db || 0), 0) / wR.length) : 0;
  const totalUsage = wR.reduce((sum, c) => sum + Number(c.usage || 0), 0);

  // Wired Specific Stats
  const uniquePorts = new Set(wiredR.map(c => c.interface_port)).size;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const switchCounts = wiredR.reduce((acc: any, c) => {
    acc[c.associated_device_name || 'Unknown'] = (acc[c.associated_device_name || 'Unknown'] || 0) + 1;
    return acc;
  }, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topSwitch = Object.entries(switchCounts).sort((a: any, b: any) => b[1] - a[1])[0] || ["N/A", 0];
  const uniqueVlans = new Set(wiredR.map(c => c.vlan)).size;

  const toggleRow = (mac: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(mac)) newSet.delete(mac);
    else newSet.add(mac);
    setExpandedRows(newSet);
  };

  // Filtered List
  const filteredList = clientsList.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      String(c.hostname || "").toLowerCase().includes(term) ||
      String(c.username || "").toLowerCase().includes(term) ||
      String(c.ip_address || "").toLowerCase().includes(term) ||
      String(c.macaddr || "").toLowerCase().includes(term)
    );
  });

  const catData = getAgg(clientsList, "client_category");
  const osData = getAgg(clientsList, "os_type");
  const netData = getAgg(wR, "network").slice(0,5);
  const wiredSw = getAgg(wiredR, "associated_device_name").slice(0,5);
  const vlanData = getAgg(wiredR, "vlan");

  const sigCounts = { Excellent:0, Good:0, Fair:0, Poor:0 };
  wR.forEach(c => sigCounts[getSignalLabel(Number(c.signal_db)).label as keyof typeof sigCounts]++);
  const sigData = Object.entries(sigCounts).filter(([,v]) => v>0).map(([name, value]) => ({ name, value }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pieOpts = (dataArray: any, name: string) => ({
    tooltip: { trigger: 'item' },
    series: [{ name, type: 'pie', radius: ['40%', '70%'], itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }, label: { show: false }, data: dataArray }]
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barOpts = (dataArray: any) => ({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yAxis: { type: 'category', data: dataArray.map((d:any)=>d.name).reverse() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series: [{ type: 'bar', data: dataArray.map((d:any)=>d.value).reverse(), itemStyle: { color: '#6366f1', borderRadius: [0,4,4,0] } }]
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* 1. Header (Control Panel) */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <h2 className="text-xl font-bold text-slate-800">Unified Clients Dashboard</h2>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button onClick={() => setMode("All")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${mode === "All" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>All Clients</button>
           <button onClick={() => setMode("Wireless")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${mode === "Wireless" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Wireless</button>
           <button onClick={() => setMode("Wired")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${mode === "Wired" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Wired</button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
           <button onClick={() => setView("Executive")} className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${view === "Executive" ? "bg-indigo-600 shadow text-white" : "text-slate-500 hover:text-slate-700"}`}>
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
             Executive View
           </button>
           <button onClick={() => setView("Technical")} className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${view === "Technical" ? "bg-slate-800 shadow text-white" : "text-slate-500 hover:text-slate-700"}`}>
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
             Technical View
           </button>
        </div>
      </div>

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Clients</h3>
            <p className="text-3xl font-bold text-slate-800 mt-1">{clientsList.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active Connectivity</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{activeClients}</p>
        </div>
        
        {mode !== "Wired" ? (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center border-b-4 border-b-blue-500">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Average Health</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{avgHealth}<span className="text-sm text-slate-500 ml-1">/ 100</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center border-b-4 border-b-emerald-500">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Avg Signal</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{avgSignal}<span className="text-sm text-slate-500 ml-1">dBm</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center border-b-4 border-b-indigo-500">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Wifi Usage</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatBytes(totalUsage)}</p>
            </div>
          </>
        ) : (
          <>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center border-b-4 border-b-purple-500">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active Switch Ports</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{uniquePorts}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center border-b-4 border-b-amber-500">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Top Access Switch</h3>
                <p className="text-sm font-bold text-slate-800 mt-2 truncate">{topSwitch[0] as string}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow flex flex-col justify-center border-b-4 border-b-emerald-500">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active VLANs</h3>
                <p className="text-3xl font-bold text-slate-800 mt-1">{uniqueVlans}</p>
            </div>
          </>
        )}
      </div>

      {/* 3. Visual Insights & Context Row (Combined) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 h-64">
             <div className="flex flex-col"><h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Category</h4><div className="flex-1 min-h-0"><ReactECharts option={pieOpts(catData, "Category")} style={{height:'100%'}}/></div></div>
             <div className="flex flex-col"><h4 className="text-xs text-slate-500 uppercase font-bold mb-2">OS Distribution</h4><div className="flex-1 min-h-0"><ReactECharts option={pieOpts(osData, "OS")} style={{height:'100%'}}/></div></div>
             
             {mode !== "Wired" ? (
               <>
                <div className="flex flex-col"><h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Top Wireless Networks</h4><div className="flex-1 min-h-0"><ReactECharts option={barOpts(netData)} style={{height:'100%'}}/></div></div>
                <div className="flex flex-col"><h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Signal Quality</h4><div className="flex-1 min-h-0"><ReactECharts option={pieOpts(sigData, "Signal")} style={{height:'100%'}}/></div></div>
               </>
             ) : (
               <>
                <div className="flex flex-col"><h4 className="text-xs text-slate-500 uppercase font-bold mb-2">Users Per Switch</h4><div className="flex-1 min-h-0"><ReactECharts option={barOpts(wiredSw)} style={{height:'100%'}}/></div></div>
                <div className="flex flex-col"><h4 className="text-xs text-slate-500 uppercase font-bold mb-2">VLAN Distribution</h4><div className="flex-1 min-h-0"><ReactECharts option={pieOpts(vlanData, "VLAN")} style={{height:'100%'}}/></div></div>
               </>
             )}
          </div>
          <div className="flex flex-col justify-between gap-4">
             <div className="bg-slate-800 text-white p-4 rounded-xl shadow h-full flex flex-col justify-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Most Heavily Used Device</p>
                <p className="text-base font-bold truncate mt-1">{mode !== "Wired" ? (getAgg(wR, "associated_device_name")[0]?.name || "N/A") : (topSwitch[0] as string)}</p>
             </div>
             <div className="bg-indigo-600 text-white p-4 rounded-xl shadow h-full flex flex-col justify-center">
                <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Top Data Consumer</p>
                <p className="text-base font-bold truncate mt-1">{wR.sort((a,b)=>Number(b.usage)-Number(a.usage))[0]?.username || "N/A"}</p>
             </div>
             <div className="bg-rose-500 text-white p-4 rounded-xl shadow h-full flex flex-col justify-center">
                <p className="text-[10px] uppercase font-bold text-rose-200 tracking-wider">{mode!=="Wired" ? "Worst Signal Client" : "Unknown Devices"}</p>
                <p className="text-base font-bold truncate mt-1">{mode!=="Wired" ? (wR.sort((a,b)=>Number(a.signal_db)-Number(b.signal_db))[0]?.hostname || "N/A") : wiredR.filter(c=>c.hostname==="--").length}</p>
             </div>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
         <svg className="w-5 h-5 text-slate-400 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
         <input type="text" placeholder="Search Hostname, Username, IP, MAC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-slate-800" />
      </div>

      {/* Main Detail Table Component */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
               <tr>
                 <th className="px-6 py-4 font-bold">Hostname / IP</th>
                 {view === "Technical" && <th className="px-6 py-4 font-bold">Username</th>}
                 <th className="px-6 py-4 font-bold">Device Name</th>
                 <th className="px-6 py-4 font-bold">Network / VLAN</th>
                 <th className="px-6 py-4 font-bold text-center">Connection State</th>
                 {view === "Technical" && <th className="px-6 py-4 font-bold text-right">Details</th>}
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">No clients match criteria.</td></tr> : filteredList.map(client => {
                  const isWired = client.sys_type === "Wired";
                  const sig = getSignalLabel(Number(client.signal_db));
                  const hth = getHealthLabel(Number(client.health || 0));
                  const isExpanded = expandedRows.has(String(client.macaddr));

                  return (
                    <Fragment key={String(client.macaddr)}>
                      <tr className="hover:bg-slate-50 transition cursor-pointer" onClick={() => view === "Technical" && toggleRow(String(client.macaddr))}>
                         <td className="px-6 py-4">
                           <p className="font-bold text-slate-800 truncate w-48">{client.hostname !== "--" ? String(client.hostname) : "Unknown Host"}</p>
                           <p className="text-xs text-blue-500 font-mono mt-0.5">{String(client.ip_address)}</p>
                         </td>
                         {view === "Technical" && (
                           <td className="px-6 py-4">
                             <p className="text-slate-700 truncate w-32">{client.username !== "--" ? String(client.username) : "N/A"}</p>
                           </td>
                         )}
                         <td className="px-6 py-4">
                           <p className="text-slate-700 truncate w-40">{String(client.associated_device_name || client.associated_device)}</p>
                           {isWired && view === "Technical" && <p className="text-xs font-mono text-slate-400 mt-1">Port: {String(client.interface_port)}</p>}
                         </td>
                         <td className="px-6 py-4">
                            <span className="bg-slate-100 px-2.5 py-1 rounded text-xs font-semibold text-slate-600">
                               {isWired ? `VLAN ${String(client.vlan)}` : String(client.network)}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-center">
                            {!isWired ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${sig.bg} ${sig.color}`}>{sig.label}</span>
                                {view === "Technical" && <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${hth.bg} ${hth.color}`}>H: {String(client.health)}</span>}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-100 text-purple-700">Wired LAN</span>
                            )}
                         </td>
                         {view === "Technical" && (
                           <td className="px-6 py-4 text-right">
                             <span className="text-slate-400 text-xs font-semibold mr-2">{timeAgo(Number(client.last_connection_time))}</span>
                             <svg className={`inline w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                           </td>
                         )}
                      </tr>
                      {isExpanded && view === "Technical" && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={6} className="px-6 py-4 text-xs">
                             <div className="grid grid-cols-3 gap-6 bg-white p-4 rounded-lg border border-slate-200 shadow-inner">
                               {!isWired ? (
                                  <>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">MAC Address</span><span className="font-mono text-slate-700">{String(client.macaddr)}</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Radio Details</span><span className="font-bold text-slate-700">Ch {String(client.channel)} • {String(client.band)} • {String(client.speed)} Mbps</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Security</span><span className="font-bold text-slate-700">{String(client.authentication_type)} / {String(client.encryption_method)}</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">SNR</span><span className="font-bold text-slate-700">{String(client.snr)} dB</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Client Category</span><span className="font-bold text-slate-700">{String(client.client_category)} ({String(client.os_type)})</span></div>
                                  </>
                               ) : (
                                  <>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">MAC Address</span><span className="font-mono text-slate-700">{String(client.macaddr)}</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Switch Interface</span><span className="font-bold text-slate-700">Port {String(client.interface_port)} • MAC {String(client.interface_mac)}</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">VLAN</span><span className="font-bold text-slate-700">{String(client.vlan)}</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">User Role</span><span className="font-bold text-slate-700">{client.user_role ? String(client.user_role) : "N/A"}</span></div>
                                    <div><span className="text-slate-400 uppercase tracking-widest block mb-1 text-[10px]">Client Segment</span><span className="font-bold text-slate-700">{String(client.client_category)} ({String(client.os_type)})</span></div>
                                  </>
                               )}
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
