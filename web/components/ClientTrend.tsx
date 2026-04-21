import React, { useRef, useEffect } from "react";
import * as echarts from "echarts";

interface ClientTrendProps {
  trend: { time: string; count: number; wireless?: number; wired?: number }[];
  theme: "dark" | "light";
}

export default function ClientTrend({ trend, theme }: ClientTrendProps) {
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

    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: isLight ? "rgba(31,35,40,0.1)" : "rgba(255,255,255,0.1)",
        textStyle: { color: textSecondary, fontSize: 10 }
      },
      legend: {
        show: true,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: textSecondary, fontSize: 10 },
        right: 10,
        top: 0
      },
      grid: { left: "30", right: "10", top: "40", bottom: "30", containLabel: false },
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
        axisLabel: { color: isLight ? "#6e7781" : "#545d68", fontSize: 9 },
        axisLine: { show: false }
      },
      series: [
        {
          name: "Wireless",
          type: "line",
          data: trend.map(t => t.wireless || 0),
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
          name: "Wired",
          type: "line",
          data: trend.map(t => t.wired || 0),
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Client Trend</h3>
      </div>
      <div className="flex-1 min-h-[140px]" ref={ref} />
    </div>
  );
}
