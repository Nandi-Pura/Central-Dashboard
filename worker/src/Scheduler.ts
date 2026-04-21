import { ArubaClient } from "./arubaClient";
import { writeApi, Point } from "./influx";
import { RateLimiter } from "./RateLimiter";
import type { Redis } from "ioredis";

export class Scheduler {
  constructor(
    private client: ArubaClient,
    private rateLimiter: RateLimiter,
    private redis: Redis
  ) {}

  public start() {
    console.log("[Scheduler] Starting periodic jobs (Optimized)...");

    // High Priority: Token Health & Proactive Refresh - Every 5 Minutes
    setInterval(() => this.tokenProactiveRefresh(), 5 * 60 * 1000);

    // Consolidated Task: Full Snapshot & InfluxDB Update - Every 5 Minutes
    // This consolidated approach ensures we stay under the 5,000 API hits/day limit.
    setInterval(() => this.runDashboardSummaryUpdate(), 30 * 60 * 1000);
    
    // Force Refresh Listener (Checks Redis every 10s for UI manual trigger)
    setInterval(async () => {
        const force = await this.redis.get("aruba_force_refresh");
        if (force === "true") {
            console.log("[Scheduler] Signal Received: Manual Force Refresh detected from UI.");
            await this.redis.del("aruba_force_refresh");
            this.runDashboardSummaryUpdate();
        }
    }, 10000);

    // Initial run
    setTimeout(() => {
      this.tokenProactiveRefresh();
      this.runDashboardSummaryUpdate();
    }, 1000);
  }

  private async tokenProactiveRefresh() {
    try {
      // Accessing tokenManager via client casting (it's public in ArubaClient)
      await (this.client as any).tokenManager.proactiveRefreshCheck();
    } catch (e: any) {
      console.error("[Scheduler] Proactive Token Refresh failed:", e.message);
    }
  }

  private async updateTrendHistory(clients: number, wireless: number, wired: number, rx: number, tx: number) {
    const TREND_KEY = "aruba_trend_history";
    const MAX_POINTS = 48; // 24 hours (2 points/hr * 24)
    const now = new Date().toISOString();
    
    // Get existing
    const existingRaw = await this.redis.get(TREND_KEY);
    let history = existingRaw ? JSON.parse(existingRaw) : [];
    
    // Add new point
    history.push({ timestamp: now, clients, wireless, wired, rx, tx });
    
    // Keep last N
    if (history.length > MAX_POINTS) history = history.slice(-MAX_POINTS);
    
    // Save back
    await this.redis.set(TREND_KEY, JSON.stringify(history));
    return history;
  }

  private async updateSsidTrendHistory(ssidDist: {ssid: string, count: number}[]) {
    const SSID_TREND_KEY = "aruba_ssid_trend_history";
    const MAX_POINTS = 48; // 24 hours
    const now = new Date().toISOString();
    
    const existingRaw = await this.redis.get(SSID_TREND_KEY);
    let history = existingRaw ? JSON.parse(existingRaw) : [];
    
    // Only store top 5 to keep it clean
    history.push({ timestamp: now, distribution: ssidDist.slice(0, 5) });
    if (history.length > MAX_POINTS) history = history.slice(-MAX_POINTS);
    
    await this.redis.set(SSID_TREND_KEY, JSON.stringify(history));
    return history;
  }

