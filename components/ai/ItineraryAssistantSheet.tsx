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

type ErrorResponse = {
  ok: false;
  error?: { message?: string; code?: string };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const toChatHistoryPayload = (messages: ChatMessage[]) => {
  const cleaned = messages
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);

  return cleaned.slice(-20);
};

const examples = [
  "Move McDonald's to Tuesday at 19:00–20:00 and add note “quick dinner”.",
  "Add Roscioli to Tuesday at 12:30–13:30.",
  "Unschedule everything on Friday.",
  "Clear the notes for the bakery on Monday.",
  "Remove the sandwich shop from the itinerary.",
];

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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingPlan, setPendingPlan] = useState<PlanResponse | null>(null);
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const storageKey = useMemo(
    () => `ai_itinerary_chat:${itineraryId}:${destinationId}`,
    [destinationId, itineraryId]
  );
  const hasLoadedFromStorageRef = useRef(false);

  const hasPendingOps = (pendingPlan?.operations?.length ?? 0) > 0;

  const canSubmit = useMemo(() => {
    if (planning || applying) return false;
    return input.trim().length > 0;
  }, [applying, input, planning]);

  useEffect(() => {
    if (!isVisible) return;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [isVisible, messages, pendingPlan, planning, applying]);

  useEffect(() => {
    hasLoadedFromStorageRef.current = false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        hasLoadedFromStorageRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        hasLoadedFromStorageRef.current = true;
        return;
      }

      const restored = parsed
        .filter(
          (value): value is ChatMessage =>
            !!value &&
            typeof (value as any).content === "string" &&
            ((value as any).role === "user" || (value as any).role === "assistant")
        )
        .map((value) => ({ role: value.role, content: value.content }))
        .slice(-50);

      if (restored.length > 0) setMessages(restored);
    } catch {
      // ignore local storage errors
    } finally {
      hasLoadedFromStorageRef.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedFromStorageRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore local storage errors
    }
  }, [messages, storageKey]);

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const requestPlan = async (text: string, chatHistory: ChatMessage[]) => {
    setPlanning(true);
    setError(null);
    setPendingPlan(null);

    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "plan",
          itineraryId,
          destinationId,
          message: text,
          chatHistory: toChatHistoryPayload(chatHistory),
        }),
      });

      const data = (await res.json()) as PlanResponse | ErrorResponse;
      if (!("ok" in data) || data.ok !== true) {
        const message = data?.error?.message ?? "Failed to plan changes.";
        throw new Error(message);
      }

      pushMessage({ role: "assistant", content: data.assistantMessage });
      setPendingPlan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to plan changes.");
    } finally {
      setPlanning(false);
    }
  };

  const applyPlan = async () => {
    if (!pendingPlan || pendingPlan.operations.length === 0) return;
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
          operations: pendingPlan.operations,
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
      setPendingPlan(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply changes.");
    } finally {
      setApplying(false);
    }
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;

    const nextHistory = [...messages, { role: "user", content: text } satisfies ChatMessage];
    setMessages(nextHistory);
    setInput("");
    await requestPlan(text, nextHistory);
  };

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

        {pendingPlan && pendingPlan.previewLines.length > 0 ? (
          <div className="rounded-2xl border border-stroke-200 bg-bg-0 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-900">Proposed changes</div>
              {pendingPlan.requiresConfirmation ? (
                <span className="text-[11px] font-semibold text-coral-600 bg-coral-500/10 rounded-full px-2 py-0.5">
                  Confirm
                </span>
              ) : null}
            </div>
            <ul className="mt-2 space-y-1 text-sm text-ink-700">
              {pendingPlan.previewLines.map((line, i) => (
                <li key={`${line}-${i}`} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-ink-400 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {hasPendingOps ? (
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={() => setPendingPlan(null)}
                  disabled={applying}
                >
                  Dismiss
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
                    (pendingPlan.requiresConfirmation ? "Confirm & Apply" : "Apply")
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
