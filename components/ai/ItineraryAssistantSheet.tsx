"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Loader2, AlertTriangle, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useQueryClient } from "@tanstack/react-query";
import type { Operation } from "@/lib/ai/itinerary/schema";

const readJsonResponse = async <T,>(res: Response): Promise<T> => {
  const bodyText = await res.text();
  const trimmed = bodyText.trim();

  if (!trimmed) {
    throw new Error(`Unexpected empty response (HTTP ${res.status}). Please try again.`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    const looksLikeHtml = /^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed);
    const preview = looksLikeHtml ? null : trimmed.replace(/\s+/g, " ").slice(0, 180);
    const message = preview
      ? `Unexpected server response (HTTP ${res.status}): ${preview}`
      : `Unexpected server response (HTTP ${res.status}). Please try again.`;

    console.error("[itinerary-assistant] Non-JSON response:", {
      status: res.status,
      statusText: res.statusText,
      preview,
      error,
    });

    throw new Error(message);
  }
};

type PlanResponse = {
  ok: true;
  mode: "plan";
  assistantMessage: string;
  operations: Operation[];
  previewLines: string[];
  requiresConfirmation: boolean;
};

type ImportSource = {
  provider: "youtube" | "tiktok" | "instagram" | "tripadvisor" | "web";
  url: string;
  canonicalUrl: string;
  externalId?: string;
  title?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  blocked?: boolean;
  blockedReason?: string;
};

type DraftSourcesPreview = {
  sources: ImportSource[];
  pendingClarificationsCount?: number;
};

type ImportResponse = {
  ok: true;
  mode: "import";
  assistantMessage: string;
  operations: Operation[];
  previewLines: string[];
  requiresConfirmation: boolean;
  sources: ImportSource[];
  pendingClarificationsCount?: number;
};

type ApplyResponse = {
  ok: true;
  mode: "apply";
  assistantMessage: string;
  applied: { ok: boolean; operation: Operation; error?: string }[];
  bootstrap?: any;
};

type HistoryResponse = {
  ok: true;
  threadId?: string;
  messages: ChatMessage[];
  summary?: string | null;
  draftOperations?: Operation[] | null;
  draftSources?: DraftSourcesPreview | null;
};

type ThreadListItem = {
  ai_itinerary_thread_id: string;
  thread_key: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

type ThreadsResponse = {
  ok: true;
  threads: ThreadListItem[];
};

type CreateThreadResponse = {
  ok: true;
  thread: ThreadListItem;
};

type ErrorResponse = {
  ok: false;
  error?: { message?: string; code?: string };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const examples = [
  "Move McDonald's to Tuesday at 7:00-8:00 PM and add note \"quick dinner\".",
  "Add Roscioli to Tuesday at 12:30-1:30 PM.",
  "Unschedule everything on Friday.",
  "Clear the notes for the bakery on Monday.",
  "Remove the sandwich shop from the itinerary.",
];

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = new Set([")", "]", "}", ".", ",", "!", "?", ":", ";"]);

const trimTrailingPunctuation = (url: string) => {
  let value = String(url ?? "").trim();
  while (value.length > 0) {
    const last = value[value.length - 1];
    if (!TRAILING_PUNCTUATION.has(last)) break;
    value = value.slice(0, -1);
  }
  return value;
};

const extractUrlsFromText = (text: string, max = 3): string[] => {
  const input = String(text ?? "");
  const matches = input.match(URL_REGEX) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const url = trimTrailingPunctuation(match);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= max) break;
  }

  return out;
};

const looksLikeImportClarificationReply = (text: string) => {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return false;
  if (/^\d{1,2}$/.test(trimmed)) return true;
  if (/place_id[:=]/i.test(trimmed)) return true;
  if (/google\.com\/maps/i.test(trimmed)) return true;
  if (/maps\.app\.goo\.gl/i.test(trimmed)) return true;
  return false;
};

const formatTime12h = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2}):(\d{2})/);
  if (!match) return value;

  const hour24 = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour24)) return value;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
};

const formatTimeRange12h = (start: string | null | undefined, end: string | null | undefined) => {
  const startLabel = formatTime12h(start);
  const endLabel = formatTime12h(end);
  if (!startLabel && !endLabel) return null;
  if (startLabel && endLabel) return `${startLabel}-${endLabel}`;
  return startLabel ?? endLabel;
};

const parseTimeToMinutes = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
};

