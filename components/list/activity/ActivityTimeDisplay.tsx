"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface ActivityTimeDisplayProps {
  startTime: string | null;
  endTime: string | null;
  formatTime: (timeString: string | null) => string | null;
  onEdit: () => void;
  isMobile: boolean;
}

export const ActivityTimeDisplay = React.memo(({
  startTime,
  endTime,
  formatTime,
  onEdit,
  isMobile
}: ActivityTimeDisplayProps) => {
  return (
    <div className={cn("flex flex-col items-center", isMobile ? "min-w-[70px]" : "min-w-[110px]")}>
      <div 
        className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors group"
        onClick={onEdit}
        title="Click to edit times"
      >
        {startTime ? (
          <>
            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              {formatTime(startTime)}
            </span>
            {endTime && (
              <>
                <div className="w-px h-4 bg-gray-300 my-1" />
                <span className="text-xs text-gray-500 group-hover:text-blue-600">
                  {formatTime(endTime)}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-400 group-hover:text-blue-600">Add time</span>
        )}
      </div>
    </div>
  );
});

ActivityTimeDisplay.displayName = 'ActivityTimeDisplay';