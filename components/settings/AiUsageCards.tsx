"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

type AiUsageResponse =
  | {
      ok: true;
      accessMode: "off" | "pro" | "all";
      tier: "free" | "pro";
      periodStart: string;
      periodEnd: string;
      limit: number;
      used: number;
      remaining: number;
      promptTokens: number;
      completionTokens: number;
      allowed: boolean;
      percentUsed: number;
    }
  | { ok: false; error?: { code?: string; message?: string } };

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(Math.max(0, value || 0));

export default function AiUsageCards() {
  const [data, setData] = useState<AiUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/usage", { method: "GET" });
        const json = (await res.json()) as AiUsageResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, error: { message: "Failed to load AI usage." } });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const ui = useMemo(() => {
    if (!data || !data.ok) {
      return {
        tier: "free" as const,
        accessMode: "pro" as const,
        periodStart: "",
        periodEnd: "",
        limit: 0,
        used: 0,
        remaining: 0,
        promptTokens: 0,
        completionTokens: 0,
        allowed: false,
        percentUsed: 0,
        error: data && !data.ok ? data.error?.message ?? "Failed to load AI usage." : null,
      };
    }

    return { ...data, error: null };
  }, [data]);

  const title = "AI usage";
  const subtitle = "Track your monthly AI token usage and limits.";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardDescription>Monthly limit</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {loading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <>
                  <span className="text-lg font-bold">{formatNumber(ui.used)} / {formatNumber(ui.limit)} tokens</span>
                  <Badge
                    variant={ui.tier === "pro" ? "default" : "secondary"}
                    className={ui.tier === "pro" ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-100" : ""}
                  >
                    {ui.tier === "pro" ? "Pro" : "Free"}
                  </Badge>
                </>
              )}
            </CardTitle>
            {loading ? (
              <Skeleton className="h-4 w-56" />
            ) : ui.periodEnd ? (
              <CardDescription>Resets on {new Date(`${ui.periodEnd}T00:00:00Z`).toLocaleDateString()}</CardDescription>
            ) : (
              <CardDescription>Usage resets monthly.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : ui.error ? (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{ui.error}</div>
            ) : (
              <>
                <Progress value={ui.percentUsed} />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">Remaining</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(ui.remaining)}</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">Used</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{formatNumber(ui.used)}</div>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-brand-600" />
                    <p>
                      Token usage includes AI chat completions and embeddings used for context retrieval.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardDescription>Breakdown</CardDescription>
            <CardTitle className="text-lg font-bold">This month</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : ui.error ? (
              <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                {ui.error}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                  <span className="text-muted-foreground">Input (prompt)</span>
                  <span className="font-medium text-gray-900">{formatNumber(ui.promptTokens)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                  <span className="text-muted-foreground">Output (completion)</span>
                  <span className="font-medium text-gray-900">{formatNumber(ui.completionTokens)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium text-gray-900">{formatNumber(ui.used)}</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Access mode: <span className="font-medium text-gray-900">{ui.accessMode}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