const getOperationEffectiveDateKey = (op: Operation, activityById: Map<string, any>) => {
  if (op.op === "add_destination") return op.fromDate;
  if (op.op === "update_destination_dates") return op.fromDate;
  if (op.op === "insert_destination_after" || op.op === "remove_destination") return "unscheduled";

  if (op.op === "add_place") {
    if (op.date === undefined) return "unscheduled";
    return op.date ?? "unscheduled";
  }

  const before = activityById.get(op.itineraryActivityId);
  const beforeDate = typeof before?.date === "string" ? before.date : null;

  if (op.op === "update_activity") {
    if (op.date === undefined) return beforeDate ?? "unscheduled";
    return op.date ?? "unscheduled";
  }

  return beforeDate ?? "unscheduled";
};

const getOperationEffectiveStartMinutes = (op: Operation, activityById: Map<string, any>) => {
  if (op.op === "add_destination" || op.op === "update_destination_dates" || op.op === "insert_destination_after" || op.op === "remove_destination") {
    return null;
  }

  if (op.op === "add_place") {
    return parseTimeToMinutes(op.startTime) ?? parseTimeToMinutes(op.endTime);
  }

  const before = activityById.get(op.itineraryActivityId);
  const beforeStart = typeof before?.start_time === "string" ? before.start_time : null;
  const beforeEnd = typeof before?.end_time === "string" ? before.end_time : null;

  if (op.op === "remove_activity") {
    return parseTimeToMinutes(beforeStart) ?? parseTimeToMinutes(beforeEnd);
  }

  const effectiveStart = op.startTime !== undefined ? op.startTime : beforeStart;
  const effectiveEnd = op.endTime !== undefined ? op.endTime : beforeEnd;
  return parseTimeToMinutes(effectiveStart) ?? parseTimeToMinutes(effectiveEnd);
};

const formatDateLabel = (isoDate: string) => {
  try {
    const date = new Date(`${isoDate}T00:00:00Z`);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return isoDate;
  }
};

const getProviderLabel = (provider: ImportSource["provider"]) => {
  switch (provider) {
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    case "tripadvisor":
      return "TripAdvisor";
    default:
      return "Web";
  }
};

