import type { NextApiRequest, NextApiResponse } from "next";
import aruba from "../../src/lib/aruba";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [wirelessClients, wiredClients] = await Promise.all([
      aruba.getWirelessClients(),
      aruba.getWiredClients()
    ]);

    const transformedWireless = wirelessClients.map((c: any) => ({
      name: c.name || c.macaddr,
      mac: c.macaddr,
      ip: c.ip_address,
      type: "Wireless",
      status: "Up",
      ssid: c.ssid,
      signal: c.rssi,
      band: c.band,
      os: c.os_type,
      vendor: c.vendor,
      site: c.site,
      lastSeen: c.last_seen
    }));

    const transformedWired = wiredClients.map((c: any) => ({
      name: c.name || c.macaddr,
      mac: c.macaddr,
      ip: c.ip_address,
      type: "Wired",
      status: "Up",
      vlan: c.vlan,
      port: c.switch_port,
      os: c.os_type,
      vendor: c.vendor,
      site: c.site,
      lastSeen: c.last_seen
    }));

    const allClients = [...transformedWireless, ...transformedWired];

    res.status(200).json({
      clients: allClients,
      count: allClients.length,
      wirelessCount: wirelessClients.length,
      wiredCount: wiredClients.length
    });
  } catch (error: any) {
    console.error("[Clients API] Fetch failed:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
}
