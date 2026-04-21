import React, { useRef, useEffect } from "react";
import * as echarts from "echarts";
import { formatThroughput } from "../utils/formatters";

interface TrafficChartProps {
  trend: any[];
  rxBytes: number;
  txBytes: number;
  theme: "dark" | "light";
}

export default function TrafficChart({ trend, rxBytes, txBytes, theme }: TrafficChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = echarts.init(ref.current, theme);
    return () => chartRef.current?.dispose();
  }, [theme]);

  useEffect(() => {
    if (!chartRef.current || !trend?.length) return;

    const isLight = theme === "light";
    const textSecondary = isLight ? "#57606a" : "#adbac7";
    const borderSubtle = isLight ? "rgba(31,35,40,0.05)" : "rgba(255,255,255,0.03)";
    const tooltipBg = isLight ? "#ffffff" : "#1c2128";

    // Determine best unit based on max value (in bits/sec)
    // NOTE: t.rxBytes is total for 30 mins, so we divide by 1800 to get rate.
    const maxBitsPerSec = Math.max(...trend.map(t => (Number(t.rxBytes || 0) + Number(t.txBytes || 0)) * 8 / 1800), 1);
    const units = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];
    const i = Math.floor(Math.log(maxBitsPerSec) / Math.log(1024));
    const unitIndex = Math.max(0, Math.min(i, units.length - 1));
    const unitLabel = units[unitIndex];
    const divisor = Math.pow(1024, unitIndex);

    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: isLight ? "rgba(31,35,40,0.1)" : "rgba(255,255,255,0.1)",
        textStyle: { color: textSecondary, fontSize: 10 },
        formatter: (params: any) => {
           let res = `<div style="font-weight:bold;margin-bottom:4px">${params[0].name}</div>`;
           params.forEach((p: any) => {
             const valBitsRate = (p.data * divisor); // Rate in bits/sec
             res += `<div style="display:flex;justify-content:between;gap:10px">
                <span>${p.marker} ${p.seriesName}</span>
                <span style="font-weight:bold">${formatThroughput(valBitsRate/8)}</span>
             </div>`;
           });
           return res;
        },
        axisPointer: { type: "line", lineStyle: { color: isLight ? "rgba(31,35,40,0.1)" : "rgba(255,255,255,0.1)" } }
      },
      grid: { left: "45", right: "15", top: "40", bottom: "30", containLabel: false },
      xAxis: {
        type: "category",
        data: trend.map(t => new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        axisLabel: { color: isLight ? "#6e7781" : "#545d68", fontSize: 9 },
        axisLine: { lineStyle: { color: borderSubtle } },
        axisTick: { show: false }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: borderSubtle } },
        axisLabel: { color: isLight ? "#6e7781" : "#545d68", fontSize: 9, formatter: `{value} ${unitLabel}` },
        axisLine: { show: false }
      },
      series: [
        {
          name: "Download",
          type: "line",
          data: trend.map(t => Number(((t.rxBytes || 0) * 8 / 1800) / divisor).toFixed(2)),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#3fb950", width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(63,185,80,0.15)" },
              { offset: 1, color: "rgba(63,185,80,0)" }
            ])
          }
        },
        {
          name: "Upload",
          type: "line",
          data: trend.map(t => Number(((t.txBytes || 0) * 8 / 1800) / divisor).toFixed(2)),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#539bf5", width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(83,155,245,0.15)" },
              { offset: 1, color: "rgba(83,155,245,0)" }
            ])
          }
        }
      ]
    });
  }, [trend, theme]);

  useEffect(() => {
    const resize = () => chartRef.current?.resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="glass-card p-4 h-full flex flex-col fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Average Throughput (Last 30 min)</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
            <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Download: <span className="text-white font-bold font-mono">{formatThroughput((rxBytes || 0) / 1800)}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#539bf5]" />
            <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Upload: <span className="text-white font-bold font-mono">{formatThroughput((txBytes || 0) / 1800)}</span></span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[220px]" ref={ref} />
    </div>
  );
}
