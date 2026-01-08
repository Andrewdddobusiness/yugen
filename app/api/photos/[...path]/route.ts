import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/requestGuards";
import { recordApiRequestMetric } from "@/lib/telemetry/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const startedAt = performance.now();
  let status = 500;

  const respond = <T extends Response>(response: T) => {
    status = response.status;
    return response;
  };

  try {
    const ip = getClientIp(request);
    const limiter = rateLimit(`photos:get:${ip}`, { windowMs: 60_000, max: 120 });
    if (!limiter.allowed) {
      return respond(NextResponse.json(
        { ok: false, error: { code: "rate_limited", message: "Too many requests. Please slow down." } },
        { status: 429, headers: rateLimitHeaders(limiter) }
      ));
    }

    const photoPath = params.path.join("/");
    if (!photoPath || photoPath.length > 512) {
      return respond(new NextResponse("Photo not available", { status: 404 }));
    }
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const clampInt = (value: string | null, fallback: number, min: number, max: number) => {
      const parsed = Number.parseInt(value ?? "", 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    };

    const maxHeightPx = clampInt(searchParams.get("maxHeightPx"), 1000, 1, 2000);
    const maxWidthPx = clampInt(searchParams.get("maxWidthPx"), 1000, 1, 2000);

    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return respond(new NextResponse("Internal server error", { status: 500 }));
    }
    
    // Construct the Google Places API URL
    const apiUrl = `https://places.googleapis.com/v1/${photoPath}/media`;
    const apiParams = new URLSearchParams({
      maxHeightPx: String(maxHeightPx),
      maxWidthPx: String(maxWidthPx),
      key: apiKey,
    });

    // Fetch from Google Places API with proper headers
    const response = await fetch(`${apiUrl}?${apiParams}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
    });

    if (!response.ok) {
      console.error('Google Places photo fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        photoPath,
      });
      
      // Return a placeholder or error response
      return respond(new NextResponse('Photo not available', { status: 404 }));
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return respond(new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    }));

  } catch (error) {
    console.error('Error proxying Google Places photo:', error);
    return respond(new NextResponse('Internal server error', { status: 500 }));
  } finally {
    void recordApiRequestMetric({
      userId: null,
      route: "/api/photos",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}
