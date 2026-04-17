type AlertItem = {
  id: string;
  message: string;
  severity: string;
  timestamp: string;
};

export default function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <section className="panel">
      <h3 className="font-medium">Recent alerts</h3>
      <div className="mt-3 space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-400">No alerts</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded border border-slate-800 p-3">
              <div className="flex justify-between gap-2">
                <p className="text-sm text-slate-200">{alert.message}</p>
                <span className="text-xs uppercase text-slate-400">{alert.severity}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{new Date(alert.timestamp).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
