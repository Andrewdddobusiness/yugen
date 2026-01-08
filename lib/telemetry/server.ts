import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

type ApiRequestMetricInput = {
  userId: string | null;
  route: string;
  method: string;
  status: number;
  durationMs: number;
};

export const recordApiRequestMetric = async (input: ApiRequestMetricInput) => {
  try {
    const admin = createAdminClient();
    await admin.rpc("record_api_request_metric", {
      user_uuid: input.userId,
      route: input.route,
      method: input.method,
      status: input.status,
      duration_ms: Math.round(input.durationMs),
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // Never fail user requests because telemetry couldn't be recorded.
  }
};

type WebVitalsEventInput = {
  userId: string | null;
  pathname: string;
  metricName: string;
  metricValue: number;
  rating: string | null;
  delta: number | null;
  metricId: string | null;
  navigationType: string | null;
  userAgent: string | null;
};

export const recordWebVitalsEvent = async (input: WebVitalsEventInput) => {
  try {
    const admin = createAdminClient();
    await admin.rpc("record_web_vitals_event", {
      user_uuid: input.userId,
      pathname: input.pathname,
      metric_name: input.metricName,
      metric_value: input.metricValue,
      rating: input.rating,
      delta: input.delta,
      metric_id: input.metricId,
      navigation_type: input.navigationType,
      user_agent: input.userAgent,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // Never fail user requests because telemetry couldn't be recorded.
  }
};

