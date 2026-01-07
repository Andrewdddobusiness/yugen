import { z } from "zod";

export const ItineraryIdSchema = z.string().regex(/^\d+$/, "Expected a numeric itinerary id");
export const DestinationIdSchema = z.string().regex(/^\d+$/, "Expected a numeric destination id");
export const ItineraryActivityIdSchema = z.string().regex(/^\d+$/, "Expected a numeric itinerary activity id");
export const PlaceIdSchema = z.string().trim().min(1, "Expected a place id");

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date string");

export const TimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected a HH:MM or HH:MM:SS time string");

const validateTimePair = (value: any, ctx: z.RefinementCtx) => {
  const touchesTime = value.startTime !== undefined || value.endTime !== undefined;
  if (!touchesTime) return;

  if (value.startTime === undefined || value.endTime === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "When changing time, provide both startTime and endTime (or set both to null).",
    });
    return;
  }

  const bothNull = value.startTime === null && value.endTime === null;
  const bothString = typeof value.startTime === "string" && typeof value.endTime === "string";
  if (!bothNull && !bothString) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "startTime and endTime must both be strings, or both be null.",
    });
  }
};

const UpdateActivityOperationSchema = z.object({
  op: z.literal("update_activity"),
  itineraryActivityId: ItineraryActivityIdSchema,
  date: IsoDateSchema.nullable().optional(),
  startTime: TimeSchema.nullable().optional(),
  endTime: TimeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
});

const RemoveActivityOperationSchema = z.object({
  op: z.literal("remove_activity"),
  itineraryActivityId: ItineraryActivityIdSchema,
});

const ProposedAddPlaceOperationSchema = z.object({
  op: z.literal("add_place"),
  // New additions can be specified with a query; existing draft additions can include a resolved placeId.
  query: z.string().trim().min(1).optional(),
  placeId: PlaceIdSchema.optional(),
  name: z.string().trim().optional(),
  date: IsoDateSchema.nullable().optional(),
  startTime: TimeSchema.nullable().optional(),
  endTime: TimeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
});

const ResolvedAddPlaceOperationSchema = z.object({
  op: z.literal("add_place"),
  placeId: PlaceIdSchema,
  query: z.string().trim().optional(),
  name: z.string().trim().optional(),
  date: IsoDateSchema.nullable().optional(),
  startTime: TimeSchema.nullable().optional(),
  endTime: TimeSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  });

export const ProposedOperationSchema = z
  .discriminatedUnion("op", [UpdateActivityOperationSchema, RemoveActivityOperationSchema, ProposedAddPlaceOperationSchema])
  .superRefine((value, ctx) => {
    if (value.op === "update_activity") {
      const hasAnyField =
        value.date !== undefined ||
        value.startTime !== undefined ||
        value.endTime !== undefined ||
        value.notes !== undefined;

      if (!hasAnyField) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "update_activity must include at least one field",
        });
      }

      validateTimePair(value, ctx);
      return;
    }

    if (value.op === "add_place") {
      const hasQuery = typeof (value as any).query === "string" && String((value as any).query).trim().length > 0;
      const hasPlaceId = typeof (value as any).placeId === "string" && String((value as any).placeId).trim().length > 0;
      if (!hasQuery && !hasPlaceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "add_place requires either query or placeId",
        });
      }
      validateTimePair(value, ctx);
    }
  });

export const OperationSchema = z
  .discriminatedUnion("op", [UpdateActivityOperationSchema, RemoveActivityOperationSchema, ResolvedAddPlaceOperationSchema])
  .superRefine((value, ctx) => {
    if (value.op !== "update_activity") {
      if (value.op === "add_place") validateTimePair(value, ctx);
      return;
    }

    const hasAnyField =
      value.date !== undefined ||
      value.startTime !== undefined ||
      value.endTime !== undefined ||
      value.notes !== undefined;

    if (!hasAnyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "update_activity must include at least one field",
      });
    }

    validateTimePair(value, ctx);
  });

export type ProposedOperation = z.infer<typeof ProposedOperationSchema>;
export type Operation = z.infer<typeof OperationSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const PlanRequestSchema = z.object({
  mode: z.literal("plan"),
  itineraryId: ItineraryIdSchema,
  destinationId: DestinationIdSchema,
  message: z.string().trim().min(1, "Message is required"),
  chatHistory: z.array(ChatMessageSchema).max(30).optional(),
  draftOperations: z.array(OperationSchema).max(25).optional(),
});

export const ApplyRequestSchema = z.object({
  mode: z.literal("apply"),
  itineraryId: ItineraryIdSchema,
  destinationId: DestinationIdSchema,
  confirmed: z.boolean().optional(),
  operations: z
    .array(OperationSchema)
    .min(1, "At least one operation is required")
    .max(25, "At most 25 operations are allowed"),
});

export const ItineraryAssistantRequestSchema = z.discriminatedUnion("mode", [
  PlanRequestSchema,
  ApplyRequestSchema,
]);

export type ItineraryAssistantRequest = z.infer<typeof ItineraryAssistantRequestSchema>;

export const PlanResultSchema = z.object({
  assistantMessage: z.string(),
  operations: z.array(ProposedOperationSchema),
});

export type PlanResult = z.infer<typeof PlanResultSchema>;

export type PlanResponsePayload = {
  assistantMessage: string;
  operations: Operation[];
  previewLines: string[];
  requiresConfirmation: boolean;
};

export type ApplyResponsePayload = {
  assistantMessage: string;
  applied: {
    ok: boolean;
    operation: Operation;
    error?: string;
  }[];
  bootstrap?: unknown;
};
