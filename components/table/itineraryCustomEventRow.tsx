import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityCreatedBy } from "@/components/collaboration/ActivityCreatedBy";
import { formatTime } from "@/utils/formatting/datetime";
import { cn } from "@/lib/utils";
import type { ItineraryCustomEvent } from "@/store/itineraryCustomEventStore";

function formatDateLabel(date: string | null) {
  if (!date) return "Unscheduled";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unscheduled";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeLabel(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) return "Set time";
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

export default function ItineraryCustomEventRow({
  event,
  onRemove,
}: {
  event: ItineraryCustomEvent;
  onRemove: (eventId: number) => void;
}) {
  const dotStyle = event.color_hex ? { backgroundColor: event.color_hex } : undefined;

  return (
    <TableRow className="flex w-full hover:bg-gray-50">
      <TableCell className="w-[20%] min-w-[200px]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 min-w-0">
            <StickyNote className="h-4 w-4 shrink-0 text-ink-400" />
            <div className="truncate">{event.title}</div>
          </div>
          {event.created_by ? (
            <ActivityCreatedBy userId={event.created_by} mode="text" textClassName="text-[11px]" />
          ) : null}
        </div>
      </TableCell>

      <TableCell className="w-[200px] min-w-[200px] shrink-0">
        <Badge
          className={cn(
            "max-w-full min-w-0",
            "inline-flex items-center gap-1.5",
            "rounded-full border border-stroke-200",
            "bg-bg-0 px-2.5 py-1 text-[11px] font-medium text-ink-900 shadow-sm",
            "hover:bg-bg-50",
            "dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          )}
          style={event.color_hex ? { borderColor: event.color_hex } : undefined}
          title="Custom note"
        >
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", !event.color_hex && "bg-slate-400")}
            style={dotStyle}
          />
          <span className="min-w-0 truncate">Note</span>
        </Badge>
      </TableCell>

      <TableCell className="w-[20%] min-w-[200px] text-ink-400">—</TableCell>

      <TableCell className="w-[15%] min-w-[150px]">
        <div className="inline-flex w-full rounded-xl border border-stroke-200 bg-bg-0 px-3 py-2 text-xs text-muted-foreground">
          {formatDateLabel(event.date)}
        </div>
      </TableCell>

      <TableCell className="w-[15%] min-w-[150px]">
        <div className="inline-flex w-full rounded-xl border border-stroke-200 bg-bg-0 px-3 py-2 text-xs text-muted-foreground">
          {formatTimeLabel(event.start_time, event.end_time)}
        </div>
      </TableCell>

      <TableCell className="w-[20%] min-w-[200px]">
        <div className="line-clamp-2 text-xs text-ink-600">{event.notes || "—"}</div>
      </TableCell>

      <TableCell className="w-[5%] min-w-[50px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => onRemove(event.itinerary_custom_event_id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

