import axios, { AxiosInstance } from "axios";
import { appConfig } from "@/lib/config";

type ArubaListResponse<T> = {
  devices?: T[];
  clients?: T[];
  events?: T[];
  data?: T[];
};

class ArubaClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: appConfig.arubaBaseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${appConfig.arubaApiKey}`,
        "Content-Type": "application/json"
      }
    });
  }

  private async getList<T>(path: string): Promise<T[]> {
    try {
      const response = await this.client.get<ArubaListResponse<T>>(path);
      const payload = response.data;
      return payload.devices ?? payload.clients ?? payload.events ?? payload.data ?? [];
    } catch (error) {
      console.error(`[Aruba API] Failed on ${path}`, error);
      return [];
    }
  }

  getAccessPoints() {
    return this.getList<Record<string, unknown>>("/monitoring/v2/aps");
  }

  getSwitches() {
    return this.getList<Record<string, unknown>>("/monitoring/v1/switches");
  }

  getSwitchPorts(serial: string) {
    return this.getList<Record<string, unknown>>(`/monitoring/v1/switches/${serial}/ports`);
  }

  getGateways() {
    return this.getList<Record<string, unknown>>("/monitoring/v1/gateways");
  }

  getClients() {
    return this.getList<Record<string, unknown>>("/monitoring/v1/clients/wireless");
  }

  getEvents() {
    return this.getList<Record<string, unknown>>("/central/v1/events");
  }
}

export const arubaClient = new ArubaClient();
