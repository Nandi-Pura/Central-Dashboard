/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from "react";
import { DataState } from "./types";
import OverviewView from "./OverviewView";
import AccessPointsView from "./AccessPointsView";
import SwitchesView from "./SwitchesView";
import GatewaysView from "./GatewaysView";
import ClientsView from "./ClientsView";
import RfRadioView from "./RfRadioView";

// Auto-polling: 30 minutes (respects Aruba 7 req/sec rate limit)
// Manual refresh: immediate on button click
const AUTO_POLL_MS = 30 * 60 * 1000; // 30 minutes

const tabs = ["Overview", "Access Points", "Switches", "Gateways", "Clients", "RF / Radio"];

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "Refreshing...";
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const formatLastUpdated = (date: Date | null): string => {
  if (!date) return "Never";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

export default function Dashboard() {
  const [data, setData] = useState<DataState>({
    summary: null,
    aps: null,
    switches: null,
    gateways: null,
    clients: null,
    alerts: []
  });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState("Overview");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown]   = useState(AUTO_POLL_MS);
  const nextPollAt = useRef<number>(Date.now() + AUTO_POLL_MS);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Core fetch function ────────────────────────────────────
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);

    try {
      // 6 parallel requests — stays within 7 req/sec Aruba rate limit
      const [summary, aps, switches, gateways, clients, alerts] = await Promise.all([
        fetch("/api/summary").then((r) => r.json()),
        fetch("/api/aps").then((r) => r.json()),
        fetch("/api/switches").then((r) => r.json()),
        fetch("/api/gateways").then((r) => r.json()),
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json()),
      ]);

      setData({
        summary:  summary.message  ? null : summary,
        aps:      aps.message      ? null : aps,
        switches: switches.message ? null : switches,
        gateways: gateways.message ? null : gateways,
        clients:  clients.message  ? null : clients,
        alerts:   Array.isArray(alerts) ? alerts : [],
      });

      const now = Date.now();
      setLastUpdated(new Date(now));
      nextPollAt.current = now + AUTO_POLL_MS;
      setCountdown(AUTO_POLL_MS);
    } catch (error) {
      console.error("[Dashboard] Fetch failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Auto-poll every 30 minutes ────────────────────────────
  useEffect(() => {
    fetchData(); // initial load

    timerRef.current = setInterval(() => {
      fetchData();
    }, AUTO_POLL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  // ── Countdown ticker: update every second ─────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = nextPollAt.current - Date.now();
      setCountdown(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Manual refresh: reset the auto-poll timer too ─────────
  const handleManualRefresh = () => {
    if (refreshing || loading) return;
    // Reset auto-poll interval so it doesn't double-fire
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchData(), AUTO_POLL_MS);
    fetchData(true);
  };

  const apItems = data.aps?.items ?? [];
  const isWorking = loading || refreshing;

  return (
    <main className="mx-auto max-w-7xl px-6 py-6 pb-20">

      {/* ── Header ── */}
      <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
            <span className="text-lg font-bold text-white tracking-widest">AC</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Dashboard Central - Aruba Networks</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Unified Network Operations &amp; Management</p>
          </div>
        </div>

        {/* Status + Controls */}
        <div className="flex items-center gap-4">

          {/* Live status indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full transition ${isWorking ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`}></span>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              {isWorking ? "Syncing..." : "Live"}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Last updated */}
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Last Updated</p>
            <p className="text-xs font-bold text-slate-600">{formatLastUpdated(lastUpdated)}</p>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Countdown to next auto-refresh */}
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Next Auto-Refresh</p>
            <p className="text-xs font-bold text-indigo-600 tabular-nums">{formatCountdown(countdown)}</p>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Manual Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isWorking}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-200 ${
              isWorking
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-95 shadow-sm"
            }`}
          >
            <svg
              className={`w-4 h-4 ${isWorking ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isWorking ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>
      </header>

      {/* ── Rate limit info banner (subtle) ── */}
      <div className="mb-4 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[11px] text-slate-500">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>
          Auto-refresh setiap <strong className="text-slate-700">30 menit</strong> · 
          6 API calls per refresh · Aruba rate limit: 7 req/sec · 
          Klik <strong className="text-indigo-600">Refresh Now</strong> untuk memperbarui data sekarang
        </span>
      </div>

      {/* ── Tab Navigation ── */}
      <nav className="mb-6 flex gap-2 border-b border-slate-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md shadow-[0_-2px_8px_rgba(37,99,235,0.4)]"></span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Content Area ── */}
      {loading && activeTab === "Overview" ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 text-sm font-medium">Mengambil data dari Aruba Central...</p>
        </div>
      ) : (
        <div className={`animate-in fade-in duration-500 slide-in-from-bottom-2 transition-opacity ${refreshing ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
          {activeTab === "Overview"       && <OverviewView data={data} />}
          {activeTab === "Access Points"  && (
            <AccessPointsView
              apItems={apItems}
              rawAps={(data.aps as any)?.rawData as any[]}
              getClientCount={(mac) => {
                const c = [...(data.clients?.wirelessRaw || []), ...(data.clients?.wiredRaw || [])];
                return c.filter(x =>
                  x.associated_device_mac === mac ||
                  x.associated_device_serial === mac ||
                  x.gateway_serial === mac
                ).length;
              }}
            />
          )}
          {activeTab === "Switches"  && <SwitchesView data={data} />}
          {activeTab === "Gateways"  && <GatewaysView data={data} />}
          {activeTab === "Clients"   && <ClientsView data={data} />}
          {activeTab === "RF / Radio" && <RfRadioView data={data} />}
        </div>
      )}
    </main>
  );
}
