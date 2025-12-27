"use client";
import { useEffect, useState } from "react";
import { StickyNote, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface NotesPopoverProps {
  itineraryActivityId: string;
}

export function NotesPopover({ itineraryActivityId }: NotesPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notes = useItineraryActivityStore((s) => {
    const activity = s.itineraryActivities.find(
      (a) => a.itinerary_activity_id === itineraryActivityId
    );
    return activity?.notes ?? "";
  });
  const optimisticUpdateItineraryActivity = useItineraryActivityStore(
    (s) => s.optimisticUpdateItineraryActivity
  );

  useEffect(() => {
    if (!isOpen) {
      setDraft(notes || "");
      setError(null);
    }
  }, [notes, isOpen]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setDraft(notes || "");
    setError(null);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
    setDraft(notes || "");
    setError(null);
  };

  return (
    <div className="relative">
      {!isOpen ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="lg" className="h-8 w-8 p-0 rounded-full" onClick={handleOpen}>
                <StickyNote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{notes ? "Edit note" : "Add note"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="relative group">
          <Textarea
            className="min-h-[40px] resize-y text-sm pr-8"
            placeholder="Add notes..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            onClick={handleClose}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="mt-2 flex items-center justify-end gap-2">
            {error && <div className="text-xs text-red-500 mr-auto">{error}</div>}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setDraft(notes || "");
                setError(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                setIsSaving(true);
                const result = await optimisticUpdateItineraryActivity(itineraryActivityId, {
                  notes: draft,
                });
                if (!result.success) {
                  setError(result.error || "Failed to save notes. Please try again.");
                  setIsSaving(false);
                  return;
                }
                setIsSaving(false);
                setIsOpen(false);
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
