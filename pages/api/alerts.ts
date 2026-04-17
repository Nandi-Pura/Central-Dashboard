import type { NextApiRequest, NextApiResponse } from "next";
import { getAlertsSummary } from "../../lib/aggregator";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    res.status(200).json(await getAlertsSummary());
  } catch (error) {
    console.error("[/api/alerts]", error);
    res.status(503).json({ message: "Data unavailable" });
  }
}
