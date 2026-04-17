/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, Fragment } from "react";
import dynamic from "next/dynamic";
import { DataState } from "./types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function OverviewView({ data }: { data: DataState }) {
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // === 1. DATA EXTRACTION ===
  const wR = data.clients?.wirelessRaw || [];
  const wiredR = data.clients?.wiredRaw || [];
  const clientsList = useMemo(() => [...wR.map(c => ({...c, sys_type: "Wireless"})), ...wiredR.map(c => ({...c, sys_type: "Wired"}))], [wR, wiredR]);

  const rawAps = (data.aps as any)?.rawData || [];
  const rawSwitches = (data.summary as any)?.switches?.rawData || [];
  const rawGateways = (data.summary as any)?.gateways?.rawData || [];

  const deviceList = useMemo(() => {
    const list: any[] = [];
    rawAps.forEach((d: any) => list.push({ ...d, sys_type: 'Access Point' }));
    rawSwitches.forEach((d: any) => list.push({ ...d, sys_type: 'Switch' }));
    rawGateways.forEach((d: any) => list.push({ ...d, sys_type: 'Gateway' }));
    return list;
  }, [rawAps, rawSwitches, rawGateways]);

  // === 2. METRICS CALCULATION ===
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptimeCompact = (sec: number) => {
     if (!sec || isNaN(sec)) return "N/A";
     return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
  };

  const totalClients = clientsList.length;
  const activeClients = clientsList.filter(c => Number(c.last_connection_time) > 0).length || totalClients;
  const upDevices = deviceList.filter(d => String(d.status).toLowerCase() === 'up');
  const pctHealthy = deviceList.length > 0 ? Math.round((upDevices.length / deviceList.length) * 100) : 0;
  
  const devicesWithCpu = deviceList.filter(d => d.cpu_utilization !== undefined && d.cpu_utilization !== null);
  const avgCpu = devicesWithCpu.length > 0 ? Math.round(devicesWithCpu.reduce((sum, d) => sum + Number(d.cpu_utilization), 0) / devicesWithCpu.length) : 0;

  const switchesWithMem = rawSwitches.filter((s:any) => s.mem_total > 0);
  const avgMem = switchesWithMem.length > 0 ? Math.round(switchesWithMem.reduce((sum:any, s:any) => sum + ((s.mem_total - s.mem_free)/s.mem_total)*100, 0) / switchesWithMem.length) : 0;

  const devicesWithUptime = deviceList.filter(d => d.uptime !== undefined);
  const avgUptimeSec = devicesWithUptime.length > 0 ? devicesWithUptime.reduce((sum, d) => sum + Number(d.uptime), 0) / devicesWithUptime.length : 0;

  // === 3. SSID DISTRIBUTION ===
  const ssidCounts = wR.reduce((acc: any, c: any) => {
     const net = c.network || 'Unknown';
     acc[net] = (acc[net] || 0) + 1;
     return acc;
  }, {});
  const ssidCards = Object.entries(ssidCounts)
     .map(([name, count]) => ({ name, count: count as number, pct: Math.round(((count as number)/wR.length)*100) }))
     .sort((a,b) => b.count - a.count);

  // === 4. TOP USAGE ===
  interface ApUsageItem { name: string; mac: string; usage: number; }
  interface ClientUsageItem { name: string; usage: number; mac: string; }

  const topApUsage: ApUsageItem[] = rawAps
      .map((ap:any): ApUsageItem => {
         const apClients = wR.filter((c:any) => c.associated_device_mac === ap.macaddr);
         const totalUsage = apClients.reduce((sum:number, c:any) => sum + Number(c.usage || 0), 0);
         return { name: ap.name, mac: ap.macaddr, usage: totalUsage };
      })
      .sort((a: ApUsageItem, b: ApUsageItem) => b.usage - a.usage)
      .slice(0, 5);

  const topClientUsage: ClientUsageItem[] = clientsList
      .map((c): ClientUsageItem => ({ name: c.hostname !== "--" ? String(c.hostname) : (c.username !== "--" ? String(c.username) : String(c.macaddr)), usage: Number(c.usage || 0), mac: String(c.macaddr) }))
      .sort((a: ClientUsageItem, b: ClientUsageItem) => b.usage - a.usage)
      .slice(0, 5);

  // === 5. PERFORMANCE ALERTS ===
  const highCpuCount = devicesWithCpu.filter(d => Number(d.cpu_utilization) > 80).length;
  const highMemCount = rawSwitches.filter((s:any) => s.mem_total > 0 && (((s.mem_total - s.mem_free)/s.mem_total)*100) > 75).length;
  const lowUptimeCount = devicesWithUptime.filter(d => Number(d.uptime) < 86400).length;
  const downCount = deviceList.length - upDevices.length;

  // === 6. INTERACTION LOGIC ===
  const toggleFilter = (type: string, value: string) => {
     if (filterType === type && filterValue === value) {
        setFilterType(null); setFilterValue(null);
     } else {
        setFilterType(type); setFilterValue(value);
     }
  };

  const getFilteredDevices = () => {
    let list = [...deviceList];
    if (filterType === 'ssid') {
       const macsInSsid = new Set(wR.filter((c:any) => c.network === filterValue).map((c:any) => c.associated_device_mac));
       list = list.filter(d => d.sys_type === 'Access Point' && macsInSsid.has(d.macaddr));
    }
    if (filterType === 'ap') {
       list = list.filter(d => d.name === filterValue);
    }
    if (filterType === 'alert') {
       if (filterValue === 'cpu') list = list.filter(d => Number(d.cpu_utilization) > 80);
       if (filterValue === 'mem') list = list.filter(d => d.sys_type === 'Switch' && d.mem_total > 0 && (((d.mem_total - d.mem_free)/d.mem_total)*100) > 75);
       if (filterValue === 'uptime') list = list.filter(d => Number(d.uptime) < 86400);
       if (filterValue === 'down') list = list.filter(d => String(d.status).toLowerCase() !== 'up');
    }
    return list;
  };

  const filteredDevices = getFilteredDevices();

  const toggleRow = (mac: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(mac)) newSet.delete(mac);
    else newSet.add(mac);
    setExpandedRows(newSet);
  };

  // === 7. CHARTS ===
  const pieChartOpts = (data: any, name: string) => ({
    tooltip: { trigger: 'item' },
    series: [{ name, type: 'pie', radius: ['45%', '75%'], itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }, label: { show: false }, data }]
  });

  const ssidChartData = ssidCards.map(s => ({ name: s.name, value: s.count }));
  
  const typeCounts = { APs: rawAps.length, Switches: rawSwitches.length, Gateways: rawGateways.length };
  const typeChartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* 1. GLOBAL SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Clients</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalClients}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Clients</h3>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{activeClients}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 h-1 w-full ${pctHealthy > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Healthy Infrastructure</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{pctHealthy}%</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 h-1 w-full ${avgCpu > 70 ? 'bg-red-500' : 'bg-blue-500'}`}></div>
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Gateway CPU</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{avgCpu}%</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 h-1 w-full ${avgMem > 70 ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Switch Memory</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{avgMem}%</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Global Avg Uptime</h3>
            <p className="text-lg font-bold text-slate-800 mt-1">{formatUptimeCompact(avgUptimeSec)}</p>
         </div>
      </div>

      {/* 2 & 5. SSID CARDS & VISUAL INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">SSID Distribution</h2>
              {filterType === 'ssid' && <button onClick={() => toggleFilter('ssid', filterValue!)} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-bold uppercase hover:bg-slate-200">Clear Filter</button>}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
               {ssidCards.slice(0, 6).map((s, idx) => {
                 const isSelected = filterType === 'ssid' && filterValue === s.name;
                 return (
                   <div key={idx} onClick={() => toggleFilter('ssid', s.name)} className={`p-4 rounded-xl border transition cursor-pointer flex flex-col ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                      <h4 className="font-bold text-slate-800 text-sm truncate">{s.name}</h4>
                      <p className="text-xs text-slate-500 mt-1"><span className="font-bold text-slate-700">{s.count} clients</span> ({s.pct}%)</p>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
                         <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.max(s.pct, 2)}%` }}></div>
                      </div>
                   </div>
                 )
               })}
            </div>
         </div>

         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-rows-2 gap-4">
             <div className="flex bg-slate-50 rounded-lg p-2 items-center">
                 <div className="w-1/2 h-32"><ReactECharts option={pieChartOpts(ssidChartData, "Networks")} style={{height:'100%'}}/></div>
                 <div className="w-1/2 flex flex-col justify-center pl-2"><h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Networks</h4><p className="text-lg font-bold text-slate-700">{ssidCards.length} Broadcasts</p></div>
             </div>
             <div className="flex bg-slate-50 rounded-lg p-2 items-center">
                 <div className="w-1/2 h-32"><ReactECharts option={pieChartOpts(typeChartData, "Devices")} style={{height:'100%'}}/></div>
                 <div className="w-1/2 flex flex-col justify-center pl-2"><h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Hardware Fleet</h4><p className="text-lg font-bold text-slate-700">{deviceList.length} Units</p></div>
             </div>
         </div>
      </div>

      {/* 3, 4, 6. TOP LISTS & PERFORMANCE ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Alarms */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Performance Alerts</h2>
               {filterType === 'alert' && <button onClick={() => toggleFilter('alert', filterValue!)} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-bold uppercase hover:bg-slate-200">Clear</button>}
            </div>
            <div className="flex flex-col gap-3 flex-1">
               <div onClick={() => toggleFilter('alert', 'cpu')} className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${filterType === 'alert' && filterValue === 'cpu' ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3"><span className="text-lg">🔥</span><span className="text-sm font-bold text-slate-700">High CPU Limit ({'>'}80%)</span></div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${highCpuCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>{highCpuCount}</span>
               </div>
               <div onClick={() => toggleFilter('alert', 'mem')} className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${filterType === 'alert' && filterValue === 'mem' ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3"><span className="text-lg">🧠</span><span className="text-sm font-bold text-slate-700">Mem Exhaustion ({'>'}75%)</span></div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${highMemCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>{highMemCount}</span>
               </div>
               <div onClick={() => toggleFilter('alert', 'uptime')} className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${filterType === 'alert' && filterValue === 'uptime' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3"><span className="text-lg">⏱</span><span className="text-sm font-bold text-slate-700">Low Uptime ({'<'}24h)</span></div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${lowUptimeCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{lowUptimeCount}</span>
               </div>
               <div onClick={() => toggleFilter('alert', 'down')} className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${filterType === 'alert' && filterValue === 'down' ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-3"><span className="text-lg">🚨</span><span className="text-sm font-bold text-slate-700">Equipment Offline</span></div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${downCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{downCount}</span>
               </div>
            </div>
         </div>

         {/* Top APs */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Top APs By Traffic</h2>
               {filterType === 'ap' && <button onClick={() => toggleFilter('ap', filterValue!)} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-bold uppercase hover:bg-slate-200">Clear</button>}
            </div>
            <div className="flex flex-col gap-2">
               {topApUsage.map((ap, idx) => (
                 <div key={idx} onClick={() => toggleFilter('ap', ap.name)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${filterType === 'ap' && filterValue === ap.name ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                    <div className="flex items-center gap-3">
                       <span className="text-slate-400 font-bold w-4">{idx+1}.</span>
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm">{ap.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase">{ap.mac}</span>
                       </div>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{formatBytes(ap.usage)}</span>
                 </div>
               ))}
            </div>
         </div>

         {/* Top Clients */}
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Top Clients By Traffic</h2>
            <div className="flex flex-col gap-2">
               {topClientUsage.map((c, idx) => (
                 <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition border border-transparent">
                    <div className="flex items-center gap-3 w-3/4">
                       <span className="text-slate-400 font-bold w-4">{idx+1}.</span>
                       <div className="flex flex-col overflow-hidden w-full">
                          <span className="font-bold text-slate-700 text-sm truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase truncate">{c.mac}</span>
                       </div>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded whitespace-nowrap">{formatBytes(c.usage)}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* 7 & 8. DEVICE DRILLDOWN TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
         <div className="flex justify-between items-center bg-slate-50 p-5 border-b border-slate-200">
            <div>
               <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                 Device Infrastructure Ledger
                 {filterType && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full border border-indigo-200">Filtered</span>}
               </h2>
               <p className="text-xs text-slate-500 mt-1">Cross-sectional deep metrics for Switches, Gateways, and APs</p>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                     <th className="px-6 py-4 font-bold">Equipment Name</th>
                     <th className="px-6 py-4 font-bold text-center">Type</th>
                     <th className="px-6 py-4 font-bold">Model / Group</th>
                     <th className="px-6 py-4 font-bold text-center">CPU / Mem</th>
                     <th className="px-6 py-4 font-bold text-center">Uptime</th>
                     <th className="px-6 py-4 font-bold text-center">State</th>
                     <th className="px-6 py-4 font-bold text-right">Inspect</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredDevices.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">No assets match the current filter selection.</td></tr> : filteredDevices.slice(0, 50).map(device => {
                     const isUp = String(device.status).toLowerCase() === 'up';
                     const isExpanded = expandedRows.has(device.macaddr);
                     
                     let memPct = "N/A";
                     if (device.sys_type === 'Switch' && device.mem_total > 0) memPct = Math.round(((device.mem_total - device.mem_free)/device.mem_total)*100) + "%";

                     const cpuVal = device.cpu_utilization !== undefined ? `${device.cpu_utilization}%` : "N/A";

                     return (
                       <Fragment key={device.macaddr}>
                         <tr className={`transition cursor-pointer ${isExpanded ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`} onClick={() => toggleRow(device.macaddr)}>
                            <td className="px-6 py-4">
                               <p className="font-bold text-slate-800">{device.name}</p>
                               <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{device.macaddr}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                               <span className="inline-flex items-center justify-center bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                 {device.sys_type}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               <p className="text-slate-700">{device.model || "Standard Tier"}</p>
                               <p className="text-[10px] bg-slate-100 text-slate-500 inline-block px-1.5 rounded mt-1 uppercase">{device.site || device.group_name || device.role || "GLOBAL"}</p>
                            </td>
                            <td className="px-6 py-4 flex flex-col gap-1 items-center justify-center">
                               {device.sys_type !== 'Access Point' ? (
                                 <>
                                   <div className="flex justify-between w-16 text-[10px] font-bold"><span className="text-slate-400">CPU</span> <span className={Number(device.cpu_utilization)>80 ? 'text-red-500' : 'text-slate-700'}>{cpuVal}</span></div>
                                   {device.sys_type === 'Switch' && <div className="flex justify-between w-16 text-[10px] font-bold"><span className="text-slate-400">RAM</span> <span className={parseInt(memPct)>75 ? 'text-amber-500' : 'text-slate-700'}>{memPct}</span></div>}
                                 </>
                               ) : (
                                  <span className="text-xs text-slate-400 italic">No telemetry</span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-slate-600">
                               {formatUptimeCompact(device.uptime)}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-sm ${isUp ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}></span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <svg className={`inline w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </td>
                         </tr>
                         {isExpanded && (
                           <tr className="bg-slate-50/50 border-b border-slate-200">
                             <td colSpan={7} className="px-6 py-6 pb-8">
                                <div className="w-full bg-white rounded-xl shadow border border-slate-200 p-5 animate-in fade-in slide-in-from-top-2">
                                   <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                                      <div className="bg-indigo-100 p-3 rounded-lg"><svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg></div>
                                      <div>
                                        <h3 className="text-lg font-bold text-slate-800">{device.name} Diagnostics</h3>
                                        <p className="text-xs text-slate-500 font-mono tracking-wider">{device.macaddr} • S/N: {device.serial || "N/A"}</p>
                                      </div>
                                   </div>
                                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                      {device.sys_type !== 'Access Point' && (
                                        <div className="flex flex-col col-span-2 md:col-span-1">
                                           <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Compute Load</span>
                                           <div className="flex items-center justify-between"><span className="text-2xl font-bold">{cpuVal}</span></div>
                                           <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                                              <div className={`h-1 rounded-full ${Number(device.cpu_utilization) > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(Number(device.cpu_utilization)||0, 100)}%` }}></div>
                                           </div>
                                        </div>
                                      )}
                                      {device.sys_type === 'Switch' && (
                                         <div className="flex flex-col col-span-2 md:col-span-1">
                                           <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Memory Saturation</span>
                                           <div className="flex items-center justify-between"><span className="text-2xl font-bold">{memPct}</span></div>
                                           <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                                              <div className={`h-1 rounded-full ${parseInt(memPct) > 75 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(parseInt(memPct)||0, 100)}%` }}></div>
                                           </div>
                                        </div>
                                      )}
                                      <div className="flex flex-col col-span-2 md:col-span-1 border-l border-slate-100 pl-4">
                                          <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">IP Address</span>
                                          <span className="text-base font-bold font-mono text-indigo-600">{device.ip_address || device.ip || "Unassigned"}</span>
                                          <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 mt-3">Firmware Build</span>
                                          <span className="text-sm font-bold text-slate-700 truncate">{device.firmware_version || "Native OS"}</span>
                                      </div>
                                      <div className="flex flex-col col-span-2 md:col-span-1 border-l border-slate-100 pl-4">
                                          <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Deployment Zone</span>
                                          <span className="text-sm font-bold text-slate-700">{device.site || "Default Sandbox"}</span>
                                          <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 mt-3">Labels</span>
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                             {(device.labels || []).map((l:string, i:number) => <span key={i} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{l}</span>)}
                                             {!device.labels?.length && <span className="text-[10px] text-slate-400">None</span>}
                                          </div>
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
