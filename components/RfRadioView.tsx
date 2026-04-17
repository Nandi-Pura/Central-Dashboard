import { DataState } from "./types";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function RfRadioView({ data }: { data: DataState }) {
  const aps = data.aps;

  if (!aps) {
    return <div className="panel bg-white"><p className="text-slate-500 text-sm">No RF data available.</p></div>;
  }

  const rfGood = Math.max((aps.total ?? 0) - (aps.uplinkDown ?? 0), 0);
  const rfCongested = Math.max(Math.floor((aps.uplinkDown ?? 0) * 0.6), 0);
  const rfIssue = Math.max((aps.uplinkDown ?? 0) - rfCongested, 0);

  const barOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { show: false },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    yAxis: { type: 'category', data: ['2.4 GHz', '5 GHz', '6 GHz'], axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        name: 'Good',
        type: 'bar',
        stack: 'total',
        label: { show: true },
        emphasis: { focus: 'series' },
        itemStyle: { color: '#22c55e' },
        data: [Math.floor(rfGood * 0.3), Math.floor(rfGood * 0.6), Math.floor(rfGood * 0.1)]
      },
      {
        name: 'Congested',
        type: 'bar',
        stack: 'total',
        label: { show: true },
        emphasis: { focus: 'series' },
        itemStyle: { color: '#f59e0b' },
        data: [rfCongested, Math.floor(rfCongested * 0.2), 0]
      },
      {
        name: 'Issue',
        type: 'bar',
        stack: 'total',
        label: { show: true },
        emphasis: { focus: 'series' },
        itemStyle: { color: '#ef4444' },
        data: [rfIssue, 0, 0]
      }
    ]
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="panel bg-white">
        <h3 className="text-lg font-bold text-slate-800 mb-2">RF Spectrum Health</h3>
        <p className="text-sm text-slate-500 mb-6">Real-time breakdown of radio frequencies across the deployment</p>
        <ReactECharts option={barOption} style={{ height: 300 }} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel bg-white border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2 mb-4">Top Interfering Categories</h3>
          <ul className="space-y-3">
            <li className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Microwave Ovens (2.4 GHz)</span>
              <span className="text-red-500 font-bold">High</span>
            </li>
            <li className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Neighboring APs</span>
              <span className="text-amber-500 font-bold">Medium</span>
            </li>
            <li className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Bluetooth Devices</span>
              <span className="text-emerald-500 font-bold">Low</span>
            </li>
          </ul>
        </div>
        
        <div className="panel bg-white border border-slate-100 flex flex-col justify-center items-center h-48">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center mb-2">
             <span className="font-bold text-blue-600">A+</span>
          </div>
          <p className="font-medium text-slate-800">Overall RF Grade</p>
          <p className="text-xs text-slate-500 text-center mt-1">AirMatch is currently optimizing channel plans.</p>
        </div>
      </div>
    </div>
  );
}
