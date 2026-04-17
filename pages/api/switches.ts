import type { NextApiRequest, NextApiResponse } from "next";
import { getSwitchSummary } from "../../lib/aggregator";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    res.status(200).json(await getSwitchSummary());
  } catch (error) {
    console.error("[/api/switches]", error);
    res.status(503).json({ message: "Data unavailable" });
  }
}
