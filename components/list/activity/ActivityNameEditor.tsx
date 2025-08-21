"use client";

import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ActivityNameEditorProps {
  value: string;
  isSaving: boolean;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const ActivityNameEditor = React.memo(({
  value,
  isSaving,
  onValueChange,
  onSave,
  onCancel,
  onKeyDown
}: ActivityNameEditorProps) => {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="font-medium text-gray-900 h-8 text-base"
        autoFocus
        placeholder="Activity name"
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={isSaving}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ActivityNameEditor.displayName = 'ActivityNameEditor';