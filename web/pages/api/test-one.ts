import type { NextApiRequest, NextApiResponse } from "next";
import aruba from "../../src/lib/aruba";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await (aruba as any).tokenManager.getValidToken();
  const baseUrl = process.env.ARUBA_BASE_URL;
  const path = req.query.path as string || "/monitoring/v1/clients/wireless?calculate_total=true";

  try {
    const response = await axios.get(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.status(200).json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json(err.response?.data || err.message);
  }
}
