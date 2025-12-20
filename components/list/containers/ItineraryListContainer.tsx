"use client";

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { BulkActionToolbar } from '../bulk-actions/BulkActionToolbar';
import { SearchAndFilter } from '../SearchAndFilter';
import { TravelTimeConflicts } from '@/components/travel/TravelTimeConflicts';
import { ItineraryDayHeader } from '../ItineraryDayHeader';
import { ItineraryActivityList } from '../activity/ItineraryActivityList';
import { ItineraryDragDropProvider } from '@/components/provider/dnd/ItineraryDragDropProvider';
import { useItineraryActivityEditor } from '../activity/ItineraryActivityEditor';
import { useBulkSelection } from '@/components/provider/list/BulkSelectionProvider';
import { ItineraryListProvider, useItineraryListContext } from '@/components/provider/list/ItineraryListProvider';
import { ItineraryListToolbar } from '../components/ItineraryListToolbar';
import { ItineraryListEmptyStates } from '../components/ItineraryListEmptyStates';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface ItineraryListContainerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

/**
 * ItineraryListContainer - Main container component for itinerary list view
 * 
 * Features:
 * - Composed architecture using provider pattern
 * - Drag & drop functionality
 * - Bulk selection and actions
 * - Search and filtering
 * - Travel time integration
 * - Keyboard shortcuts
 * - Responsive design
 * - Empty state handling
 * 
 * Architecture:
 * - Uses ItineraryListProvider for state management
 * - Delegates complex logic to custom hooks
 * - Composed of smaller, focused components
 * - Layout-only responsibility in main component
 */
export function ItineraryListContainer({ containerRef, className }: ItineraryListContainerProps) {
  return (
    <ItineraryListProvider>
      <ItineraryListContent containerRef={containerRef} className={className} />
    </ItineraryListProvider>
  );
}

/**
 * ItineraryListContent - Internal content component that uses the context
 * This is separated to avoid the provider/consumer pattern issues
 */