function SourcePreviewCard(props: { source: ImportSource }) {
  const { source } = props;

  const title = source.title?.trim() || (() => {
    try {
      return new URL(source.canonicalUrl).hostname;
    } catch {
      return source.canonicalUrl;
    }
  })();

  const shouldEmbed =
    !!source.embedUrl && (source.provider === "youtube" || source.provider === "tiktok" || source.provider === "instagram");

  return (
    <div className="rounded-xl border border-stroke-200/70 bg-bg-0 p-3">
      <div className="flex gap-3">
        {source.thumbnailUrl ? (
          <img
            src={source.thumbnailUrl}
            alt=""
            className="h-14 w-14 rounded-xl object-cover border border-stroke-200/70 bg-bg-50 shrink-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-14 w-14 rounded-xl border border-stroke-200/70 bg-bg-50 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-ink-700 bg-bg-50 border border-stroke-200/70 rounded-full px-2 py-0.5">
              {getProviderLabel(source.provider)}
            </span>
            {source.blocked ? (
              <span
                className="text-[11px] font-semibold text-coral-700 bg-coral-500/10 border border-coral-500/20 rounded-full px-2 py-0.5"
                title={source.blockedReason ?? "Blocked"}
              >
                Blocked
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-sm font-semibold text-ink-900 truncate" title={title}>
            {title}
          </div>

          <div className="mt-1">
            <a
              href={source.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline"
            >
              Open source
            </a>
          </div>
        </div>
      </div>

      {shouldEmbed ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-stroke-200/70 bg-bg-50">
          <iframe
            src={source.embedUrl}
            title={title}
            className="w-full h-[220px]"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      ) : null}
    </div>
  );
}

function ItineraryAssistantChat(props: {
  itineraryId: string;
  destinationId: string;
  isVisible: boolean;
  className?: string;
  onClose?: () => void;
}) {
  const { itineraryId, destinationId, className, isVisible, onClose } = props;
  const queryClient = useQueryClient();
  const setItineraryActivities = useItineraryActivityStore((s) => s.setItineraryActivities);
  const itineraryActivities = useItineraryActivityStore((s) => s.itineraryActivities);

  const storageKey = useMemo(() => {
    if (!itineraryId || !destinationId) return null;
    return `aiItineraryThreadKey:${itineraryId}:${destinationId}`;
  }, [destinationId, itineraryId]);

  const readStoredThreadKey = useCallback(() => {
    if (!storageKey) return "default";
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored?.trim() ? stored.trim() : "default";
    } catch {
      return "default";
    }
  }, [storageKey]);

  const [threadKey, setThreadKey] = useState(() => "default");
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [showThreads, setShowThreads] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [draftPlan, setDraftPlan] = useState<{ operations: Operation[]; requiresConfirmation: boolean } | null>(null);
  const [draftSources, setDraftSources] = useState<DraftSourcesPreview | null>(null);
  const [planning, setPlanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const historyKey = useMemo(
    () => `${itineraryId}:${destinationId}:${threadKey}`,
    [destinationId, itineraryId, threadKey]
  );
  const lastLoadedHistoryKeyRef = useRef<string | null>(null);

  const hasPendingOps = (draftPlan?.operations?.length ?? 0) > 0;

  const setActiveThreadKey = useCallback(
    (nextKey: string) => {
      const normalized = nextKey?.trim() ? nextKey.trim() : "default";
      setThreadKey(normalized);
      if (!storageKey) return;
      try {
        window.localStorage.setItem(storageKey, normalized);
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const canSubmit = useMemo(() => {
    if (planning || importing || applying || dismissing) return false;
    if (showThreads) return false;
    return input.trim().length > 0;
  }, [applying, dismissing, importing, input, planning, showThreads]);

  useEffect(() => {
    setMessages([]);
    setDraftPlan(null);
    setDraftSources(null);
    setError(null);
    setInput("");
    lastLoadedHistoryKeyRef.current = null;
  }, [historyKey]);

  useEffect(() => {
    if (!storageKey) return;
    setThreadKey(readStoredThreadKey());
  }, [readStoredThreadKey, storageKey]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const minHeight = 44;
    const maxHeight = 240;

    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  useEffect(() => {
    if (!isVisible) return;
    if (showThreads) return;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [isVisible, messages, draftPlan, draftSources, planning, importing, applying, showThreads]);

  useEffect(() => {
    if (!isVisible) return;
    if (!itineraryId || !destinationId) return;
    if (lastLoadedHistoryKeyRef.current === historyKey) return;

    lastLoadedHistoryKeyRef.current = historyKey;
    setHistoryLoading(true);
    setError(null);

    fetch(
      `/api/ai/itinerary?itineraryId=${encodeURIComponent(itineraryId)}&destinationId=${encodeURIComponent(
        destinationId
      )}&threadKey=${encodeURIComponent(threadKey)}`
    )
      .then((res) => readJsonResponse<HistoryResponse>(res))
      .then((data) => {
        const payload = data as HistoryResponse;
        if (!payload || payload.ok !== true) return;
        if (!data || data.ok !== true || !Array.isArray(data.messages)) return;
        const restored = payload.messages
          .filter(
            (value: any): value is ChatMessage =>
              !!value && typeof value.content === "string" && (value.role === "user" || value.role === "assistant")
          )
          .map((value: ChatMessage) => ({ role: value.role, content: value.content }))
          .slice(-50);
        setMessages(restored);

        const draftOps = Array.isArray(payload.draftOperations) ? payload.draftOperations : [];
        if (draftOps.length > 0) {
          const requiresConfirmation =
            draftOps.some((op) => op.op === "remove_activity") || draftOps.length > 10;
          setDraftPlan({ operations: draftOps, requiresConfirmation });
        }

        const draftSourcesPayload = payload.draftSources;
        if (draftSourcesPayload && Array.isArray(draftSourcesPayload.sources) && draftSourcesPayload.sources.length > 0) {
          setDraftSources({
            sources: draftSourcesPayload.sources,
            pendingClarificationsCount: draftSourcesPayload.pendingClarificationsCount,
          });
        } else {
          setDraftSources(null);
        }
      })
      .catch(() => {
        // ignore history load errors
      })
      .finally(() => setHistoryLoading(false));
  }, [destinationId, historyKey, isVisible, itineraryId, threadKey]);

  const loadThreads = async () => {
    if (!itineraryId || !destinationId) return;
    setThreadsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/ai/itinerary/threads?itineraryId=${encodeURIComponent(itineraryId)}&destinationId=${encodeURIComponent(
          destinationId
        )}`
      );
      const data = await readJsonResponse<ThreadsResponse | ErrorResponse>(res);
      if (!("ok" in data) || data.ok !== true) return;
      setThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch {
      // ignore
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    if (!itineraryId || !destinationId) return;

    // Ensure we don't keep a stale thread key around (e.g. cleared storage or deleted thread).
    // If there is no stored key or it no longer exists, select the most recent thread.
    void (async () => {
      try {
        const res = await fetch(
          `/api/ai/itinerary/threads?itineraryId=${encodeURIComponent(itineraryId)}&destinationId=${encodeURIComponent(
            destinationId
          )}`
        );
        const data = await readJsonResponse<ThreadsResponse | ErrorResponse>(res);
        if (!("ok" in data) || data.ok !== true) return;
        const nextThreads = Array.isArray(data.threads) ? data.threads : [];
        setThreads(nextThreads);

        const stored = readStoredThreadKey();
        if (stored !== "default" && nextThreads.some((t) => t.thread_key === stored)) {
          setThreadKey(stored);
          return;
        }

        const candidate = nextThreads[0]?.thread_key;
        if (candidate) setActiveThreadKey(candidate);
      } catch {
        // ignore
      }
    })();
  }, [destinationId, isVisible, itineraryId, readStoredThreadKey, setActiveThreadKey]);

  useEffect(() => {
    if (!isVisible) return;
    if (!showThreads) return;
    void loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, showThreads, itineraryId, destinationId]);

  const createNewChat = async () => {
    if (planning || importing || applying || dismissing) return;
    setThreadsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/itinerary/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itineraryId, destinationId }),
      });

      const data = await readJsonResponse<CreateThreadResponse | ErrorResponse>(res);
      if (!("ok" in data) || data.ok !== true || !data.thread?.thread_key) {
        const message = (data as any)?.error?.message ?? "Failed to create a new chat.";
        throw new Error(message);
      }

      setThreads((prev) => [data.thread, ...prev.filter((t) => t.thread_key !== data.thread.thread_key)]);
      setActiveThreadKey(data.thread.thread_key);
      setShowThreads(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create a new chat.");
    } finally {
      setThreadsLoading(false);
    }
  };

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const requestPlan = async (text: string) => {
    setPlanning(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "plan",
          itineraryId,
          destinationId,
          threadKey,
          message: text,
          draftOperations: sortedDraftOperations.length > 0 ? sortedDraftOperations : undefined,
        }),
      });

      const data = await readJsonResponse<PlanResponse | ErrorResponse>(res);
      if (!("ok" in data) || data.ok !== true) {
        const message = data?.error?.message ?? "Failed to plan changes.";
        throw new Error(message);
      }

      pushMessage({ role: "assistant", content: data.assistantMessage });
      if (Array.isArray(data.operations) && data.operations.length > 0) {
        setDraftPlan({ operations: data.operations, requiresConfirmation: data.requiresConfirmation });
      } else {
        setDraftPlan(null);
      }
      setDraftSources(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to plan changes.");
    } finally {
      setPlanning(false);
    }
  };

  const requestImport = async (text: string) => {
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import",
          itineraryId,
          destinationId,
          threadKey,
          message: text,
        }),
      });

      const data = await readJsonResponse<ImportResponse | ErrorResponse>(res);
      if (!("ok" in data) || data.ok !== true) {
        const message = data?.error?.message ?? "Failed to import from link.";
        throw new Error(message);
      }

      pushMessage({ role: "assistant", content: data.assistantMessage });

      const sources = Array.isArray(data.sources) ? data.sources : [];
      if (sources.length > 0) {
        setDraftSources({
          sources,
          pendingClarificationsCount: data.pendingClarificationsCount,
        });
      } else {
        setDraftSources(null);
      }

      if (Array.isArray(data.operations) && data.operations.length > 0) {
        setDraftPlan({ operations: data.operations, requiresConfirmation: data.requiresConfirmation });
      } else {
        setDraftPlan(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import from link.");
    } finally {
      setImporting(false);
    }
  };

  const applyPlan = async () => {
    if (!draftPlan || draftPlan.operations.length === 0) return;
    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "apply",
          itineraryId,
          destinationId,
          threadKey,
          confirmed: true,
          operations: sortedDraftOperations,
        }),
      });

      const data = await readJsonResponse<ApplyResponse | ErrorResponse>(res);
      if (!("ok" in data) || data.ok !== true) {
        const message = data?.error?.message ?? "Failed to apply changes.";
        throw new Error(message);
      }

      pushMessage({ role: "assistant", content: data.assistantMessage });

      const failures = Array.isArray(data.applied) ? data.applied.filter((entry) => !entry.ok) : [];
      if (failures.length > 0) {
        const lines = failures
	          .slice(0, 6)
	          .map((entry) => {
	            const target = (() => {
	              const op = entry.operation;
	              if (op.op === "add_place") return op.name ?? op.query ?? op.placeId;
	              if (op.op === "update_activity" || op.op === "remove_activity") return op.itineraryActivityId;
	              if (op.op === "add_destination") return `${op.city}, ${op.country}`;
	              if (op.op === "insert_destination_after") return `${op.city}, ${op.country}`;
	              if (op.op === "update_destination_dates") return `destination ${op.itineraryDestinationId}`;
	              return `destination ${op.itineraryDestinationId}`;
	            })();
	            return `- ${entry.operation.op} (${target}): ${entry.error ?? "Failed"}`;
	          })
	          .join("\n");
        pushMessage({
          role: "assistant",
          content: `Some changes failed:\n${lines}${failures.length > 6 ? "\n- …" : ""}`,
        });
      }

      const refreshedActivities = data.bootstrap?.activities;
      if (Array.isArray(refreshedActivities)) {
        setItineraryActivities(refreshedActivities);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["builderBootstrap", itineraryId, destinationId] }),
        // Destination edits should immediately refresh the left sidebar + calendar city chips.
        queryClient.invalidateQueries({ queryKey: ["itineraryDestinationsSummary", itineraryId] }),
        // If the current destination range changed, refresh its cached details too.
        queryClient.invalidateQueries({ queryKey: ["itineraryDestination", itineraryId, destinationId] }),
      ]);
      if (failures.length === 0) {
        setDraftPlan(null);
        setDraftSources(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply changes.");
    } finally {
      setApplying(false);
    }
  };

  const dismissDraft = async () => {
    setDismissing(true);
    setError(null);

    try {
      await fetch(
        `/api/ai/itinerary?itineraryId=${encodeURIComponent(itineraryId)}&destinationId=${encodeURIComponent(
          destinationId
        )}&threadKey=${encodeURIComponent(threadKey)}`,
        { method: "DELETE" }
      );
      setDraftPlan(null);
      setDraftSources(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to dismiss draft changes.");
    } finally {
      setDismissing(false);
    }
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;

    const nextHistory = [...messages, { role: "user", content: text } satisfies ChatMessage];
    setMessages(nextHistory);
    setInput("");

    const urls = extractUrlsFromText(text, 3);
    const hasPendingClarifications = (draftSources?.pendingClarificationsCount ?? 0) > 0;
    const shouldImport = urls.length > 0 || (hasPendingClarifications && looksLikeImportClarificationReply(text));

    if (shouldImport) {
      await requestImport(text);
    } else {
      await requestPlan(text);
    }
  };

  const activityById = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of itineraryActivities) {
      const id = String((row as any)?.itinerary_activity_id ?? "");
      if (!id) continue;
      map.set(id, row);
    }
    return map;
  }, [itineraryActivities]);

  const sortedDraftOperations = useMemo(() => {
    const ops = draftPlan?.operations ?? [];
    if (ops.length <= 1) return ops;

    return ops
      .map((operation, idx) => ({
        operation,
        idx,
        dateKey: getOperationEffectiveDateKey(operation, activityById),
        startMinutes: getOperationEffectiveStartMinutes(operation, activityById),
      }))
      .sort((a, b) => {
        if (a.dateKey === "unscheduled" && b.dateKey !== "unscheduled") return 1;
        if (b.dateKey === "unscheduled" && a.dateKey !== "unscheduled") return -1;

        const dateCmp = a.dateKey.localeCompare(b.dateKey);
        if (dateCmp !== 0) return dateCmp;

        if (a.startMinutes === null && b.startMinutes !== null) return 1;
        if (b.startMinutes === null && a.startMinutes !== null) return -1;
        if (a.startMinutes !== null && b.startMinutes !== null && a.startMinutes !== b.startMinutes) {
          return a.startMinutes - b.startMinutes;
        }

        return a.idx - b.idx;
      })
      .map((entry) => entry.operation);
  }, [activityById, draftPlan?.operations]);

  const draftGroups = useMemo(() => {
    const ops = sortedDraftOperations ?? [];
    if (ops.length === 0) return [];

    type ChangeRow = {
      number: number;
      kind: "add" | "update" | "remove";
      title: string;
      timeLabel: string | null;
      details: Array<{ label: string; before?: string; after?: string }>;
      operation: Operation;
    };

	    const rows: Array<{ dateKey: string; row: ChangeRow }> = ops.map((op, idx) => {
	      const number = idx + 1;
	      const dateKey = getOperationEffectiveDateKey(op, activityById);

	      if (op.op === "add_destination") {
	        const title = `${op.city}, ${op.country}`;
	        const details: ChangeRow["details"] = [
	          { label: "Dates", after: `${formatDateLabel(op.fromDate)} → ${formatDateLabel(op.toDate)}` },
	        ];
	        return {
	          dateKey,
	          row: { number, kind: "add", title, timeLabel: null, details, operation: op },
	        };
	      }

	      if (op.op === "insert_destination_after") {
	        const title = `${op.city}, ${op.country}`;
	        const details: ChangeRow["details"] = [
	          { label: "Insert after destination", after: String(op.afterItineraryDestinationId) },
	          { label: "Duration (days)", after: String(op.durationDays) },
	        ];
	        return {
	          dateKey,
	          row: { number, kind: "add", title, timeLabel: null, details, operation: op },
	        };
	      }

	      if (op.op === "update_destination_dates") {
	        const title = `Destination ${op.itineraryDestinationId}`;
	        const details: ChangeRow["details"] = [
	          { label: "Dates", after: `${formatDateLabel(op.fromDate)} → ${formatDateLabel(op.toDate)}` },
	          { label: "Shift activities", after: op.shiftActivities === false ? "No" : "Yes" },
	        ];
	        return {
	          dateKey,
	          row: { number, kind: "update", title, timeLabel: null, details, operation: op },
	        };
	      }

	      if (op.op === "remove_destination") {
	        const title = `Destination ${op.itineraryDestinationId}`;
	        return {
	          dateKey,
	          row: { number, kind: "remove", title, timeLabel: null, details: [], operation: op },
	        };
	      }

	      if (op.op === "add_place") {
	        const title = op.name ?? op.query ?? op.placeId;
	        const timeLabel = formatTimeRange12h(op.startTime ?? null, op.endTime ?? null);
	        const details: ChangeRow["details"] = [];
	        if (op.notes) details.push({ label: "Notes", after: op.notes });
	        return {
	          dateKey,
	          row: { number, kind: "add", title, timeLabel, details, operation: op },
	        };
	      }

      const before = activityById.get(op.itineraryActivityId);
      const name = String(before?.activity?.name ?? `Activity ${op.itineraryActivityId}`);

      if (op.op === "remove_activity") {
        const timeLabel = formatTimeRange12h(before?.start_time ?? null, before?.end_time ?? null);
        return {
          dateKey,
          row: { number, kind: "remove", title: name, timeLabel, details: [], operation: op },
        };
      }

      const details: ChangeRow["details"] = [];
      const beforeDate = typeof before?.date === "string" ? before.date : null;
      if (op.date !== undefined) {
        details.push({
          label: "Date",
          before: beforeDate ? formatDateLabel(beforeDate) : "Unscheduled",
          after: op.date ? formatDateLabel(op.date) : "Unscheduled",
        });
      }

      const timeTouched = op.startTime !== undefined || op.endTime !== undefined;
      const beforeTime = formatTimeRange12h(before?.start_time ?? null, before?.end_time ?? null);
      const afterTime = timeTouched ? formatTimeRange12h(op.startTime ?? null, op.endTime ?? null) : beforeTime;
      if (timeTouched) {
        details.push({
          label: "Time",
          before: beforeTime ?? "None",
          after: afterTime ?? "None",
        });
      }

      if (op.notes !== undefined) {
        const beforeNotes = typeof before?.notes === "string" ? before.notes : null;
        details.push({
          label: "Notes",
          before: beforeNotes && beforeNotes.trim() ? beforeNotes : "None",
          after: op.notes && op.notes.trim() ? op.notes : "None",
        });
      }

      return {
        dateKey,
        row: { number, kind: "update", title: name, timeLabel: afterTime, details, operation: op },
      };
    });

    const groups = new Map<string, ChangeRow[]>();
    for (const entry of rows) {
      const list = groups.get(entry.dateKey) ?? [];
      list.push(entry.row);
      groups.set(entry.dateKey, list);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === "unscheduled") return 1;
      if (b === "unscheduled") return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((dateKey) => ({
      dateKey,
      label: dateKey === "unscheduled" ? "Unscheduled" : formatDateLabel(dateKey),
      rows: groups.get(dateKey) ?? [],
    }));
  }, [activityById, draftPlan?.operations]);

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="shrink-0 px-5 py-4 border-b border-stroke-200 bg-bg-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" />
          <div className="text-lg font-semibold text-ink-900">Itinerary Assistant</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 rounded-xl"
            onClick={() => setShowThreads((prev) => !prev)}
            disabled={planning || importing || applying || dismissing}
          >
            {showThreads ? "Back" : "Chats"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-xl"
            onClick={createNewChat}
            disabled={threadsLoading || planning || importing || applying || dismissing}
          >
            New
          </Button>
          {onClose ? (
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto px-5 py-4 space-y-3 bg-bg-50">
        {showThreads ? (
          <div className="flex flex-col min-h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-ink-900">Your chats</div>
                {threadsLoading ? <div className="text-xs text-ink-500">Loading...</div> : null}
              </div>

              {threadsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`thread-skeleton-${idx}`}
                      className="w-full rounded-2xl border border-stroke-200 bg-bg-0 px-3 py-2"
                    >
                      <div className="animate-pulse">
                        <div className="h-4 w-3/4 rounded bg-bg-50" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-bg-50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {threads.length === 0 && !threadsLoading ? (
                <div className="rounded-2xl border border-stroke-200 bg-bg-0 p-3 text-sm text-ink-700">
                  No chats yet. Create one to start fresh, or just type a message and I will create the default chat.
                </div>
              ) : null}

              {!threadsLoading
                ? threads.map((t) => {
                    const isActive = t.thread_key === threadKey;
                    const label = t.summary?.trim() || "Untitled chat";
                    const updatedLabel = (() => {
                      try {
                        const date = new Date(t.updated_at);
                        if (Number.isNaN(date.getTime())) return null;
                        return new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(date);
                      } catch {
                        return null;
                      }
                    })();

                    return (
                      <button
                        key={t.thread_key}
                        type="button"
                        className={cn(
                          "w-full text-left rounded-2xl border px-3 py-2",
                          isActive ? "border-brand-500 bg-brand-500/5" : "border-stroke-200 bg-bg-0 hover:bg-bg-50"
                        )}
                        onClick={() => {
                          setActiveThreadKey(t.thread_key);
                          setShowThreads(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink-900 truncate">{label}</div>
                            {updatedLabel ? (
                              <div className="text-xs text-ink-500 mt-0.5">Updated {updatedLabel}</div>
                            ) : null}
                          </div>
                          {isActive ? (
                            <span className="text-[11px] font-semibold text-brand-700 bg-brand-500/10 rounded-full px-2 py-0.5">
                              Active
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                : null}
            </div>

            <div className="sticky bottom-0 bg-bg-50 pt-4 pb-1">
              <Button
                type="button"
                className="w-full h-10 rounded-2xl"
                onClick={createNewChat}
                disabled={threadsLoading}
              >
                Create new chat
              </Button>
            </div>
          </div>
        ) : null}

        {!showThreads ? (
          <>
        {historyLoading && messages.length === 0 ? (
          <div className="max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed bg-bg-0 border border-stroke-200">
            <span className="text-shimmer">Loading chat…</span>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-ink-700">
              Ask me to add places, reschedule activities, update times, edit notes, or remove items.
            </div>
            <div className="space-y-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="w-full text-left rounded-xl border border-stroke-200 bg-bg-0 px-3 py-2 text-sm text-ink-700 hover:bg-bg-50"
                  onClick={() => {
                    setInput(example);
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            className={cn(
              "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
              message.role === "user"
                ? "ml-auto bg-brand-500 text-white"
                : "bg-bg-0 border border-stroke-200 text-ink-900"
            )}
          >
            {message.content}
          </div>
        ))}

        {planning || importing || applying ? (
          <div className="max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed bg-bg-0 border border-stroke-200">
            <span className="text-shimmer">{applying ? "Applying…" : importing ? "Importing from link…" : "Thinking…"}</span>
          </div>
        ) : null}

        {draftSources && draftSources.sources.length > 0 ? (
          <div className="rounded-2xl border border-stroke-200 bg-bg-0 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-900">Sources</div>
              {(draftSources.pendingClarificationsCount ?? 0) > 0 ? (
                <span className="text-[11px] font-semibold text-coral-600 bg-coral-500/10 rounded-full px-2 py-0.5">
                  Needs clarification
                </span>
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {draftSources.sources.map((source) => (
                <SourcePreviewCard key={source.canonicalUrl} source={source} />
              ))}
            </div>
          </div>
        ) : null}

        {draftPlan && draftPlan.operations.length > 0 ? (
          <div className="rounded-2xl border border-stroke-200 bg-bg-0 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-900">Draft changes</div>
              {draftPlan.requiresConfirmation ? (
                <span className="text-[11px] font-semibold text-coral-600 bg-coral-500/10 rounded-full px-2 py-0.5">
                  Confirm
                </span>
              ) : null}
	            </div>
	
	            <div className="mt-3 space-y-4">
	              {draftGroups.map((group) => (
	                <div key={group.dateKey} className="rounded-xl border border-stroke-200/70 bg-bg-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-ink-900">{group.label}</div>
                    <div className="text-[11px] text-ink-500">{group.rows.length} change(s)</div>
                  </div>

                  <div className="mt-2 space-y-2">
                    {group.rows.map((row) => {
                      const badge =
                        row.kind === "add"
                          ? { label: "Add", cls: "bg-teal-500/10 text-teal-700 border-teal-500/20", bar: "bg-teal-500" }
                          : row.kind === "remove"
                          ? { label: "Remove", cls: "bg-coral-500/10 text-coral-700 border-coral-500/20", bar: "bg-coral-500" }
                          : { label: "Update", cls: "bg-brand-500/10 text-brand-700 border-brand-500/20", bar: "bg-brand-500" };

                      return (
                        <div
                          key={`${row.kind}-${row.number}`}
                          className="flex gap-3 rounded-xl bg-bg-0 border border-stroke-200/70 p-3"
                        >
                          <div className={cn("w-1 rounded-full shrink-0", badge.bar)} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-[11px] font-semibold border rounded-full px-2 py-0.5", badge.cls)}>
                                    {badge.label}
                                  </span>
                                  <span className="text-[11px] text-ink-500">#{row.number}</span>
                                </div>
                                <div className="mt-1 text-sm font-semibold text-ink-900 truncate">
                                  {row.title}
                                </div>
                              </div>

                              {row.timeLabel ? (
                                <div className="text-xs text-ink-600 whitespace-nowrap">{row.timeLabel}</div>
                              ) : null}
                            </div>

                            {row.details.length > 0 ? (
                              <div className="mt-2 space-y-1 text-xs text-ink-600">
                                {row.details.map((detail, idx) => (
                                  <div key={`${detail.label}-${idx}`} className="flex flex-wrap gap-x-2 gap-y-1">
                                    <span className="font-semibold text-ink-700">{detail.label}:</span>
                                    {detail.before !== undefined ? (
                                      <span className="text-ink-500">{detail.before}</span>
                                    ) : null}
                                    {detail.before !== undefined && detail.after !== undefined ? (
                                      <span className="text-ink-400">→</span>
                                    ) : null}
                                    {detail.after !== undefined ? (
                                      <span className="text-ink-700">{detail.after}</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hasPendingOps ? (
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={dismissDraft}
                  disabled={applying || dismissing}
                >
                  {dismissing ? "Dismissing…" : "Dismiss"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={applyPlan}
                  disabled={applying}
                >
                  {applying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying
                    </>
                  ) : (
                    (draftPlan.requiresConfirmation ? "Confirm & Apply" : "Apply")
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-coral-500/20 bg-coral-500/10 p-3 text-sm text-coral-700 flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="whitespace-pre-wrap">{error}</div>
          </div>
        ) : null}
          </>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-stroke-200 bg-bg-0 px-5 py-4">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the changes you want…"
            className="min-h-[44px] resize-none rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSubmit) void handleSubmit();
              }
            }}
            disabled={showThreads}
          />
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 rounded-2xl"
            onClick={handleSubmit}
            disabled={!canSubmit || showThreads}
            title="Send"
          >
            {planning || importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>

        <div className="mt-2 text-[11px] text-ink-500">
          Press Enter to send • Shift+Enter for a new line
        </div>
      </div>
    </div>
  );
}

export function ItineraryAssistantSheet(props: {
  itineraryId: string;
  destinationId: string;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const { itineraryId, destinationId, className, onOpenChange } = props;
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onOpenChange?.(nextOpen);
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("ml-3 h-9 rounded-xl gap-2", className)}
        >
          <Sparkles className="h-4 w-4" />
          AI
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] p-0 flex flex-col [&>button]:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Itinerary Assistant</SheetTitle>
        </SheetHeader>
        <ItineraryAssistantChat
          itineraryId={itineraryId}
          destinationId={destinationId}
          isVisible={open}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

export function ItineraryAssistantSidebar(props: {
  itineraryId: string;
  destinationId: string;
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}) {
  const { itineraryId, destinationId, isVisible, onClose, className } = props;
  return (
    <ItineraryAssistantChat
      itineraryId={itineraryId}
      destinationId={destinationId}
      isVisible={isVisible}
      onClose={onClose}
      className={className}
    />
  );
}
