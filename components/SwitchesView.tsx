/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataState } from "./types";

export default function SwitchesView({ data }: { data: DataState }) {
  const switches = data.switches;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sList = (data.summary as any)?.switches?.rawData || [];

  if (!switches) return <div className="panel bg-white"><p className="text-slate-500 text-sm">No switch data available.</p></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="panel bg-white overflow-hidden p-0 border border-slate-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Switch Inventory</h2>
              <p className="text-sm text-slate-500">Detailed hardware statistics and utilization</p>
            </div>
            <div className="flex gap-4">
               <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{switches.up}</p><p className="text-xs text-slate-500 font-semibold uppercase">Online</p></div>
               <div className="text-center"><p className="text-2xl font-bold text-red-500">{switches.down}</p><p className="text-xs text-slate-500 font-semibold uppercase">Offline</p></div>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Name / MAC</th>
                <th className="px-6 py-3 font-semibold">Model / IP</th>
                <th className="px-6 py-3 font-semibold text-center">Uptime</th>
                <th className="px-6 py-3 font-semibold text-center">CPU Util</th>
                <th className="px-6 py-3 font-semibold text-center">Mem Free</th>
                <th className="px-6 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sList.length === 0 ? <tr><td colSpan={6} className="p-6 text-center">No Switches found</td></tr> : sList.map((sw: any, idx: number) => {
                const uptime = sw.uptime ? `${Math.floor(Number(sw.uptime) / 86400)}d ${Math.floor((Number(sw.uptime) % 86400) / 3600)}h` : "N/A";
                const isUp = String(sw.status).toLowerCase() === 'up';
                const memPct = Number(sw.mem_total) > 0 ? Math.round((Number(sw.mem_free) / Number(sw.mem_total)) * 100) : 0;

                return (
                  <tr key={`${sw.macaddr}-${idx}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{sw.name}</p>
                      <p className="text-xs text-slate-400 font-mono uppercase">{sw.macaddr}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{sw.model || "Switch"}</p>
                      <p className="text-xs text-blue-500">{sw.ip_address}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500">{uptime}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${sw.cpu_utilization > 80 ? 'text-red-500' : 'text-emerald-600'}`}>{sw.cpu_utilization ?? "N/A"}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`font-bold text-slate-700`}>{memPct}%</span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${isUp ? "bg-emerald-500" : "bg-red-500"}`}></span>
                       <span className="font-medium text-slate-700 uppercase text-xs">{sw.status}</span>
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
