import { z } from "zod";

export const ItineraryIdSchema = z.string().regex(/^\d+$/, "Expected a numeric itinerary id");
export const DestinationIdSchema = z.string().regex(/^\d+$/, "Expected a numeric destination id");
// NOTE: DestinationIdSchema refers to `itinerary_destination_id` in this app.
export const ItineraryDestinationIdSchema = DestinationIdSchema;
export const ItineraryActivityIdSchema = z.string().regex(/^\d+$/, "Expected a numeric itinerary activity id");
export const PlaceIdSchema = z.string().trim().min(1, "Expected a place id").max(256);

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
  notes: z.string().max(2000).nullable().optional(),
});

const RemoveActivityOperationSchema = z.object({
  op: z.literal("remove_activity"),
  itineraryActivityId: ItineraryActivityIdSchema,
});

const ItineraryDestinationCitySchema = z.string().trim().min(1, "City is required").max(100, "City is too long");
const ItineraryDestinationCountrySchema = z.string().trim().min(1, "Country is required").max(100, "Country is too long");

const AddDestinationOperationSchema = z.object({
  op: z.literal("add_destination"),
  city: ItineraryDestinationCitySchema,
  country: ItineraryDestinationCountrySchema,
  fromDate: IsoDateSchema,
  toDate: IsoDateSchema,
});

const UpdateDestinationDatesOperationSchema = z.object({
  op: z.literal("update_destination_dates"),
  itineraryDestinationId: ItineraryDestinationIdSchema,
  fromDate: IsoDateSchema,
  toDate: IsoDateSchema,
  shiftActivities: z.boolean().optional(),
});

const UpdateDestinationOperationSchema = z.object({
  op: z.literal("update_destination"),
  itineraryDestinationId: ItineraryDestinationIdSchema,
  city: ItineraryDestinationCitySchema.optional(),
  country: ItineraryDestinationCountrySchema.optional(),
  fromDate: IsoDateSchema.optional(),
  toDate: IsoDateSchema.optional(),
  shiftActivities: z.boolean().optional(),
});

const InsertDestinationAfterOperationSchema = z.object({
  op: z.literal("insert_destination_after"),
  afterItineraryDestinationId: ItineraryDestinationIdSchema,
  city: ItineraryDestinationCitySchema,
  country: ItineraryDestinationCountrySchema,
  durationDays: z.number().int().min(1, "durationDays must be at least 1").max(60, "durationDays is too large"),
});

const RemoveDestinationOperationSchema = z.object({
  op: z.literal("remove_destination"),
  itineraryDestinationId: ItineraryDestinationIdSchema,
});

const AddAlternativesOperationSchema = z.object({
  op: z.literal("add_alternatives"),
  targetItineraryActivityId: ItineraryActivityIdSchema,
  alternativeItineraryActivityIds: z.array(ItineraryActivityIdSchema).min(1).max(3),
});

const ProposedAddPlaceOperationSchema = z.object({
  op: z.literal("add_place"),
  // New additions can be specified with a query; existing draft additions can include a resolved placeId.
  query: z.string().trim().min(1).max(200).optional(),
  placeId: PlaceIdSchema.optional(),
  name: z.string().trim().max(120).optional(),
  date: IsoDateSchema.nullable().optional(),
  startTime: TimeSchema.nullable().optional(),
  endTime: TimeSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const ResolvedAddPlaceOperationSchema = z.object({
  op: z.literal("add_place"),
  placeId: PlaceIdSchema,
  query: z.string().trim().max(200).optional(),
  name: z.string().trim().max(120).optional(),
  date: IsoDateSchema.nullable().optional(),
  startTime: TimeSchema.nullable().optional(),
  endTime: TimeSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  });

export const ProposedOperationSchema = z
  .discriminatedUnion("op", [
    UpdateActivityOperationSchema,
    RemoveActivityOperationSchema,
    ProposedAddPlaceOperationSchema,
    AddAlternativesOperationSchema,
    AddDestinationOperationSchema,
    UpdateDestinationDatesOperationSchema,
    UpdateDestinationOperationSchema,
    InsertDestinationAfterOperationSchema,
    RemoveDestinationOperationSchema,
  ])
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

    if (value.op === "add_destination") {
      if (value.toDate < value.fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "toDate must be on or after fromDate",
          path: ["toDate"],
        });
      }
      return;
    }

    if (value.op === "update_destination_dates") {
      if (value.toDate < value.fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "toDate must be on or after fromDate",
          path: ["toDate"],
        });
      }
      return;
    }

    if (value.op === "update_destination") {
      const touchesLocation = value.city !== undefined || value.country !== undefined;
      const touchesDates = value.fromDate !== undefined || value.toDate !== undefined;
      if (!touchesLocation && !touchesDates) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "update_destination must include at least one of city/country or fromDate/toDate",
        });
        return;
      }

      if (touchesLocation && (value.city === undefined || value.country === undefined)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "When changing destination location, provide both city and country.",
        });
        return;
      }

      if (touchesDates) {
        if (value.fromDate === undefined || value.toDate === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "When changing destination dates, provide both fromDate and toDate.",
          });
          return;
        }
        if (value.toDate < value.fromDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "toDate must be on or after fromDate",
            path: ["toDate"],
          });
        }
      }
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
      return;
    }

    if (value.op === "add_alternatives") {
      const target = String((value as any).targetItineraryActivityId ?? "");
      const ids = Array.isArray((value as any).alternativeItineraryActivityIds)
        ? (value as any).alternativeItineraryActivityIds.map((id: any) => String(id))
        : [];
      const unique = Array.from(new Set(ids.filter(Boolean)));
      if (unique.length !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "alternativeItineraryActivityIds must be unique",
          path: ["alternativeItineraryActivityIds"],
        });
      }
      if (unique.includes(target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "alternativeItineraryActivityIds must not include the target activity",
          path: ["alternativeItineraryActivityIds"],
        });
      }
    }
  });

