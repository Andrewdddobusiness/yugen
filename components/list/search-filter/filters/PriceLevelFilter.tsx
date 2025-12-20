"use client";

import React from 'react';
import { DollarSign } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FILTER_PRICE_LEVELS } from '../constants';

interface PriceLevelFilterProps {
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
}

export function PriceLevelFilter({ 
  selectedLevels, 
  onToggleLevel 
}: PriceLevelFilterProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <DollarSign className="h-4 w-4" />
        Price Level
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {FILTER_PRICE_LEVELS.map(price => (
          <div key={price.value} className="flex items-center space-x-2">
            <Checkbox
              id={`price-${price.value}`}
              checked={selectedLevels.includes(price.value)}
              onCheckedChange={() => onToggleLevel(price.value)}
            />
            <Label
              htmlFor={`price-${price.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {price.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}