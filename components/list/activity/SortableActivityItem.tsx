"use client";

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Import types
import type { SortableActivityItemProps } from './types';

// Import sub-components
import { ActivitySelectionCheckbox } from './ActivitySelectionCheckbox';
import { ActivityTimeDisplay } from './ActivityTimeDisplay';
import { ActivityTimeEditor } from './ActivityTimeEditor';
import { ActivityNameEditor } from './ActivityNameEditor';
import { ActivityCardDisplay } from './ActivityCardDisplay';
import { ActivityNotesSection } from './ActivityNotesSection';
import { ActivityCreatedBy } from '@/components/collaboration/ActivityCreatedBy';

export const SortableActivityItem = React.memo(function SortableActivityItem(props: SortableActivityItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isCurrentlyDragging,
  } = useSortable({ id: props.activity.itinerary_activity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging ? 0.5 : 1,
  };

  const {
    activity,
    editingField,
    editingValues,
    savingStates,
    onStartEditing,
    onCancelEditing,
    onSaveField,
    onRemoveActivity,
    onEditKeyDown,
    onEditingValueChange,
    formatTime,
    formatTimeForEditing,
    validateTimeInput,
    getPriceDisplay,
    isMobile,
    isSelected,
    onToggleSelection,
    selectionMode,
    searchTerm
  } = props;

  // Check if currently editing
  const isEditingTime = editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'time';
  const isEditingName = editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'name';
  const isEditingNotes = editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'notes';

  return (
    <div ref={setNodeRef} style={style} data-sortable-id={activity.itinerary_activity_id}>
      <Card className={cn(
        "hover:shadow-md transition-shadow",
        isCurrentlyDragging && "shadow-lg ring-2 ring-blue-500",
        isSelected && "ring-2 ring-blue-500 bg-blue-50/30"
      )}>
        <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
          <div className={cn("flex items-start", isMobile ? "gap-3" : "gap-4")}>
            {/* Selection Checkbox */}
            {selectionMode && (
              <ActivitySelectionCheckbox
                activityId={activity.itinerary_activity_id}
                activityName={activity.activity?.name}
                isSelected={isSelected}
                onToggle={onToggleSelection}
              />
            )}

            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="flex items-center justify-center cursor-move touch-none p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title="Drag to reorder (or use Alt+Arrow keys)"
              tabIndex={0}
              aria-label="Drag to reorder activity"
            >
              <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>

            {/* Time Section */}
            {isEditingTime ? (
              <ActivityTimeEditor
                activityId={activity.itinerary_activity_id}
                value={editingValues[`${activity.itinerary_activity_id}-time`] || ''}
                isSaving={savingStates[`${activity.itinerary_activity_id}-time`] || false}
                onValueChange={(value) => onEditingValueChange(`${activity.itinerary_activity_id}-time`, value)}
                onSave={() => onSaveField(activity)}
                onCancel={onCancelEditing}
                onKeyDown={(e) => onEditKeyDown(e, activity)}
                validateTimeInput={validateTimeInput}
              />
            ) : (
              <ActivityTimeDisplay
                startTime={activity.start_time}
                endTime={activity.end_time}
                formatTime={formatTime}
                onEdit={() => onStartEditing(
                  activity.itinerary_activity_id,
                  'time',
                  formatTimeForEditing(activity.start_time, activity.end_time)
                )}
                isMobile={isMobile}
              />
            )}

            {/* Main Content Area */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                {/* Activity Details or Name Editor */}
                {isEditingName ? (
                  <ActivityNameEditor
                    value={editingValues[`${activity.itinerary_activity_id}-name`] || ''}
                    isSaving={savingStates[`${activity.itinerary_activity_id}-name`] || false}
                    onValueChange={(value) => onEditingValueChange(`${activity.itinerary_activity_id}-name`, value)}
                    onSave={() => onSaveField(activity)}
                    onCancel={onCancelEditing}
                    onKeyDown={(e) => onEditKeyDown(e, activity)}
                  />
                ) : (
                  <ActivityCardDisplay
                    activity={activity.activity}
                    searchTerm={searchTerm}
                    getPriceDisplay={getPriceDisplay}
                    isMobile={isMobile}
                    onEditName={() => onStartEditing(
                      activity.itinerary_activity_id,
                      'name',
                      activity.activity?.name || ''
                    )}
                  />
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onRemoveActivity(activity.activity?.place_id || '')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ActivityCreatedBy
                userId={activity.created_by}
                mode={isMobile ? "text" : "both"}
                avatarClassName="h-5 w-5"
              />

              {/* Notes Section */}
              <ActivityNotesSection
                notes={activity.notes}
                isEditing={isEditingNotes}
                editValue={editingValues[`${activity.itinerary_activity_id}-notes`] || ''}
                isSaving={savingStates[`${activity.itinerary_activity_id}-notes`] || false}
                searchTerm={searchTerm}
                onStartEdit={() => onStartEditing(
                  activity.itinerary_activity_id,
                  'notes',
                  activity.notes || ''
                )}
                onValueChange={(value) => onEditingValueChange(`${activity.itinerary_activity_id}-notes`, value)}
                onSave={() => onSaveField(activity)}
                onCancel={onCancelEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
