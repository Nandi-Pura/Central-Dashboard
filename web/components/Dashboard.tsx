"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";

// Views & Components
import KpiRow from "./KpiRow";
import TrafficChart from "./TrafficChart";
import ClientTrend from "./ClientTrend";
import RfHealthPanel from "./RfHealthPanel";
import SsidChart from "./SsidChart";
import TopAppsChart from "./TopAppsChart";
import TopApsChart from "./TopApsChart";
import TopClientsChart from "./TopClientsChart";
import NetworkDevicesTable from "./NetworkDevicesTable";
import DeviceDetailDrawer from "./DeviceDetailDrawer";
import ClientDetailDrawer from "./ClientDetailDrawer";

// Tab Views
import DevicesView from "./views/DevicesView";
import ClientsView from "./views/ClientsView";
import RfView from "./views/RfView";
import ReportsView from "./views/ReportsView";
import AlertsView from "./views/AlertsView";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Sidebar Navigation ───────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "overview",       label: "Dashboard",            icon: "⬡" },
  { id: "devices",        label: "Devices",              icon: "⊕" },
  { id: "clients",        label: "Clients",              icon: "◎" },
  { id: "rf",             label: "RF Analytics",         icon: "⊛" },
  { id: "reports",        label: "Reports",              icon: "≡" },
];

