"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { QuickFilterConfig } from './types';
import { QUICK_FILTERS } from './constants';

interface QuickFiltersProps {
  onApplyQuickFilter: (quickFilter: QuickFilterConfig) => void;
  className?: string;
}

export function QuickFilters({ onApplyQuickFilter, className }: QuickFiltersProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {QUICK_FILTERS.map(quickFilter => (
        <Button
          key={quickFilter.label}
          variant="outline"
          size="sm"
          onClick={() => onApplyQuickFilter(quickFilter)}
          className="h-7 text-xs"
        >
          {quickFilter.label}
        </Button>
      ))}
    </div>
  );
}