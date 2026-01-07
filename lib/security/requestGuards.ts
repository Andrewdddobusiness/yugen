import type { NextRequest } from "next/server";

export const isSameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === request.nextUrl.origin;
};

export const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const first = forwardedFor.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || request.ip || "unknown";
};