export const OperationSchema = z
  .discriminatedUnion("op", [
    UpdateActivityOperationSchema,
    RemoveActivityOperationSchema,
    ResolvedAddPlaceOperationSchema,
    AddAlternativesOperationSchema,
    AddDestinationOperationSchema,
    UpdateDestinationDatesOperationSchema,
    UpdateDestinationOperationSchema,
    InsertDestinationAfterOperationSchema,
    RemoveDestinationOperationSchema,
  ])
  .superRefine((value, ctx) => {
    if (value.op !== "update_activity") {
      if (value.op === "add_place") validateTimePair(value, ctx);
      if (value.op === "add_alternatives") {
        const target = String((value as any).targetItineraryActivityId ?? "");
        const ids = Array.isArray((value as any).alternativeItineraryActivityIds)
          ? (value as any).alternativeItineraryActivityIds.map((id: any) => String(id))
          : [];
        const unique = Array.from(new Set(ids.filter(Boolean)));
        if (unique.length !== ids.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "alternativeItineraryActivityIds must be unique",
            path: ["alternativeItineraryActivityIds"],
          });
        }
        if (unique.includes(target)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "alternativeItineraryActivityIds must not include the target activity",
            path: ["alternativeItineraryActivityIds"],
          });
        }
      }
      if (value.op === "add_destination" && value.toDate < value.fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "toDate must be on or after fromDate",
          path: ["toDate"],
        });
      }
      if (value.op === "update_destination_dates" && value.toDate < value.fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "toDate must be on or after fromDate",
          path: ["toDate"],
        });
      }
      if (value.op === "update_destination") {
        const touchesLocation = value.city !== undefined || value.country !== undefined;
        const touchesDates = value.fromDate !== undefined || value.toDate !== undefined;
        if (!touchesLocation && !touchesDates) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "update_destination must include at least one of city/country or fromDate/toDate",
          });
        }
        if (touchesLocation && (value.city === undefined || value.country === undefined)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "When changing destination location, provide both city and country.",
          });
        }
        if (touchesDates) {
          if (value.fromDate === undefined || value.toDate === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "When changing destination dates, provide both fromDate and toDate.",
            });
          } else if (value.toDate < value.fromDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "toDate must be on or after fromDate",
              path: ["toDate"],
            });
          }
        }
      }
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

export const ThreadKeySchema = z
  .string()
  .trim()
  .min(1, "Thread key is required")
  .max(64, "Thread key is too long");

export const PlanRequestSchema = z.object({
  mode: z.literal("plan"),
  itineraryId: ItineraryIdSchema,
  destinationId: DestinationIdSchema,
  threadKey: ThreadKeySchema.optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
  chatHistory: z.array(ChatMessageSchema).max(30).optional(),
  draftOperations: z.array(OperationSchema).max(25).optional(),
});

export const CurateRequestSchema = z.object({
  mode: z.literal("curate"),
  itineraryId: ItineraryIdSchema,
  destinationId: DestinationIdSchema,
  threadKey: ThreadKeySchema.optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
  fromDate: IsoDateSchema.optional(),
  toDate: IsoDateSchema.optional(),
  draftOperations: z.array(OperationSchema).max(25).optional(),
});

export const ImportRequestSchema = z.object({
  mode: z.literal("import"),
  itineraryId: ItineraryIdSchema,
  destinationId: DestinationIdSchema,
  threadKey: ThreadKeySchema.optional(),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message is too long"),
});

export const ApplyRequestSchema = z.object({
  mode: z.literal("apply"),
  itineraryId: ItineraryIdSchema,
  destinationId: DestinationIdSchema,
  threadKey: ThreadKeySchema.optional(),
  confirmed: z.boolean().optional(),
  operations: z
    .array(OperationSchema)
    .min(1, "At least one operation is required")
    .max(25, "At most 25 operations are allowed"),
});

export const ItineraryAssistantRequestSchema = z.discriminatedUnion("mode", [
  PlanRequestSchema,
  CurateRequestSchema,
  ImportRequestSchema,
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
  warnings?: string[];
  dayPlans?: CuratedDayPlan[];
  requiresConfirmation: boolean;
};

export type CuratedDayPlan = {
  date: string; // YYYY-MM-DD
  rationale: string;
  items: Array<{
    itineraryActivityId: string;
    title: string;
    startTime?: string;
    endTime?: string;
  }>;
  warnings?: string[];
};

export type ImportSourcePreview = {
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

export type ImportResponsePayload = {
  assistantMessage: string;
  operations: Array<Extract<Operation, { op: "add_place" }>>;
  previewLines: string[];
  requiresConfirmation: boolean;
  warnings?: string[];
  sources: ImportSourcePreview[];
  pendingClarificationsCount?: number;
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
