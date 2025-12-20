"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavePlaceButtonProps {
  placeId: string;
  isSaved?: boolean;
  onToggle?: (isSaved: boolean) => void;
  className?: string;
  activityData?: any;
  variant?: string;
  size?: string;
  onSaved?: () => void;
}

export default function SavePlaceButton({ 
  placeId, 
  isSaved = false, 
  onToggle,
  className 
}: SavePlaceButtonProps) {
  const [saved, setSaved] = React.useState(isSaved);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !saved;
    setSaved(newState);
    onToggle?.(newState);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white",
        saved ? "text-red-500" : "text-gray-500",
        className
      )}
      onClick={handleToggle}
    >
      <Heart className={cn("h-4 w-4", saved && "fill-current")} />
    </Button>
  );
}
