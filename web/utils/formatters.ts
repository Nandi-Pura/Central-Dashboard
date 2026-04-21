/**
 * Formats a value in bytes to a human-readable unit (base 1024).
 * Rounds to 2 decimal places as per requirement.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (!bytes || isNaN(bytes)) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  // Guard against array bounds
  const unitIndex = Math.min(i, units.length - 1);
  const val = bytes / Math.pow(1024, unitIndex);
  
  return `${val.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Formats a throughput rate (bytes) to a human-readable bit rate.
 * Requirement: Convert bytes -> bits (x8) then format to Kbps, Mbps, Gbps.
 * Uses base 1024 as requested.
 */
export function formatThroughput(bytes: number): string {
  if (bytes === 0) return "0 bps";
  if (!bytes || isNaN(bytes)) return "0 bps";

  const bits = bytes * 8;
  const units = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];
  const i = Math.floor(Math.log(bits) / Math.log(1024));
  
  const unitIndex = Math.min(i, units.length - 1);
  const val = bits / Math.pow(1024, unitIndex);
  
  return `${val.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Returns only the value part of the formatted bytes (for charts)
 */
export function getByteValue(bytes: number): number {
  if (bytes === 0) return 0;
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Number((bytes / Math.pow(1024, i)).toFixed(2));
}

/**
 * Returns only the unit part of the formatted bytes (for charts)
 */
export function getByteUnit(bytes: number): string {
  if (bytes === 0) return "B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return units[Math.min(i, units.length - 1)];
}
