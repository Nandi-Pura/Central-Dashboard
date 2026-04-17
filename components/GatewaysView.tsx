/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataState } from "./types";

export default function GatewaysView({ data }: { data: DataState }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gwList = (data.summary as any)?.gateways?.rawData || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="panel bg-white p-0 overflow-hidden rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 bg-slate-50">
           <h2 className="text-lg font-bold text-slate-800">Gateway Edge Controllers</h2>
           <p className="text-sm text-slate-500">SD-WAN and Mobility Controller deep metrics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Gateway</th>
                <th className="px-6 py-3 font-semibold">Model / Role</th>
                <th className="px-6 py-3 font-semibold text-center">Firmware</th>
                <th className="px-6 py-3 font-semibold text-center">CPU Util</th>
                <th className="px-6 py-3 font-semibold text-center">Uptime</th>
                <th className="px-6 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {gwList.length === 0 ? <tr><td colSpan={6} className="p-6 text-center">No Gateways found</td></tr> : gwList.map((gw: any, idx: number) => {
                const uptime = gw.uptime ? `${Math.floor(Number(gw.uptime) / 86400)}d ${Math.floor((Number(gw.uptime) % 86400) / 3600)}h` : "N/A";
                const isUp = String(gw.status).toLowerCase() === 'up';

                return (
                  <tr key={`${gw.macaddr}-${idx}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{gw.name || gw.ip_address}</p>
                      <p className="text-xs text-slate-400 font-mono uppercase">{gw.macaddr}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{gw.model}</p>
                      <p className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 mt-1 rounded uppercase tracking-wider inline-block">{gw.role || "Controller"}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs">{gw.firmware_version}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${gw.cpu_utilization > 80 ? 'text-red-500' : 'text-emerald-600'}`}>{gw.cpu_utilization ?? "N/A"}%</span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">{uptime}</td>
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${isUp ? "bg-emerald-500" : "bg-red-500"}`}></span>
                       <span className="font-medium text-slate-700 uppercase text-xs">{gw.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
