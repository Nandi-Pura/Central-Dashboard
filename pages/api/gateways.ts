import type { NextApiRequest, NextApiResponse } from "next";
import { getGatewaySummary } from "../../lib/aggregator";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    res.status(200).json(await getGatewaySummary());
  } catch (error) {
    console.error("[/api/gateways]", error);
    res.status(503).json({ message: "Data unavailable" });
  }
}
