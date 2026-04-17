import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type Props = {
  clientTrend: { timestamp: string; clients: number }[];
  ap: { up: number; down: number };
  ports: { active: number; error: number; unused: number };
};

export default function Charts({ clientTrend, ap, ports }: Props) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="panel xl:col-span-2">
        <h3 className="mb-2 font-medium">Client trend (24h)</h3>
        <ReactECharts
          style={{ height: 260 }}
          option={{
            xAxis: {
              type: "category",
              data: clientTrend.map((x) => new Date(x.timestamp).toLocaleTimeString())
            },
            yAxis: { type: "value" },
            tooltip: { trigger: "axis" },
            series: [{ type: "line", smooth: true, data: clientTrend.map((x) => x.clients) }]
          }}
        />
      </div>
      <div className="panel">
        <h3 className="mb-2 font-medium">AP status</h3>
        <ReactECharts
          style={{ height: 260 }}
          option={{
            series: [
              {
                type: "pie",
                radius: ["55%", "75%"],
                data: [
                  { value: ap.up, name: "Up" },
                  { value: ap.down, name: "Down" }
                ]
              }
            ]
          }}
        />
      </div>
      <div className="panel xl:col-span-3">
        <h3 className="mb-2 font-medium">Switch ports</h3>
        <ReactECharts
          style={{ height: 220 }}
          option={{
            xAxis: { type: "category", data: ["Active", "Error", "Unused"] },
            yAxis: { type: "value" },
            series: [
              {
                type: "bar",
                data: [ports.active, ports.error, ports.unused]
              }
            ]
          }}
        />
      </div>
    </section>
  );
}
