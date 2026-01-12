import net from "node:net";

const parseIPv4 = (ip: string): number[] | null => {
  if (net.isIP(ip) !== 4) return null;
  const parts = ip.split(".").map((value) => Number(value));
  if (parts.length !== 4) return null;
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts;
};

const expandIPv6 = (raw: string): number[] | null => {
  const ip = raw.split("%")[0]?.toLowerCase() ?? "";
  if (!ip) return null;
  if (net.isIP(ip) !== 6) return null;

  if (ip.startsWith("::ffff:")) {
    const v4 = ip.slice("::ffff:".length);
    const parsed = parseIPv4(v4);
    if (parsed) {
      return [0, 0, 0, 0, 0, 0xffff, (parsed[0] << 8) | parsed[1], (parsed[2] << 8) | parsed[3]];
    }
  }

  const halves = ip.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const right = halves[1] ? halves[1].split(":").filter(Boolean) : [];

  const parseHextets = (tokens: string[]) => {
    const out: number[] = [];
    for (const token of tokens) {
      if (!token) continue;
      if (!/^[0-9a-f]{1,4}$/.test(token)) return null;
      out.push(parseInt(token, 16));
    }
    return out;
  };

  const leftNums = parseHextets(left);
  const rightNums = parseHextets(right);
  if (!leftNums || !rightNums) return null;

  const total = leftNums.length + rightNums.length;
  if (total > 8) return null;

  const zerosToInsert = 8 - total;
  return [...leftNums, ...Array.from({ length: zerosToInsert }, () => 0), ...rightNums];
};

export function isPrivateOrReservedIp(ip: string): boolean {
  const v4 = parseIPv4(ip);
  if (v4) {
    const [a, b, c] = v4;

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10

    if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
    if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a === 198 && b === 51 && v4[2] === 100) return true; // 198.51.100.0/24
    if (a === 203 && b === 0 && v4[2] === 113) return true; // 203.0.113.0/24

    if (a >= 224) return true; // multicast/reserved/broadcast

    return false;
  }

  const v6 = expandIPv6(ip);
  if (!v6) return true; // fail closed for unparseable IPs

  const [h0, h1] = v6;
  const isUnspecified = v6.every((h) => h === 0);
  if (isUnspecified) return true; // ::

  const isLoopback = v6.slice(0, 7).every((h) => h === 0) && v6[7] === 1;
  if (isLoopback) return true; // ::1

  // IPv4-mapped (::ffff:0:0/96) → classify via embedded v4 hextets.
  const isV4Mapped = v6.slice(0, 5).every((h) => h === 0) && v6[5] === 0xffff;
  if (isV4Mapped) {
    const a = (v6[6] >> 8) & 0xff;
    const b = v6[6] & 0xff;
    const c = (v6[7] >> 8) & 0xff;
    const d = v6[7] & 0xff;
    return isPrivateOrReservedIp(`${a}.${b}.${c}.${d}`);
  }

  // Unique local: fc00::/7
  if ((h0 & 0xfe00) === 0xfc00) return true;

  // Link-local: fe80::/10
  if ((h0 & 0xffc0) === 0xfe80) return true;

  // Multicast: ff00::/8
  if ((h0 & 0xff00) === 0xff00) return true;

  // Documentation: 2001:db8::/32
  if (h0 === 0x2001 && h1 === 0x0db8) return true;

  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = String(hostname ?? "").trim().toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0") return true;
  if (host.endsWith(".local")) return true;
  return false;
}
