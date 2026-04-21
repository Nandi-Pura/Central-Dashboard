import React, { useState } from "react";
import Link from "next/link";

const navItems = [
  { id: "overview", label: "Overview", icon: "⬡", active: true },
  { id: "devices", label: "Devices", icon: "⊕", badge: null },
  { id: "clients", label: "Clients", icon: "◎", badge: null },
  { id: "health", label: "Network Health", icon: "♡", badge: null },
  { id: "alerts", label: "Alerts & Events", icon: "⚡", badge: 3 },
  { id: "traffic", label: "Traffic Analytics", icon: "⟳", badge: null },
  { id: "rf", label: "RF Analytics", icon: "⊛", badge: null },
  { id: "ai", label: "AI Insights", icon: "✦", badge: null },
  { id: "reports", label: "Reports", icon: "≡", badge: null }
];

interface LayoutProps {
  children: React.ReactNode;
  freshness?: { dataAge: number; lastPollTime: string } | null;
  isLoading?: boolean;
  isError?: boolean;
}

export default function Layout({ children, freshness, isLoading, isError }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("overview");
  const [searchVal, setSearchVal] = useState("");

  const freshnessLabel = () => {
    if (!freshness) return "Loading...";
    const mins = Math.round(freshness.dataAge);
    if (mins <= 2) return "Near Real-Time";
    return `Updated ${mins} min ago`;
  };

  const freshnessColor = () => {
    if (!freshness) return "text-slate-500";
    if (freshness.dataAge <= 5) return "text-emerald-400";
    if (freshness.dataAge <= 15) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* SIDEBAR */}
      <aside
        className="flex flex-col shrink-0 h-full border-r transition-all duration-300 shadow-xl z-50"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--bg-secondary)",
          borderColor: "var(--border-subtle)"
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b transition-colors" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            A
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold leading-none" style={{ color: "var(--text-primary)" }}>Central</div>
              <div className="text-xs leading-none mt-0.5" style={{ color: "var(--text-muted)" }}>Observability</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto transition-colors p-1 rounded hover:bg-black/5"
            style={{ fontSize: "10px", color: "var(--text-muted)" }}
          >
            {collapsed ? "▶" : "◀"}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`sidebar-item w-full text-left ${activeItem === item.id ? "active" : ""}`}
              title={collapsed ? item.label : ""}
            >
              <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="badge-critical text-[10px] px-1.5 py-0.5">{item.badge}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-3 border-t transition-colors" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>© 2025 Central NOC v2.0</div>
          </div>
        )}
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TOP HEADER */}
        <header
          className="flex items-center gap-4 px-6 h-16 shrink-0 border-b backdrop-blur-md z-40 transition-colors"
          style={{
            background: "var(--bg-header)",
            borderColor: "var(--border-subtle)"
          }}
        >
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>⌕</span>
            <input
              type="text"
              placeholder="Search devices, sites, clients..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500/30 shadow-inner"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)"
              }}
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select className="text-xs px-3 py-1.5 rounded-lg border transition-colors outline-none cursor-pointer" style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <option>All Sites</option>
              <option>Site A</option>
              <option>Site B</option>
            </select>
            <select className="text-xs px-3 py-1.5 rounded-lg border transition-colors outline-none cursor-pointer" style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <option>Last 24h</option>
              <option>Last 1h</option>
              <option>Last 6h</option>
              <option>Last 7d</option>
            </select>
          </div>

          {/* Separator */}
          <div className="w-px h-6" style={{ background: "var(--divider)" }} />

          {/* Freshness indicator */}
          <div className="flex items-center gap-2">
            <span className={`status-dot ${isLoading ? "warning" : isError ? "critical" : "healthy"}`} />
            <span className={`text-xs font-medium transition-colors ${freshnessColor()}`}>
              {isError ? "Data Delayed" : freshnessLabel()}
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md shadow-indigo-500/10"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>N</div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
