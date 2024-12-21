"use client";
import { useState } from "react";
import { StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NotesPopoverProps {
  id: string;
  value: string;
  onChange: (id: string, value: string) => void;
}

export function NotesPopover({ id, value, onChange }: NotesPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onChange(id, "");
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
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
              <p>Add note</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="relative group">
          <Textarea
            className="min-h-[40px] resize-y text-sm pr-8"
            placeholder="Add notes..."
            value={value}
            onChange={(e) => onChange(id, e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
