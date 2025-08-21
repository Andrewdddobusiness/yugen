"use client";

import React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FilterBadgeProps {
  icon: LucideIcon;
  label: string;
  onRemove: () => void;
  className?: string;
}

export function FilterBadge({ icon: Icon, label, onRemove, className }: FilterBadgeProps) {
  return (
    <Badge variant="secondary" className={`gap-1 ${className || ''}`}>
      <Icon className="h-3 w-3" />
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}