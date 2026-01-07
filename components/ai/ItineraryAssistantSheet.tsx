"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Loader2, AlertTriangle, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useQueryClient } from "@tanstack/react-query";

type Operation =
  | {
      op: "update_activity";
      itineraryActivityId: string;
      date?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      notes?: string | null;
    }
  | {
      op: "remove_activity";
      itineraryActivityId: string;
    }
  | {
      op: "add_place";
      placeId: string;
      query?: string;
      name?: string;
      date?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      notes?: string | null;
    };

type PlanResponse = {
  ok: true;
  mode: "plan";
  assistantMessage: string;
  operations: Operation[];
  previewLines: string[];
  requiresConfirmation: boolean;
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
  messages: ChatMessage[];
  summary?: string | null;
  draftOperations?: Operation[] | null;
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
  "Move McDonald's to Tuesday at 7:00–8:00 PM and add note “quick dinner”.",
  "Add Roscioli to Tuesday at 12:30–1:30 PM.",
  "Unschedule everything on Friday.",
  "Clear the notes for the bakery on Monday.",
  "Remove the sandwich shop from the itinerary.",
];

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
  if (startLabel && endLabel) return `${startLabel}–${endLabel}`;
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [draftPlan, setDraftPlan] = useState<{ operations: Operation[]; requiresConfirmation: boolean } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const historyKey = useMemo(() => `${itineraryId}:${destinationId}`, [destinationId, itineraryId]);
  const lastLoadedHistoryKeyRef = useRef<string | null>(null);

  const hasPendingOps = (draftPlan?.operations?.length ?? 0) > 0;

  const canSubmit = useMemo(() => {
    if (planning || applying || dismissing) return false;
    return input.trim().length > 0;
  }, [applying, dismissing, input, planning]);

  useEffect(() => {
    setMessages([]);
    setDraftPlan(null);
    setError(null);
    setInput("");
    lastLoadedHistoryKeyRef.current = null;
  }, [historyKey]);

  useEffect(() => {
    if (!isVisible) return;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [isVisible, messages, draftPlan, planning, applying]);

  useEffect(() => {
    if (!isVisible) return;
    if (!itineraryId || !destinationId) return;
    if (lastLoadedHistoryKeyRef.current === historyKey) return;

    lastLoadedHistoryKeyRef.current = historyKey;
    setHistoryLoading(true);
    setError(null);

    fetch(`/api/ai/itinerary?itineraryId=${encodeURIComponent(itineraryId)}&destinationId=${encodeURIComponent(destinationId)}`)
      .then((res) => res.json())
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
      })
      .catch(() => {
        // ignore history load errors
      })
      .finally(() => setHistoryLoading(false));
  }, [destinationId, historyKey, isVisible, itineraryId]);

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
          message: text,
          draftOperations: sortedDraftOperations.length > 0 ? sortedDraftOperations : undefined,
        }),
      });

      const data = (await res.json()) as PlanResponse | ErrorResponse;
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to plan changes.");
    } finally {
      setPlanning(false);
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
          confirmed: true,
          operations: sortedDraftOperations,
        }),
      });

      const data = (await res.json()) as ApplyResponse | ErrorResponse;
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
            const target =
              entry.operation.op === "add_place"
                ? entry.operation.name ?? entry.operation.query ?? entry.operation.placeId
                : entry.operation.itineraryActivityId;
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

      await queryClient.invalidateQueries({ queryKey: ["builderBootstrap", itineraryId, destinationId] });
      if (failures.length === 0) {
        setDraftPlan(null);
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
        `/api/ai/itinerary?itineraryId=${encodeURIComponent(itineraryId)}&destinationId=${encodeURIComponent(destinationId)}`,
        { method: "DELETE" }
      );
      setDraftPlan(null);
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
    await requestPlan(text);
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
        {onClose ? (
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        ) : null}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto px-5 py-4 space-y-3 bg-bg-50">
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

        {planning || applying ? (
          <div className="max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed bg-bg-0 border border-stroke-200">
            <span className="text-shimmer">{applying ? "Applying…" : "Thinking…"}</span>
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
      </div>

      <div className="shrink-0 border-t border-stroke-200 bg-bg-0 px-5 py-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the changes you want…"
            className="min-h-[44px] max-h-[140px] resize-none rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSubmit) void handleSubmit();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 rounded-2xl"
            onClick={handleSubmit}
            disabled={!canSubmit}
            title="Send"
          >
            {planning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
