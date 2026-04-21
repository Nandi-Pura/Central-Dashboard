import React, { useEffect, useState } from "react";
import useSWR from "swr";

interface DeviceDetailDrawerProps {
  device: any | null;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const StatusBadge = ({ status }: { status: string }) => {
  const isUp = status === "Up" || status === "online";
  const isWarning = status === "Warning";
  const isDown = status === "Down" || status === "offline";

  let styles = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  if (isUp) styles = "bg-green-500/10 text-green-400 border-green-500/20";
  if (isWarning) styles = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (isDown) styles = "bg-red-500/10 text-red-400 border-red-500/20";

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles}`}>
      {status || "UNKNOWN"}
    </span>
  );
};

export const InfoRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-sans">{label}</span>
    <span className="text-sm font-medium text-white font-mono truncate">{value || "—"}</span>
  </div>
);

export const DeviceSection = ({ title, children, columns = 2 }: { title: string; children: React.ReactNode; columns?: number }) => (
  <div className="space-y-4 pb-6 border-b border-slate-700/50 last:border-0 last:pb-0">
    <h4 className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em]">{title}</h4>
    <div className={`grid grid-cols-${columns} gap-y-5 gap-x-8`}>
      {children}
    </div>
  </div>
);

const Skeleton = () => (
  <div className="space-y-8 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-4">
        <div className="h-3 w-24 bg-slate-700/50 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-8 bg-slate-800 rounded-lg" />
          <div className="h-8 bg-slate-800 rounded-lg" />
          <div className="h-8 bg-slate-800 rounded-lg" />
          <div className="h-8 bg-slate-800 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export default function DeviceDetailDrawer({ device, onClose }: DeviceDetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const serial = device?.serial || device?.id;
  
  const { data, error, isLoading } = useSWR(
    serial ? `/api/device/${serial}?type=${device?.type}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (device) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "unset";
    }
  }, [device]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!device && !isVisible) return null;

  const formatUptimeValue = (seconds: any) => {
    if (seconds === undefined || seconds === null || seconds === "-") return "-";
    const sec = Number(seconds);
    if (isNaN(sec)) return seconds;
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const memUsage = device?.type === "Switch"
    ? (data?.mem_total !== undefined ? data.mem_total.toString() : (device?.mem || "0").replace("%", ""))
    : (data?.mem_total 
        ? Math.round(((data.mem_total - (data.mem_free || 0)) / data.mem_total) * 100).toString() 
        : (device?.mem || "0").replace("%", ""));

  const cpuUsage = data?.cpu_utilization !== undefined ? `${data.cpu_utilization}%` : (device?.cpu || "-");

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-slate-900 border-l border-slate-700 z-[101] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${isVisible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 shrink-0 flex items-center justify-between bg-slate-900">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white tracking-tight">{device?.id}</h2>
              <StatusBadge status={data?.status || device?.status} />
            </div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {device?.type} • {data?.model || device?.model}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all text-2xl text-gray-400"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar scroll-smooth">
          {isLoading ? (
            <Skeleton />
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-4">⚠️</div>
              <h4 className="text-white font-bold">Failed to load details</h4>
              <p className="text-gray-500 text-sm mt-1">Check Aruba Central credentials</p>
            </div>
          ) : !data ? null : (
            <>
              <DeviceSection title="General Information">
                <InfoRow label="Hostname" value={data.name || device?.id} />
                <InfoRow label="Serial Number" value={data.serial || device?.serial} />
                <InfoRow label="MAC Address" value={data.macaddr || device?.macAddress} />
                <InfoRow label="IP Address" value={data.ip_address || device?.ipAddress} />
                <InfoRow label="Firmware" value={data.firmware_version} />
                <InfoRow label="Group" value={data.group_name} />
                <InfoRow label="Site" value={data.site} />
                <InfoRow label="Status" value={data.status || device?.status} />
              </DeviceSection>

              <DeviceSection title="Performance metrics">
                <InfoRow label="Uptime" value={formatUptimeValue(data.uptime || device?.uptime)} />
                <InfoRow label="CPU Utilization" value={cpuUsage} />
                <InfoRow label="Memory Usage" value={`${memUsage}%`} />
                {device?.type === "Gateway" ? (
                   <InfoRow label="WAN IP" value={data.wan_ip || data.ip_address || device?.wanIp} />
                ) : (
                  <InfoRow label="Client Count" value={data.client_count} />
                )}
              </DeviceSection>

              {device?.type === "Switch" && (
                <DeviceSection title="Physical Port status (Live)" columns={1}>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
                      {(data.ports || Array.from({ length: 24 })).map((p: any, i: number) => {
                        const status = p?.status?.toLowerCase() || "down";
                        const isUp = status === "up" || status === "online";
                        return (
                          <div 
                            key={i} 
                            className={`group relative h-10 rounded-md border flex flex-col items-center justify-center transition-all ${isUp ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "bg-slate-800/30 border-slate-700/50 text-slate-600"}`}
                            title={p ? `Port ${p.port_id}: ${p.status} - ${p.speed || "N/A"}` : `Port ${i+1}: No Data`}
                          >
                            <span className="text-[9px] font-black">{p?.port_id || i + 1}</span>
                            {p?.uplink && <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-slate-900" title="Uplink Port" />}
                            
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[9px] text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-slate-700">
                              Port {p?.port_id || i+1}: {p?.status || "Unknown"} {p?.speed ? `(${p.speed})` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/40" /> Link Up</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-slate-800" /> Link Down</div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-500" /> Uplink</div>
                    </div>
                  </div>
                </DeviceSection>
              )}

              {device?.type === "AP" && (
                <>
                  <DeviceSection title="Wireless Radios" columns={1}>
                    <div className="bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-800/50 text-gray-500 uppercase font-black tracking-tighter">
                          <tr>
                            <th className="py-2.5 px-4">Band</th>
                            <th className="py-2.5 px-4 text-center">Chan</th>
                            <th className="py-2.5 px-4 text-center">Util</th>
                            <th className="py-2.5 px-4 text-center">Power</th>
                            <th className="py-2.5 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-gray-300 font-mono">
                          {data.radio_stats?.map((r: any, i: number) => (
                            <tr key={i}>
                              <td className="py-2.5 px-4 font-bold text-white">{r.band}</td>
                              <td className="py-2.5 px-4 text-center">{r.channel}</td>
                              <td className="py-2.5 px-4 text-center">{r.util}%</td>
                              <td className="py-2.5 px-4 text-center">{r.tx_power}</td>
                              <td className="py-2.5 px-4 text-right">
                                <span className={r.status === "Up" ? "text-green-400" : "text-red-400"}>●</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </DeviceSection>

                  <DeviceSection title="Network Interfaces" columns={1}>
                     <div className="space-y-3">
                        {data.ethernet_interfaces?.map((eth: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs">eth</div>
                                <div>
                                   <div className="text-sm font-bold text-white">{eth.name}</div>
                                   <div className="text-[10px] text-gray-500 font-mono">{eth.speed} • {eth.duplex}</div>
                                </div>
                             </div>
                             <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">{eth.status}</span>
                          </div>
                        ))}
                     </div>
                  </DeviceSection>
                </>
              )}

              {device?.type === "Gateway" && (
                <DeviceSection title="System Diagnostics" columns={1}>
                   <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div className="text-[10px] font-black uppercase text-amber-500 mb-1">Last Reboot Reason</div>
                      <div className="text-sm font-medium text-white">{data.reboot_reason || "Scheduled maintenance"}</div>
                   </div>
                </DeviceSection>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 shrink-0 bg-slate-900/50 flex justify-end gap-3 backdrop-blur-xl">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 text-[11px] font-black text-gray-400 rounded-xl hover:bg-white/5 transition-all uppercase tracking-[0.2em] border border-slate-700/50"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
