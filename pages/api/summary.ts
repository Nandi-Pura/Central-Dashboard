import type { NextApiRequest, NextApiResponse } from "next";
import { getSummary } from "../../lib/aggregator";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const data = await getSummary();
    res.status(200).json(data);
  } catch (error) {
    console.error("[/api/summary]", error);
    res.status(503).json({ message: "Data unavailable" });
  }
}
