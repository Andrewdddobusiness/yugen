"use client";

import React, { useMemo } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useItineraryCollaborationStore } from "@/store/itineraryCollaborationStore";

type Mode = "avatar" | "text" | "both";

const getInitials = (name: string | null | undefined) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join("");
};

export function ActivityCreatedBy({
  userId,
  mode = "avatar",
  className,
  avatarClassName,
  textClassName,
}: {
  userId?: string | null;
  mode?: Mode;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
}) {
  const member = useItineraryCollaborationStore((s) =>
    userId ? s.members.find((m) => m.user_id === userId) : undefined
  );

  const name = member?.profile?.display_name ?? null;
  const initials = useMemo(() => getInitials(name), [name]);

  if (!userId) return null;

  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      {(mode === "avatar" || mode === "both") && (
        <Avatar className={cn("h-6 w-6 rounded-full", avatarClassName)}>
          <AvatarImage src={member?.profile?.avatar_url ?? undefined} alt={name ?? "User"} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
      )}
      {(mode === "text" || mode === "both") && (
        <span className={cn("text-xs text-muted-foreground", textClassName)}>
          Added by <span className="text-ink-900">{name ?? "Unknown"}</span>
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>Added by {name ?? "Unknown"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

