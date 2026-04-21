import React from "react";

export default function ReportsView() {
  const reports = [
    { name: "Daily Network Summary", schedule: "Every day 06:00", last: "Today 06:00", status: "Ready", format: "PDF" },
    { name: "Weekly Executive Report", schedule: "Every Monday", last: "Mon, Apr 14", status: "Ready", format: "PDF" },
    { name: "Monthly Capacity Report", schedule: "1st of month", last: "Apr 1", status: "Ready", format: "XLSX" },
    { name: "Incident Summary", schedule: "On-demand", last: "Apr 15, 14:32", status: "Ready", format: "PDF" },
    { name: "Client Usage Analysis", schedule: "Weekly", last: "Apr 14", status: "Generating", format: "PDF" },
  ];

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">Scheduled and on-demand network reports</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
          + Generate Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Reports", value: 24, color: "#818cf8" },
          { label: "This Month", value: 8, color: "#34d399" },
          { label: "Scheduled", value: 4, color: "#38bdf8" },
        ].map((s, i) => (
          <div key={i} className="kpi-card text-center">
            <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reports table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Available Reports</h3>
        <div className="space-y-3">
          {reports.map((r, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <span className="text-xs font-bold text-indigo-400">{r.format}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{r.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{r.schedule} · Last: {r.last}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "Ready" ? "badge-info" : "badge-warning"}`}>
                  {r.status}
                </span>
                <button className="btn-ghost text-xs">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
