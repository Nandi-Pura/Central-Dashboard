import axios, { AxiosInstance } from "axios";
import { TokenManager } from "./TokenManager";

type ArubaListResponse<T> = {
  devices?: T[];
  clients?: T[];
  events?: T[];
  data?: T[];
};

export class ArubaClient {
  private client: AxiosInstance;

  constructor(private tokenManager: TokenManager) {
    this.client = axios.create({
      baseURL: process.env.ARUBA_BASE_URL || "https://apigw-prod2.central.arubanetworks.com",
      timeout: 15000,
      headers: {
        "Content-Type": "application/json"
      }
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await this.tokenManager.getValidToken();
      if (token) {
        console.log(`[ArubaClient] Request: ${config.url} using token: ${token.substring(0, 8)}...`);
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 Unauthorized and not already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          console.error(`[ArubaClient] [AUTONOMOUS] 401 Unauthorized detected. Attempting self-healing...`);
          
          try {
            // 1. Clear the stale token
            await this.tokenManager.clearCachedToken();
            
            // 2. Acquire a fresh one
            const newToken = await this.tokenManager.getValidToken();
            
            if (newToken) {
              // 3. Update header and retry
              console.log(`[ArubaClient] [AUTONOMOUS] New token acquired. Retrying original request...`);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (retryError: any) {
            console.error(`[ArubaClient] [FAILURE] Self-healing failed: ${retryError.message}`);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async getList<T>(path: string): Promise<T[]> {
    try {
      const response = await this.client.get<ArubaListResponse<T>>(path);
      const payload = response.data as any; // Cast to any to check dynamic keys
      return payload.devices ?? payload.clients ?? payload.events ?? payload.aps ?? payload.switches ?? payload.gateways ?? payload.labels ?? payload.sites ?? payload.networks ?? payload.top_n ?? payload.bssids ?? payload.data ?? [];
    } catch (error: any) {
      console.error(`[ArubaClient] Failed on ${path}: ${error?.message || String(error)}`);
      if (error.response?.data) {
        console.error(`[ArubaClient] Error Detail:`, JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  getAccessPoints() {
    return this.getList<any>("/monitoring/v2/aps?show_resource_details=true&calculate_client_count=true");
  }

  getSwitches() {
    return this.getList<any>("/monitoring/v1/switches?calculate_client_count=true&show_resource_details=true");
  }

  getGateways() {
    return this.getList<any>("/monitoring/v1/gateways?calculate_client_count=true&show_resource_details=true");
  }

  getClients() {
    return this.getList<any>("/monitoring/v1/clients/wireless?calculate_total=true");
  }

  getWiredClients() {
    return this.getList<any>("/monitoring/v1/clients/wired?calculate_total=true");
  }

  getEvents() {
    return this.getList<any>("/monitoring/v2/events?sort=-timestamp&calculate_total=true");
  }

  getLabels() {
    return this.getList<any>("/central/v1/labels?calculate_total=true");
  }

  getSites() {
    return this.getList<any>("/central/v2/sites?calculate_total=true");
  }

  getBandwidthUsage() {
    return this.client.get("/monitoring/v1/clients/bandwidth_usage").then(r => r.data);
  }

  getTopNBandwidth() {
    return this.client.get("/monitoring/v1/clients/bandwidth_usage/topn").then((r: any) => r.data.clients || r.data.top_n || []);
  }

  getClientCount() {
    return this.client.get("/monitoring/v1/clients/count").then(r => r.data);
  }

  // --- PHASE 2 FINAL METHODS ---

  getBssids() {
    return this.getList<any>("/monitoring/v2/bssids?calculate_total=true");
  }

  getApRfSummary(serial: string, band: string = "5") {
    return this.client.get(`/monitoring/v3/aps/${serial}/rf_summary?band=${band}`).then(r => r.data);
  }

  getTopNApBandwidth() {
    return this.client.get("/monitoring/v2/aps/bandwidth_usage/topn").then((r: any) => r.data.aps || r.data.top_n || []);
  }

  getNetworksList() {
    return this.getList<any>("/monitoring/v2/networks?calculate_client_count=true");
  }

  getFilteredEvents(type: string, limit: number = 20) {
    return this.getList<any>(`/monitoring/v2/events?device_type=${encodeURIComponent(type)}&sort=+timestamp&calculate_total=true&limit=${limit}`);
  }

  getAppRfTopStats(serial: string) {
    return this.client.get(`/apprf/datapoints/v2/topn_stats?serial=${serial}`).then(r => r.data);
  }

  getSwitchesEnhanced() {
    return this.getList<any>("/monitoring/v1/switches?calculate_total=true&show_resource_details=true&calculate_client_count=true");
  }

  getTopNSwitchBandwidth() {
    return this.client.get("/monitoring/v1/switches/bandwidth_usage/topn").then(r => r.data.top_n || []);
  }

  getGlobalAppRfStats(limit: number = 5) {
    const now = Math.floor(Date.now() / 1000);
    const start = now - (3600 * 2); // Last 2 hours
    return this.client.get(`/apprf/datapoints/v2/topn_stats?limit=${limit}&start_time=${start}&end_time=${now}`).then(r => {
      const topN = r.data.result;
      console.log(`[AppRF] result keys:`, JSON.stringify(Object.keys(topN || {})));
      // Fallback chain: specific apps → categories → web reputation
      return topN?.app_id?.length > 0
        ? topN.app_id
        : topN?.app_cat?.length > 0
        ? topN.app_cat
        : topN?.web_rep?.length > 0
        ? topN.web_rep
        : [];
    });
  }

  getSwitchPorts(serial: string) {
    return this.client.get(`/monitoring/v1/switches/${serial}/ports`).then(r => r.data.ports || []);
  }
}