function timeAgoShort(date: string | undefined) {
  if (!date) return "–";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboard-theme") as "dark" | "light";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("dashboard-theme", newTheme);
  };

  const { data, error, isLoading, mutate } = useSWR("/api/summary", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const criticalAlerts = data?.alerts?.filter((a: any) => a.severity === "critical") ?? [];
  const warningAlerts = data?.alerts?.filter((a: any) => a.severity === "warning") ?? [];

  useEffect(() => {
    (window as any).resetAlerts = () => {
      if (data && data.alerts) {
        const resetAlerts = data.alerts.map((a: any) => ({ ...a, count: 1 }));
        mutate({ ...data, alerts: resetAlerts }, false);
      }
    };
    return () => { delete (window as any).resetAlerts; };
  }, [data, mutate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Force trigger the worker if we're clicking refresh
      await mutate("/api/summary?force=true");
      setLastManualRefresh(new Date());
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [mutate]);

  const lastUpdated = lastManualRefresh
    ? timeAgoShort(lastManualRefresh.toISOString())
    : data?.lastPollTime
    ? timeAgoShort(data.lastPollTime)
    : "–";

  const isError = !!error && !data;

  const OverviewContent = () => (
    <div className="space-y-4 pb-12">
      {!data && isLoading ? (
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20" />)}
        </div>
      ) : (
        <KpiRow
          aps={data?.aps ?? { up: 0, total: 0 }}
          switches={data?.switches ?? { up: 0, total: 0 }}
          gateways={data?.gateways ?? { online: 0, total: 0 }}
          clients={data?.clients ?? { connected: 0, wireless: 0, wired: 0 }}
          alertCount={data?.alerts?.length ?? 0}
          hasCritical={criticalAlerts.length > 0}
          totalBytes={data?.traffic?.totalBytes24h ?? 0}
          throughputRate={data?.traffic?.throughputBytesPerSec ?? 0}
        />
      )}
      
      <div className="grid grid-cols-1 gap-4">
        {/* Row 2: Full Width Traffic Trend */}
        <div className="w-full">
          {isLoading ? <div className="skeleton h-80" /> : (
            <TrafficChart 
              trend={data?.traffic?.trend ?? []} 
              rxBytes={data?.traffic?.rxBytes ?? 0} 
              txBytes={data?.traffic?.txBytes ?? 0} 
              theme={theme} 
            />
          )}
        </div>

        {/* Row 3: Usage Consumers (Apps and Clients) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {isLoading ? <div className="skeleton h-80" /> : (
              <TopAppsChart data={data?.topApps ?? []} />
            )}
          </div>
          <div>
            {isLoading ? <div className="skeleton h-80" /> : (
              <TopClientsChart data={data?.topClients ?? []} />
            )}
          </div>
        </div>

        {/* Row 4: Distribution (APs and SSIDs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {isLoading ? <div className="skeleton h-96" /> : (
              <TopApsChart data={data?.topAps ?? []} />
            )}
          </div>
          <div>
            {isLoading ? <div className="skeleton h-96" /> : (
              <SsidChart trend={data?.ssidTrend ?? []} theme={theme} />
            )}
          </div>
        </div>
      </div>

      <div>
        {isLoading ? <div className="skeleton h-96" /> : (
            <NetworkDevicesTable 
              data={data?.networkDevices ?? []} 
              onDeviceClick={(d) => setSelectedDevice(d)} 
            />
        )}
      </div>
    </div>
  );

  const renderView = () => {
    if (!data && isLoading) return <div className="p-8"><div className="skeleton h-screen" /></div>;
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="text-4xl mb-4 text-amber-500">
          {data?.system_health === "CRITICAL" ? "🔐" : "⚠️"}
        </div>
        <h2 className="text-xl font-bold text-white">
          {data?.system_health === "CRITICAL" ? "Authentication Failure" : "Temporary Data Interruption"}
        </h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          {data?.system_health === "CRITICAL" 
            ? "Your Aruba Central API credentials (Access/Refresh Token) have expired. Please update your .env file with new tokens from the portal."
            : "The Aruba Central telemetry stream is currently being refreshed or re-authenticated. This usually resolves within seconds."
          }
        </p>
        <button 
          onClick={handleRefresh} 
          className="mt-8 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-lg shadow-indigo-600/20"
        >
          {isRefreshing ? "Retrying..." : "Retry Connection"}
        </button>
      </div>
    
    switch (activeTab) {
      case "overview": return <OverviewContent />;
      case "devices": return <DevicesView 
        aps={data?.aps ?? { up: 0, down: 0, total: 0 }} 
        switches={data?.switches ?? { up: 0, down: 0, total: 0 }} 
        gateways={data?.gateways ?? { online: 0, offline: 0, total: 0 }} 
        networkDevices={data?.networkDevices ?? []} 
        onDeviceClick={(d) => setSelectedDevice(d)} 
      />;
      case "clients": return <ClientsView 
        clients={data?.clients ?? { connected: 0, wireless: 0, wired: 0 }} 
        clientList={data?.clientList ?? []} 
        ssidTrend={data?.ssidTrend ?? []} 
        onClientClick={(c) => setSelectedClient(c)} 
        theme={theme} 
      />;
      case "rf": return <RfView rfHealth={data?.rfHealth ?? {}} />;
      case "reports": return <ReportsView />;
      case "alerts": return <AlertsView alerts={data?.alerts ?? []} onDeviceClick={(dId) => {
        if (!dId) return;
        const dev = data?.networkDevices?.find((nd: any) => nd.id === dId || (typeof dId === 'string' && dId.includes(nd.id)));
        if (dev) setSelectedDevice(dev);
      }} />;
      default: return <OverviewContent />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden select-none transition-colors duration-300 ${theme}`} style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>
      {/* ─── SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 h-full border-r transition-all duration-200"
        style={{
          width: sidebarCollapsed ? "56px" : "210px",
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/5 flex-shrink-0" >
          <div className="flex-shrink-0 w-6 h-6 rounded bg-[#316dca] flex items-center justify-center text-white font-bold text-xs">A</div>
          {!sidebarCollapsed && <span className="text-sm font-semibold text-white tracking-tight">Aruba Central</span>}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-item w-full ${activeTab === item.id ? "active" : ""}`}
              style={{ justifyContent: sidebarCollapsed ? "center" : "flex-start", height: "36px" }}
            >
              <span className="text-sm flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="h-10 border-t border-white/5 hover:bg-white/[0.02] flex items-center justify-center text-slate-500 transition-colors"
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </aside>

      {/* ─── MAIN AREA ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
        <header className="flex items-center gap-4 px-6 h-14 shrink-0 border-b z-40 backdrop-blur-md" style={{ background: "var(--bg-header)", borderColor: "var(--border-subtle)" }}>
          <div className="relative w-72">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">⌕</span>
            <input type="text" placeholder="Search..."
              className="w-full pl-7 pr-3 py-1.5 text-[11px] rounded bg-[#161b22] border border-white/10 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#316dca60]" />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Sync:</span>
              <span className="text-[10px] font-mono text-slate-400">{lastUpdated}</span>
              <div className="w-[1px] h-2.5 mx-1 bg-white/10" />
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${data?.isFallback ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                <span className="text-[9px] font-black uppercase text-slate-500">{data?.isFallback ? "Fallback" : "Live"}</span>
              </div>
              <button 
                onClick={handleRefresh} 
                disabled={isRefreshing} 
                className={`ml-1 p-1 hover:text-white transition-all transform ${isRefreshing ? "scale-90 opacity-50" : "hover:scale-110"}`}
                title="Force Cloud Sync"
              >
                <span className={`inline-block text-[10px] ${isRefreshing ? "animate-spin" : ""}`}>↻</span>
              </button>
            </div>

            <div className="relative" ref={alertsRef}>
              <button onClick={() => setAlertsOpen(!alertsOpen)} className="relative p-1.5 rounded hover:bg-white/5 text-slate-400">
                <span className="text-sm">🔔</span>
                {criticalAlerts.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#f85149]" />}
              </button>

              {alertsOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 rounded-lg shadow-xl overflow-hidden bg-[#1c2128] border border-white/10">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#161b22]">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Alerts & Events</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">{criticalAlerts.length + warningAlerts.length}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                    {[...criticalAlerts, ...warningAlerts].map((a: any, i: number) => (
                      <div key={i} className="p-3 hover:bg-white/[0.02] cursor-pointer">
                        <div className="flex items-start gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${a.severity === "critical" ? "bg-[#f85149]" : "bg-[#d29922]"}`} />
                          <div>
                            <div className="text-[11px] text-[#adbac7] leading-normal">{a.message}</div>
                            <div className="text-[9px] text-slate-500 mt-1">{timeAgoShort(a.timestamp)} ago</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                <span className="text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>
              </button>
            </div>

            <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400">NN</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-white tracking-tight">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Dashboard Overview"}
              </h1>
            </div>
            {data?.isFallback && (
              <div className="mb-4 p-2 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <span className="text-amber-500 text-sm">⚠️</span>
                <div className="text-[10px] text-amber-200/70 font-medium">
                  <span className="font-bold text-amber-500 mr-2 uppercase">Worker Offline:</span>
                  The live Aruba Central telemetry stream is interrupted. Displaying the most recent snapshots from InfluxDB.
                </div>
              </div>
            )}
            {renderView()}
          </div>
        </main>
      </div>

      <DeviceDetailDrawer device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      <ClientDetailDrawer client={selectedClient} onClose={() => setSelectedClient(null)} />
    </div>
  );
}
