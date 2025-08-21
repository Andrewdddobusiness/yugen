"use client";

import React from 'react';
import { Square, CheckSquare2 } from 'lucide-react';

interface ActivitySelectionCheckboxProps {
  activityId: string;
  activityName?: string;
  isSelected: boolean;
  onToggle: (activityId: string, selected: boolean, event?: React.MouseEvent) => void;
}

export const ActivitySelectionCheckbox = React.memo(({
  activityId,
  activityName = 'activity',
  isSelected,
  onToggle
}: ActivitySelectionCheckboxProps) => {
  return (
    <div className="flex items-center justify-center pt-1">
      <button
        className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(activityId, !isSelected, e);
        }}
        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${activityName}`}
      >
        {isSelected ? (
          <CheckSquare2 className="h-5 w-5 text-blue-600" />
        ) : (
          <Square className="h-5 w-5 text-gray-400 hover:text-blue-500" />
        )}
      </button>
    </div>
  );
});

ActivitySelectionCheckbox.displayName = 'ActivitySelectionCheckbox';