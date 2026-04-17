import type { NextApiRequest, NextApiResponse } from "next";
import { getClientSummary } from "../../lib/aggregator";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    res.status(200).json(await getClientSummary());
  } catch (error) {
    console.error("[/api/clients]", error);
    res.status(503).json({ message: "Data unavailable" });
  }
}
