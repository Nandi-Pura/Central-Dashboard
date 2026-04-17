import type { NextApiRequest, NextApiResponse } from "next";
import { getApSummary } from "../../lib/aggregator";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    res.status(200).json(await getApSummary());
  } catch (error) {
    console.error("[/api/aps]", error);
    res.status(503).json({ message: "Data unavailable" });
  }
}
