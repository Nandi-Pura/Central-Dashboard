import React, { useEffect, useState } from "react";
import { formatBytes } from "../utils/formatters";
import { StatusBadge, InfoRow, DeviceSection } from "./DeviceDetailDrawer";

interface ClientDetailDrawerProps {
  client: any | null;
  onClose: () => void;
}

export default function ClientDetailDrawer({ client, onClose }: ClientDetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [renderClient, setRenderClient] = useState<any | null>(null);

  useEffect(() => {
    if (client) {
      setRenderClient(client);
      const timer = setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = "hidden";
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setRenderClient(null), 300);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [client]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!renderClient) return null;

  const signalLevel = (s: number) => {
    if (s >= -60) return { label: "Excellent", color: "text-green-400" };
    if (s >= -70) return { label: "Good", color: "text-amber-400" };
    return { label: "Poor", color: "text-red-400" };
  };

  const sig = signalLevel(renderClient.signal || -65);

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] border-l z-[101] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${isVisible ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between backdrop-blur-md sticky top-0" style={{ background: "var(--bg-header)", borderColor: "var(--border-subtle)" }}>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>{renderClient.name || "Unknown Client"}</h2>
              <StatusBadge status="Up" />
            </div>
            <div className="text-xs font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>
              {renderClient.mac} • Wireless Client
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-all text-xl"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar">
          {/* Tabs */}
          <div className="flex gap-6 border-b -mx-6 px-6 mb-2" style={{ borderColor: "var(--border-subtle)" }}>
            <button className="pb-3 text-xs font-bold border-b-2" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>Overview</button>
            <button className="pb-3 text-xs font-bold transition-colors" style={{ color: "var(--text-muted)" }}>History</button>
            <button className="pb-3 text-xs font-bold transition-colors" style={{ color: "var(--text-muted)" }}>Security</button>
          </div>

          <DeviceSection title="Connection Details">
            <InfoRow label="SSID" value={renderClient.ssid || "Not Associated"} />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: "var(--text-muted)" }}>Signal Strength</span>
              <span className={`text-xs font-medium font-mono ${sig.color}`}>{renderClient.signal || -65} dBm ({sig.label})</span>
            </div>
            <InfoRow label="IP Address" value={renderClient.ip || "Unknown"} />
            <InfoRow label="AP Connected" value={renderClient.apName || "N/A"} />
            <InfoRow label="Status" value={renderClient.status || "Connected"} />
          </DeviceSection>

          <DeviceSection title="Traffic Usage">
            <InfoRow label="Downloaded (RX)" value={formatBytes(renderClient.rx || 0)} />
            <InfoRow label="Uploaded (TX)" value={formatBytes(renderClient.tx || 0)} />
            <InfoRow label="Client Type" value={renderClient.type || "Wireless"} />
          </DeviceSection>

          <DeviceSection title="Device Info">
            <InfoRow label="Operating System" value={renderClient.os || "Generic Device"} />
            <InfoRow label="MAC Address" value={renderClient.mac} />
          </DeviceSection>
        </div>

        {/* Footer */}
        <div className="p-4 border-t backdrop-blur-sm flex justify-end gap-3" style={{ background: "var(--bg-header)", borderColor: "var(--border-subtle)" }}>
          <button className="px-4 py-2 text-[10px] font-bold rounded transition-colors uppercase tracking-wider shadow-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            Disconnect
          </button>
          <button className="px-4 py-2 text-[10px] font-bold text-white rounded shadow-lg shadow-indigo-500/10 transition-all uppercase tracking-wider" style={{ background: "var(--accent)" }}>
            Locate Client
          </button>
        </div>
      </div>
    </>
  );
}
