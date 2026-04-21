import React, { useRef, useEffect } from "react";
import * as echarts from "echarts";

interface SsidChartProps {
  trend: { timestamp: string, distribution: { ssid: string, count: number }[] }[];
  theme: "dark" | "light";
}

const COLORS = ["#539bf5", "#3fb950", "#d29922", "#f85149", "#a87ffb", "#4182d9"];

export default function SsidChart({ trend, theme }: SsidChartProps) {
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
    const borderSubtle = isLight ? "rgba(31,35,40,0.05)" : "rgba(255,255,255,0.1)";

    // Extract all unique SSID names across all trend points
    const ssidNames = Array.from(new Set(
      trend.flatMap(point => point.distribution.map(d => d.ssid))
    )).slice(0, 5); // Keep top 5 for visual clarity

    const series = ssidNames.map((name, i) => ({
      name: name,
      type: "line",
      smooth: true,
      showSymbol: false,
      data: trend.map(point => {
        const item = point.distribution.find(d => d.ssid === name);
        return item ? item.count : 0;
      }),
      lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
    }));

    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isLight ? "#ffffff" : "#1c2128",
        borderColor: borderSubtle,
        textStyle: { color: textSecondary, fontSize: 10 }
      },
      legend: {
        show: true,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: textSecondary, fontSize: 10 },
        bottom: 0,
        type: "scroll"
      },
      grid: {
        top: 25,
        left: 30,
        right: 15,
        bottom: 50,
        containLabel: false
      },
      xAxis: {
        type: "category",
        data: trend.map(t => new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        axisLabel: { color: isLight ? "#6e7781" : "#545d68", fontSize: 9 },
        axisLine: { lineStyle: { color: borderSubtle } },
        axisTick: { show: false }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: borderSubtle, type: "dashed" } },
        axisLabel: { color: isLight ? "#6e7781" : "#545d68", fontSize: 9 },
        axisLine: { show: false }
      },
      series: series
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
        <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">SSID Trend</h3>
      </div>
      <div className="flex-1 min-h-[180px]" ref={ref} />
    </div>
  );
}
