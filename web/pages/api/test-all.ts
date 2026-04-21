import type { NextApiRequest, NextApiResponse } from "next";
import aruba from "../../src/lib/aruba";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const endpoints = [
    "/monitoring/v1/gateways?calculate_total=true",
    "/central/v1/labels?calculate_total=true",
    "/central/v2/sites?calculate_total=true",
    "/monitoring/v1/clients/wireless?calculate_total=true",
    "/monitoring/v1/clients/wired?calculate_total=true",
    "/monitoring/v1/clients/bandwidth_usage",
    "/monitoring/v1/clients/bandwidth_usage/topn",
    "/monitoring/v1/clients/count"
  ];

  const results: any = {};
  const token = await (aruba as any).tokenManager.getValidToken();
  const baseUrl = process.env.ARUBA_BASE_URL;

  for (const path of endpoints) {
    try {
      const response = await axios.get(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results[path] = {
        status: response.status,
        count: response.data.total ?? response.data.count ?? (response.data.devices?.length || response.data.clients?.length),
        sample: JSON.stringify(response.data).substring(0, 1000)
      };
    } catch (err: any) {
      results[path] = {
        status: err.response?.status || 500,
        error: err.response?.data || err.message
      };
    }
  }

  res.status(200).json(results);
}