  private async runDashboardSummaryUpdate() {
    if (!(await this.rateLimiter.acquire(5))) return;
    console.log("[Scheduler] Building Dashboard Summary (Consolidated Cycle)...");

    const now = Date.now();
    const data: any = {
      healthScore: 100, healthLevel: "excellent",
      lastPollTime: new Date(now).toISOString(),
      dataAge: 0, summary: "Live dashboard telemetry from Aruba Central",
      aps: { up: 0, down: 0, total: 0, uplinkDown: 0 },
      switches: { up: 0, down: 0, total: 0 },
      gateways: { online: 0, offline: 0, total: 0 },
      clients: { connected: 0, wireless: 0, wired: 0, trend: [] },
      traffic: { rxBytes: 0, txBytes: 0, totalBytes: 0, trend: [] },
      kpis: { uptime: 100 }, alerts: [],
      aiInsights: [{ type: "info", message: "Fetching live insights from Aruba Central..." }],
      ssidDistribution: [],
      rfHealth: { channelUtil24: 0, channelUtil5: 0, interference: 0, noiseFloor: 0, retryRate: 0 },
      topApps: [], topAps: [], topClients: [], networkDevices: [],
      clientList: []
    };

    try {
      const results = await Promise.allSettled([
        this.client.getGateways(),              // 0
        this.client.getAccessPoints(),          // 1
        this.client.getEvents(),                // 2
        this.client.getSites(),                 // 3
        this.client.getLabels(),                // 4
        this.client.getClients(),               // 5
        this.client.getWiredClients(),          // 6
        this.client.getTopNBandwidth(),         // 7
        this.client.getTopNApBandwidth(),       // 8
        this.client.getTopNSwitchBandwidth(),   // 9
        this.client.getSwitchesEnhanced(),      // 10
        this.client.getNetworksList(),          // 11
        this.client.getGlobalAppRfStats()       // 12
      ]);

      const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value : null;

      const liveGateways    = val(0);
      const liveAps         = val(1);
      const liveEvents      = val(2);
      const sites           = val(3);
      const labels          = val(4);
      const wirelessClients = val(5);
      const wiredClients    = val(6);
      const clientUsage     = val(7);
      const apUsage         = val(8);
      const switchUsage     = val(9);
      const switchesFull    = val(10);
      const networks        = val(11);
      const topAppsRaw      = val(12);

      // Debug: print full AppRF response shape
      const appRfResult12 = results[12] as any;
      if (appRfResult12?.status === 'rejected') {
        console.error(`[Scheduler] AppRF call FAILED:`, appRfResult12.reason?.response?.data || appRfResult12.reason?.message);
      } else {
        console.log(`[Scheduler] AppRF top_n.app_id returned ${topAppsRaw?.length ?? 0} items. Raw val(12):`, JSON.stringify(topAppsRaw?.slice(0,1) ?? null));
      }

      // --- InfluxDB Recording: Alerts ---
      if (liveEvents) {
        for (const event of liveEvents) {
          const point = new Point("alerts")
            .tag("severity", String(event.severity || "info"))
            .tag("category", String(event.category || "general"))
            .stringField("message", String(event.description || "No description"))
            .booleanField("acknowledged", false);
          writeApi.writePoint(point);
        }
      }

      // --- Transformation & InfluxDB Recording: Gateways ---
      const transformedGateways = (liveGateways || []).map((g: any) => {
        const isUp = (g.status === "Up" || g.status === "online");
        const point = new Point("device_status")
          .tag("device_id", String(g.serial || "unknown"))
          .tag("model", String(g.model || "unknown"))
          .tag("type", "GATEWAY")
          .intField("status_code", isUp ? 1 : 0)
          .intField("uptime_seconds", Number(g.uptime) || 0);
        writeApi.writePoint(point);

        return {
          id: g.name || g.serial, type: "Gateway", model: g.model, serial: g.serial, macAddress: g.macaddr, ipAddress: g.ip_address,
          cpu: g.cpu_utilization !== undefined ? `${g.cpu_utilization}%` : "-",
          mem: g.mem_total ? `${Math.round(((g.mem_total - g.mem_free) / g.mem_total) * 100)}%` : "-",
          uptime: g.uptime, status: isUp ? "Up" : "Down", site: g.site, label: g.label,
          firmware: g.firmware_version || "", clientCount: g.client_count || 0
        };
      });

      // --- Transformation & InfluxDB Recording: APs ---
      let apUp = 0; let apDown = 0;
      const transformedAps = (liveAps || []).map((a: any) => {
        const isUp = (a.status === "Up" || a.status === "online");
        if (isUp) apUp++; else apDown++;

        const point = new Point("device_status")
          .tag("device_id", String(a.serial || "unknown"))
          .tag("model", String(a.model || "unknown"))
          .tag("type", "AP")
          .intField("status_code", isUp ? 1 : 0)
          .intField("uptime_seconds", Number(a.uptime) || 0);
        writeApi.writePoint(point);

        const memTotal = a.mem_total || 0;
        const memFree = a.mem_free || 0;
        const memUsage = memTotal > 0 ? Math.round(((memTotal - memFree) / memTotal) * 100) : 0;
        return {
          id: a.name || a.serial, type: "AP", model: a.model, serial: a.serial, macAddress: a.macaddr, ipAddress: a.ip_address || a.ip_addr,
          cpu: a.cpu_utilization !== undefined ? `${a.cpu_utilization}%` : "-",
          mem: memUsage > 0 ? `${memUsage}%` : "-",
          uptime: a.uptime, status: isUp ? "Up" : "Down",
          site: a.site, label: a.label, radios: (a.radios || []).map((r: any) => r.radio_name || r.band),
          firmware: a.firmware_version || "", clientCount: a.client_count || 0
        };
      });

      // Transform Switches
      let swUp = 0; let swDown = 0;
      const transformedSwitches = (switchesFull || []).map((s: any) => {
        const isUp = (s.status === "Up" || s.status === "online");
        if (isUp) swUp++; else swDown++;

        const point = new Point("device_status")
          .tag("device_id", String(s.serial || "unknown"))
          .tag("model", String(s.model || "unknown"))
          .tag("type", "SWITCH")
          .intField("status_code", isUp ? 1 : 0)
          .intField("uptime_seconds", Number(s.uptime) || 0);
        writeApi.writePoint(point);

        const cpu = s.cpu_utilization !== undefined ? `${s.cpu_utilization}%` : "-";
        let mem = "-";
        if (s.memory_utilization !== undefined) mem = `${s.memory_utilization}%`;
        else if (s.mem_total !== undefined) mem = `${s.mem_total}%`;
        
        return {
          id: s.name || s.serial, type: "Switch", model: s.model, serial: s.serial, macAddress: s.macaddr, ipAddress: s.ip_address,
          cpu, mem, uptime: s.uptime, status: isUp ? "Up" : "Down",
          site: s.site, label: s.label, clientCount: s.client_count || 0,
          firmware: s.firmware_version || ""
        };
      });
        
      data.networkDevices = [...transformedGateways, ...transformedAps, ...transformedSwitches];

      // Influx Health
      const healthPoint = new Point("network_health")
        .tag("site", "default")
        .intField("ap_up", apUp)
        .intField("ap_down", apDown)
        .intField("sw_up", swUp)
        .intField("sw_down", swDown)
        .intField("gateway_count", transformedGateways.length);
      writeApi.writePoint(healthPoint);

      // Update Dashboard Counts
      const gatewayUp = transformedGateways.filter((g: any) => g.status === "Up").length;
      data.gateways = { online: gatewayUp, offline: transformedGateways.length - gatewayUp, total: transformedGateways.length };
      data.aps = { up: apUp, down: apDown, total: (apUp + apDown) };
      data.switches = { up: swUp, down: swDown, total: (swUp + swDown) };

      // Update Traffic
      try {
        const bw = await this.client.getBandwidthUsage();
        let rxRaw = bw?.total_rx || bw?.rx_usage || 0;
        let txRaw = bw?.total_tx || bw?.tx_usage || 0;

        if (rxRaw === 0 && txRaw === 0 && clientUsage?.length > 0) {
            clientUsage.forEach((c: any) => {
                rxRaw += (c.rx_usage || c.rx_data_bytes || 0);
                txRaw += (c.tx_usage || c.tx_data_bytes || 0);
            });
        }

        data.traffic.rxBytes = rxRaw;
        data.traffic.txBytes = txRaw;
        data.traffic.totalBytes = (rxRaw + txRaw);
        data.traffic.throughputBytesPerSec = Math.round((rxRaw + txRaw) / 1800); // 30 min interval
        
        // Influx Client/Traffic Stats (Keep bytes for InfluxDB as standard)
        const clientStatPoint = new Point("client_stats")
          .tag("ssid", "global")
          .tag("band", "all")
          .intField("connected_count", (wirelessClients?.length || 0) + (wiredClients?.length || 0))
          .intField("traffic_rx", rxRaw)
          .intField("traffic_tx", txRaw);
        writeApi.writePoint(clientStatPoint);
      } catch (e) {
        console.error("[Scheduler] Throughput calculation failed", e);
      }

      await writeApi.flush();
        
      // Top N processing
      if (clientUsage?.length > 0) {
        data.topClients = clientUsage.map((c: any) => {
          const totalBytes = (c.rx_data_bytes || 0) + (c.tx_data_bytes || 0);
          return { name: c.name || c.macaddr, mac: c.macaddr, usage: totalBytes };
        }).slice(0, 5);
      }

      if (apUsage?.length > 0) {
        data.topAps = apUsage.map((a: any) => {
          const totalBytes = (a.rx_usage || a.rx_data_bytes || 0) + (a.tx_usage || a.tx_data_bytes || 0);
          return { name: a.name || a.serial, usage: totalBytes };
        }).slice(0, 5);
      }

      if (topAppsRaw?.length > 0) {
        data.topApps = topAppsRaw.map((app: any) => ({
          name: app.name || "Unknown App",
          rx: app.rx || 0,
          tx: app.tx || 0,
          pct: parseFloat(String(app.percent_usage || "0%").replace("%", "")) || 0
        }));
      }

      if (liveEvents?.length > 0) {
        data.alerts = liveEvents.map((e: any) => {
          const ts = e.timestamp > 10000000000 ? e.timestamp : (e.timestamp || Date.now()/1000) * 1000;
          const sev = (e.severity?.toLowerCase() === "critical" || e.severity?.toLowerCase() === "major") ? "critical" : "warning";
          return { id: e.id || Math.random().toString(), message: e.description || e.event_type || "Network Event", severity: sev, timestamp: new Date(ts).toISOString(), count: 1 };
        });
      }

      const totalDevices = data.gateways.total + data.aps.total + data.switches.total;
      const totalOnline = data.gateways.online + data.aps.up + data.switches.up;
      if (totalDevices > 0) {
        data.healthScore = Math.round((totalOnline / totalDevices) * 100);
        data.healthLevel = data.healthScore >= 90 ? "excellent" : data.healthScore >= 70 ? "good" : "warning";
      }

      if (wirelessClients !== null || wiredClients !== null) {
        data.clients.wireless = wirelessClients?.length || 0; 
        data.clients.wired = wiredClients?.length || 0; 
        data.clients.connected = data.clients.wireless + data.clients.wired;
      }

      // Update Trend History
      const history = await this.updateTrendHistory(data.clients.connected, data.clients.wireless, data.clients.wired, data.traffic.rxBytes, data.traffic.txBytes);
      data.clients.trend = history.map((h: any) => ({ time: h.timestamp, count: h.clients, wireless: h.wireless || 0, wired: h.wired || 0 }));
      data.traffic.trend = history.map((h: any) => ({ time: h.timestamp, rxBytes: h.rx, txBytes: h.tx }));

      if (wirelessClients?.length > 0) {
        const ssids: { [key: string]: number } = {};
        wirelessClients.forEach((c: any) => { const ssid = c.network || c.ssid || "Other"; ssids[ssid] = (ssids[ssid] || 0) + 1; });
        data.ssidDistribution = Object.entries(ssids).map(([ssid, count]) => ({ ssid, count })).sort((a, b) => (b.count as number) - (a.count as number));
        const ssidHistory = await this.updateSsidTrendHistory(data.ssidDistribution);
        data.ssidTrend = ssidHistory;
      }

      // Final aggregation & 24h Summary
      const totalBytes24h = history.reduce((acc: number, h: any) => acc + (h.rx || 0) + (h.tx || 0), 0);
      data.traffic.totalBytes24h = totalBytes24h;

      const allClients = [
        ...(wirelessClients || []).map((c: any) => ({
          mac: c.macaddr, name: c.name || "Unknown", ip: c.ip_address, status: c.status || "Connected",
          type: "Wireless", ssid: c.network || c.ssid || "N/A", apName: c.associated_device_name || "N/A", signal: c.signal_strength || 0,
          os: c.os_type || "Generic Device", rx: (c.rx_data_bytes || 0), tx: (c.tx_data_bytes || 0)
        })),
        ...(wiredClients || []).map((c: any) => ({
          mac: c.macaddr, name: c.name || "Unknown", ip: c.ip_address, status: c.status || "Connected",
          type: "Wired", ssid: "Wired", apName: c.associated_device_name || "N/A", signal: 0,
          os: c.os_type || "Generic Device", rx: (c.rx_data_bytes || 0), tx: (c.tx_data_bytes || 0)
        }))
      ];
      data.clientList = allClients;

      // Prevent caching empty/corrupt state if auth failed
      const criticalDataPointCount = results.filter(r => r.status === "fulfilled").length;
      if (criticalDataPointCount < 3) {
        console.warn(`[Scheduler] Only ${criticalDataPointCount} API calls succeeded. Skipping cache update to prevent data wipe.`);
        return;
      }

      await this.redis.set("aruba_summary_cache", JSON.stringify(data), "EX", 3600);
      console.log(`[Scheduler] Consolidated Dashboard Summary cached successfully.`);
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 400) {
        console.error(`[Scheduler] CRITICAL AUTH FAILURE: ${e.response?.data?.error_description || e.message}`);
        console.error(`[Scheduler] Please verify ARUBA_ACCESS_TOKEN and REFRESH_TOKEN in .env`);
      } else {
        console.error("[Scheduler] Consolidated Summary Generation failed:", e.message);
      }
    }
  }
}
