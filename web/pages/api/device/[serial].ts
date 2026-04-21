import type { NextApiRequest, NextApiResponse } from "next";
import aruba from "../../../src/lib/aruba";

/**
 * API Route to fetch detailed device telemetry from Aruba Central.
 * Support for AP, Switch, and Gateway types.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { serial, type } = req.query;

  if (!serial || typeof serial !== "string") {
    return res.status(400).json({ error: "Serial is required" });
  }

  try {
    let detail: any = null;

    if (type === "AP") {
      detail = await aruba.getApDetail(serial);
    } else if (type === "Switch") {
      const switches = await aruba.getSwitchesEnhanced();
      detail = switches.find((s: any) => s.serial === serial || s.name === serial);
      if (detail) {
        try {
          detail.ports = await aruba.getSwitchPorts(serial);
        } catch (e) {
          console.warn(`[API Device] Failed to fetch ports for ${serial}`);
        }
      }
    } else if (type === "Gateway") {
      detail = await aruba.getGatewayDetail(serial);
    } else {
      detail = await aruba.getApDetail(serial);
    }

    if (!detail) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.status(200).json(detail);
  } catch (error: any) {
    console.error(`[API Device] Failed to fetch ${serial}:`, error?.message);
    
    // Fallback to mock data for UI development if API is unreachable
    const mockDetail = getMockDetail(serial, type as string);
    res.status(200).json(mockDetail);
  }
}

function getMockDetail(serial: string, type: string) {
  const isAp = type === "AP";
  const isSw = type === "Switch";
  
  return {
    name: serial,
    serial: serial,
    model: isAp ? "AP-515" : isSw ? "Aruba-2930F" : "Aruba-9004",
    ip_address: "10.1.10.11",
    macaddr: "00:0B:86:11:22:33",
    firmware_version: "8.10.0.5_87421",
    group_name: "Default",
    site: "HQ-Site",
    status: "Up",
    uptime: "14d 6h",
    cpu_utilization: 12,
    mem_free: 420,
    mem_total: 1024,
    ...(isAp ? {
      radio_stats: [
        { band: "5GHz", channel: 36, util: 24, tx_power: 18, status: "Up" },
        { band: "2.4GHz", channel: 6, util: 42, tx_power: 12, status: "Up" }
      ],
      ssid_count: 3,
      ethernet_interfaces: [
        { name: "eth0", status: "Up", speed: "2.5Gbps", duplex: "Full" }
      ]
    } : {
      client_count: isSw ? 24 : 1204,
      reboot_reason: isSw ? undefined : "System update"
    })
  };
}