function ItineraryListContent({ containerRef, className }: ItineraryListContainerProps) {
  const isMobile = useIsMobile();
  
  // Get all state and actions from context
  const {
    activeActivities,
    filteredActivities,
    setFilteredActivities,
    activitiesForGrouping,
    groupedActivities,
    currentSearchTerm,
    setCurrentSearchTerm,
    useTimeSlotView,
    setUseTimeSlotView,
    toggleDayExpansion,
    expandAllDays,
    collapseAllDays,
    isExpanded,
    travelModes,
    setTravelModes,
    travelTimes,
    travelTimesLoading,
    refreshTravelTimes,
    handleRemoveActivity,
    availableDates,
    filterableActivities,
  } = useItineraryListContext();

  // Activity editor hook
  const {
    startEditing: onStartEditing,
    cancelEditing: onCancelEditing,
    saveField: onSaveField,
    handleEditKeyDown: onEditKeyDown,
    handleEditingValueChange: onEditingValueChange,
    ...restEditorProps
  } = useItineraryActivityEditor({ activities: activeActivities });
  
  const editorProps = {
    onStartEditing,
    onCancelEditing,
    onSaveField,
    onEditKeyDown,
    onEditingValueChange,
    ...restEditorProps,
  };

  // Bulk selection hook
  const bulkSelectionProps = useBulkSelection({ 
    activities: activeActivities, 
    onRemoveActivity: handleRemoveActivity 
  });

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    activeActivities,
    expandAllDays,
    collapseAllDays,
    bulkSelectionActions: bulkSelectionProps,
  });

  // Handle filtered activities from search component
  const handleFilteredActivitiesChange = useCallback((filtered: typeof filteredActivities) => {
    setFilteredActivities(filtered);
  }, [setFilteredActivities]);

  // Handle search term change for highlighting
  const handleSearchTermChange = useCallback((searchTerm: string) => {
    setCurrentSearchTerm(searchTerm);
  }, [setCurrentSearchTerm]);

  return (
    <div ref={containerRef} className={cn("space-y-6", isMobile ? "p-4" : "p-6", className)}>
      {/* Search and Filter Component */}
      <SearchAndFilter
        activities={filterableActivities}
        onFilteredActivitiesChange={handleFilteredActivitiesChange}
        onSearchTermChange={handleSearchTermChange}
        className="-mx-2 -mt-2"
      />

      {/* Bulk Action Toolbar */}
      {bulkSelectionProps.selectionMode && (
        <div role="toolbar" aria-label="Bulk actions for selected activities">
          <BulkActionToolbar
            selectedCount={bulkSelectionProps.selectedActivities.size}
            onSelectAll={bulkSelectionProps.selectAll}
            onSelectNone={bulkSelectionProps.selectNone}
            onBulkDelete={bulkSelectionProps.handleBulkDelete}
            onBulkMove={bulkSelectionProps.handleBulkMove}
            onBulkAddNotes={bulkSelectionProps.handleBulkAddNotes}
            onBulkSetTimes={bulkSelectionProps.handleBulkSetTimes}
            onBulkExport={bulkSelectionProps.handleBulkExport}
            onToggleSelectionMode={bulkSelectionProps.toggleSelectionMode}
            availableDates={availableDates}
            loading={bulkSelectionProps.bulkOperationLoading}
          />
        </div>
      )}

      {/* Empty States */}
      <ItineraryListEmptyStates 
        hasActivities={activeActivities.length > 0}
        hasFilteredResults={groupedActivities.length > 0}
      />

      {/* Toolbar - shown when activities exist */}
      {groupedActivities.length > 0 && (
        <ItineraryListToolbar
          filteredCount={filteredActivities.length}
          totalCount={activeActivities.length}
          dayCount={groupedActivities.length}
          useTimeSlotView={useTimeSlotView}
          onToggleTimeSlotView={() => setUseTimeSlotView(!useTimeSlotView)}
          onExpandAllDays={expandAllDays}
          onCollapseAllDays={collapseAllDays}
          bulkSelectionActions={bulkSelectionProps}
          travelModes={travelModes}
          onTravelModesChange={setTravelModes}
          onRefreshTravelTimes={refreshTravelTimes}
          isMobile={isMobile}
        />
      )}
      
      {/* Activities List */}
      {groupedActivities.length > 0 && (
        <div role="main" aria-label="Itinerary activities by day">
          <ItineraryDragDropProvider
            activities={activitiesForGrouping}
            isMobile={isMobile}
            formatTime={editorProps.formatTime}
          >
            {groupedActivities.map(([date, activities]) => {
              const expanded = isExpanded(date);
              
              return (
                <Collapsible key={date} open={expanded} onOpenChange={() => toggleDayExpansion(date)}>
                  <div className="space-y-4">
                    {/* Day Header */}
                    <ItineraryDayHeader
                      date={date}
                      activities={activities}
                      expanded={expanded}
                      onToggleExpansion={toggleDayExpansion}
                      onSelectDay={(date) => bulkSelectionProps.selectDay(date, activities)}
                      selectionMode={bulkSelectionProps.selectionMode}
                      isMobile={isMobile}
                      travelTimes={travelTimes[date]}
                    />

                    {/* Collapsible Activities Content */}
                    <CollapsibleContent className="collapsible-content space-y-3">
                      <ItineraryActivityList
                        date={date}
                        activities={activities}
                        useTimeSlotView={useTimeSlotView}
                        isMobile={isMobile}
                        {...editorProps}
                        onRemoveActivity={handleRemoveActivity}
                        onBulkDelete={bulkSelectionProps.handleBulkDelete}
                        selectedActivities={bulkSelectionProps.selectedActivities}
                        selectionMode={bulkSelectionProps.selectionMode}
                        onToggleSelection={bulkSelectionProps.toggleActivitySelection}
                        isActivitySelected={bulkSelectionProps.isActivitySelected}
                        travelTimes={travelTimes[date] ? Object.fromEntries(
                          travelTimes[date].map(t => [t.fromActivityId, t.duration])
                        ) : {}}
                        travelTimesData={travelTimes[date] ? Object.fromEntries(
                          travelTimes[date].map(t => [t.fromActivityId, {
                            duration: t.duration,
                            durationValue: t.durationValue,
                            mode: t.mode
                          }])
                        ) : {}}
                        travelTimesLoading={!!travelTimesLoading[date]}
                        searchTerm={currentSearchTerm}
                      />

                      {/* Travel Time Conflicts */}
                      {(() => {
                        const dayTravelTimes = travelTimes[date] || [];
                        if (dayTravelTimes.length > 0) {
                          const dayActivitiesWithCoords = activities.map(activity => ({
                            itinerary_activity_id: activity.itinerary_activity_id,
                            start_time: activity.start_time,
                            end_time: activity.end_time,
                            activity: activity.activity ? {
                              name: activity.activity.name,
                              coordinates: activity.activity.coordinates
                            } : undefined
                          }));
                          
                          return (
                            <div className={cn("mt-4", isMobile ? "ml-8" : "ml-10")}>
                              <TravelTimeConflicts
                                activities={dayActivitiesWithCoords}
                                travelTimes={dayTravelTimes}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </ItineraryDragDropProvider>
        </div>
      )}
    </div>
  );
}