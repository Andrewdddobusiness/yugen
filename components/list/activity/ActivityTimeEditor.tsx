"use client";

import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ActivityTimeEditorProps {
  activityId: string;
  value: string;
  isSaving: boolean;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  validateTimeInput: (value: string) => boolean;
}

export const ActivityTimeEditor = React.memo(({
  activityId,
  value,
  isSaving,
  onValueChange,
  onSave,
  onCancel,
  onKeyDown,
  validateTimeInput
}: ActivityTimeEditorProps) => {
  const isValid = validateTimeInput(value);

  return (
    <div className="space-y-2 w-full">
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          "text-xs h-7 text-center",
          !isValid && "border-red-500"
        )}
        placeholder="09:00|17:00"
        autoFocus
      />
      <div className="flex justify-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={isSaving || !isValid}
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-xs text-gray-400 text-center">HH:MM format</div>
    </div>
  );
});

ActivityTimeEditor.displayName = 'ActivityTimeEditor';