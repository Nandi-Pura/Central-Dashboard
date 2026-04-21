import React from "react";
import useSWR from "swr";
import RfHealthPanel from "../RfHealthPanel";

interface RfViewProps {
  rfHealth: any;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function RfView({ rfHealth }: RfViewProps) {
  const { data, isLoading } = useSWR("/api/rf-health", fetcher, { 
    refreshInterval: 1800000, // 30 mins
    revalidateOnFocus: false 
  });

  const getUtilColor = (util: number) => {
    if (util >= 70) return "#ef4444";
    if (util >= 40) return "#f59e0b";
    return "#10b981";
  };

  // Aggregate channel data from real summaries
  const channels24 = [1, 6, 11].map(ch => {
    const matching = data?.rfSummaries?.find((s: any) => s.rf24?.channel === ch);
    return { ch, util: matching?.rf24?.utilization || 0, color: getUtilColor(matching?.rf24?.utilization || 0) };
  });

  const channels5 = [36, 40, 44, 48, 149, 153, 161].map(ch => {
    const matching = data?.rfSummaries?.find((s: any) => s.rf5?.channel === ch);
    return { ch, util: matching?.rf5?.utilization || 0, color: getUtilColor(matching?.rf5?.utilization || 0) };
  });

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">RF Analytics (Live)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time radio environment across discovered APs</p>
        </div>
        {data?.lastUpdated && (
          <div className="text-[10px] text-slate-500 font-mono">LAST POLL: {new Date(data.lastUpdated).toLocaleTimeString()}</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <RfHealthPanel rfHealth={rfHealth} />
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Live Channel Utilization</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-xs italic">Discovering AP frequencies...</div>
          ) : (
            <>
              <div className="mb-5">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">2.4 GHz Channels</div>
                <div className="flex gap-3">
                  {channels24.map((c, i) => (
                    <div key={i} className="flex-1 text-center">
                      <div className="text-[10px] text-slate-500 mb-2">CH {c.ch}</div>
                      <div className="relative h-20 rounded-lg overflow-hidden bg-slate-800/20 border border-slate-700/30">
                        <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                          style={{ height: `${c.util}%`, background: `linear-gradient(180deg, ${c.color}66, ${c.color})` }} />
                      </div>
                      <div className="text-[10px] font-bold mt-2 font-mono" style={{ color: c.color }}>{c.util}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider my-4 opacity-10" />

              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">5 GHz Channels</div>
                <div className="flex gap-2">
                  {channels5.map((c, i) => (
                    <div key={i} className="flex-1 text-center">
                      <div className="text-[9px] text-slate-500 mb-1">CH {c.ch}</div>
                      <div className="relative h-14 rounded-md overflow-hidden bg-slate-800/20 border border-slate-700/30">
                        <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
                          style={{ height: `${c.util}%`, background: `linear-gradient(180deg, ${c.color}66, ${c.color})` }} />
                      </div>
                      <div className="text-[9px] font-bold mt-1 font-mono" style={{ color: c.color }}>{c.util}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Per-AP RF Performance (APAC-SOUTH)</h3>
        {isLoading ? (
          <div className="space-y-3 py-4">
             <div className="h-4 w-full skeleton opacity-20" />
             <div className="h-4 w-full skeleton opacity-20" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                  <th className="text-left py-3 px-3">Access Point</th>
                  <th className="text-center py-3 px-3">Band</th>
                  <th className="text-center py-3 px-3">Channel</th>
                  <th className="text-center py-3 px-3">Utilization</th>
                  <th className="text-center py-3 px-3">Noise Floor</th>
                  <th className="text-center py-3 px-3">Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {data?.rfSummaries?.map((r: any, i: number) => (
                  <React.Fragment key={i}>
                    {/* 5GHz Row */}
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-3 px-3 font-bold text-white font-mono">{r.name}</td>
                      <td className="py-3 px-3 text-center text-slate-500">5GHz</td>
                      <td className="py-3 px-3 text-center text-indigo-400 font-mono">{r.rf5?.channel || "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold font-mono" style={{ color: getUtilColor(r.rf5?.utilization || 0) }}>
                          {r.rf5?.utilization !== undefined ? `${r.rf5.utilization}%` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">{r.rf5?.noise_floor ? `${r.rf5.noise_floor} dBm` : "—"}</td>
                      <td className="py-3 px-3 text-center text-slate-300 font-bold">{r.rf5?.active_clients || 0}</td>
                    </tr>
                    {/* 2.4GHz Row */}
                    <tr className="hover:bg-white/[0.01]">
                      <td className="py-3 px-3 font-bold text-white/50 font-mono text-[10px] pl-6">└ {r.serial}</td>
                      <td className="py-3 px-3 text-center text-slate-500">2.4GHz</td>
                      <td className="py-3 px-3 text-center text-indigo-400 font-mono">{r.rf24?.channel || "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold font-mono" style={{ color: getUtilColor(r.rf24?.utilization || 0) }}>
                          {r.rf24?.utilization !== undefined ? `${r.rf24.utilization}%` : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">{r.rf24?.noise_floor ? `${r.rf24.noise_floor} dBm` : "—"}</td>
                      <td className="py-3 px-3 text-center text-slate-300 font-bold">{r.rf24?.active_clients || 0}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
