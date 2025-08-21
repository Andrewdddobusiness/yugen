"use client";

import React from 'react';
import { Edit3, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HighlightedText } from '@/components/ui/highlighted-text';

interface ActivityNotesSectionProps {
  notes?: string;
  isEditing: boolean;
  editValue: string;
  isSaving: boolean;
  searchTerm: string;
  onStartEdit: () => void;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const ActivityNotesSection = React.memo(({
  notes,
  isEditing,
  editValue,
  isSaving,
  searchTerm,
  onStartEdit,
  onValueChange,
  onSave,
  onCancel
}: ActivityNotesSectionProps) => {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editValue}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          className="min-h-[80px] text-sm resize-y"
          placeholder="Add notes about this activity..."
          autoFocus
        />
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">Ctrl+Enter to save, Esc to cancel</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onSave}
              disabled={isSaving}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-2">
      {notes ? (
        <div 
          className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors group border border-dashed border-gray-200 hover:border-gray-300"
          onClick={onStartEdit}
          title="Click to edit notes"
        >
          <div className="flex items-start gap-2">
            <div className="text-gray-400 group-hover:text-blue-500">
              <Edit3 className="h-4 w-4" />
            </div>
            <div className="flex-1 group-hover:text-blue-600">
              <HighlightedText 
                text={notes}
                searchTerm={searchTerm}
              />
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onStartEdit}
          className="text-gray-500 hover:text-blue-600 hover:border-blue-300 border-dashed"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Add notes
        </Button>
      )}
    </div>
  );
});

ActivityNotesSection.displayName = 'ActivityNotesSection';