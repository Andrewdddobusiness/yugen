"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Calendar, List, Edit3, Trash2, Move, Filter } from 'lucide-react';
import { useMobileEnhanced } from '@/components/hooks/use-mobile-enhanced';
import { MobileTopBar } from './MobileNavigation';
import { MobileViewSwitcher, MobileFAB } from './MobileNavigation';
import { MobileTimeSlots } from './MobileTimeSlots';
import { MobileActivityCard } from './MobileActivityCard';
import { SwipeActionCard, SwipeNavigation } from './SwipeGestures';
import { ActivityBottomSheet, QuickActionsBottomSheet } from './MobileBottomSheet';
import { useHapticFeedback, useScreenReaderAnnouncements } from './MobileAccessibility';
import { TouchDraggable, useTouchDrag } from './TouchDragHandler';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileItineraryViewProps {
  itineraryName: string;
  groupedActivities: Array<[string, any[]]>;
  selectedActivities: Set<string>;
  currentView: 'calendar' | 'list';
  onViewChange: (view: 'calendar' | 'list') => void;
  onActivitySelect: (activityId: string) => void;
  onActivityEdit: (activityId: string) => void;
  onActivityDelete: (activityId: string) => void;
  onActivityMove: (activityId: string, newDate: string) => void;
  onAddActivity: () => void;
  className?: string;
}

export function MobileItineraryView({
  itineraryName,
  groupedActivities,
  selectedActivities,
  currentView,
  onViewChange,
  onActivitySelect,
  onActivityEdit,
  onActivityDelete,
  onActivityMove,
  onAddActivity,
  className,
}: MobileItineraryViewProps) {
  const { isMobile, deviceType, orientation } = useMobileEnhanced();
  const { hapticTap, hapticPress, hapticSuccess, hapticError } = useHapticFeedback();
  const { announceNavigation, announceAction } = useScreenReaderAnnouncements();

  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedActivityForSheet, setSelectedActivityForSheet] = useState<any>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [draggedActivity, setDraggedActivity] = useState<string | null>(null);

  // Calculate total activity count
  const totalActivities = useMemo(() => {
    return groupedActivities.reduce((sum, [, activities]) => sum + activities.length, 0);
  }, [groupedActivities]);

  // Handle day expansion
  const toggleDayExpansion = useCallback((date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
    hapticTap();
  }, [hapticTap]);

  // Handle activity selection with haptic feedback
  const handleActivitySelect = useCallback((activityId: string) => {
    onActivitySelect(activityId);
    hapticTap();
    announceAction(selectedActivities.has(activityId) ? 'Activity deselected' : 'Activity selected');
  }, [onActivitySelect, hapticTap, selectedActivities, announceAction]);

  // Handle view changes
  const handleViewChange = useCallback((view: 'calendar' | 'list') => {
    onViewChange(view);
    hapticTap();
    announceNavigation(`${view} view`);
  }, [onViewChange, hapticTap, announceNavigation]);

  // Touch drag configuration
  const touchDragConfig = {
    longPressDelay: 500,
    enableHaptics: true,
    onDragStart: (activityId: string) => {
      setDraggedActivity(activityId);
      hapticPress();
      announceAction('Started dragging activity');
    },
    onDragEnd: (activityId: string, dropTarget?: string) => {
      if (dropTarget && dropTarget !== 'current-day') {
        onActivityMove(activityId, dropTarget);
        hapticSuccess();
        announceAction('Activity moved to new day');
      }
      setDraggedActivity(null);
    },
  };

  // Activity action handlers
  const handleActivityEdit = useCallback((activityId: string) => {
    onActivityEdit(activityId);
    hapticTap();
  }, [onActivityEdit, hapticTap]);

  const handleActivityDelete = useCallback((activityId: string) => {
    onActivityDelete(activityId);
    hapticError();
    announceAction('Activity deleted');
  }, [onActivityDelete, hapticError, announceAction]);

  const handleActivityTap = useCallback((activity: any) => {
    setSelectedActivityForSheet(activity);
    hapticTap();
  }, [hapticTap]);

  // Quick actions for selected activities
  const getQuickActions = useCallback(() => {
    const selectedCount = selectedActivities.size;
    
    if (selectedCount === 0) {
      return [];
    }

    return [
      {
        icon: <Edit3 className="h-5 w-5" />,
        label: `Edit ${selectedCount} ${selectedCount === 1 ? 'activity' : 'activities'}`,
        action: () => {
          // Handle bulk edit
          hapticTap();
        },
      },
      {
        icon: <Move className="h-5 w-5" />,
        label: `Move ${selectedCount} ${selectedCount === 1 ? 'activity' : 'activities'}`,
        action: () => {
          // Handle bulk move
          hapticTap();
        },
      },
      {
        icon: <Trash2 className="h-5 w-5" />,
        label: `Delete ${selectedCount} ${selectedCount === 1 ? 'activity' : 'activities'}`,
        action: () => {
          // Handle bulk delete
          selectedActivities.forEach(id => onActivityDelete(id));
          hapticError();
        },
        destructive: true,
      },
    ];
  }, [selectedActivities, onActivityDelete, hapticTap, hapticError]);

  // Don't render mobile view on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <div className={cn("flex flex-col h-screen bg-gray-50 dark:bg-gray-900", className)}>
      {/* Mobile Top Bar */}
      <MobileTopBar
        title={itineraryName}
        subtitle={`${totalActivities} ${totalActivities === 1 ? 'activity' : 'activities'}`}
        rightAction={
          selectedActivities.size > 0
            ? {
                icon: <Filter className="h-5 w-5" />,
                action: () => setShowQuickActions(true),
                label: 'Bulk actions',
              }
            : undefined
        }
        badge={selectedActivities.size > 0 ? selectedActivities.size : undefined}
      />

      {/* View Switcher */}
      <MobileViewSwitcher
        currentView={currentView}
        onViewChange={handleViewChange}
        activityCount={totalActivities}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'list' ? (
          // List View with Day Navigation
          <SwipeNavigation
            currentIndex={currentDayIndex}
            totalItems={groupedActivities.length}
            onNavigate={setCurrentDayIndex}
            className="h-full"
          >
            <div className="overflow-y-auto pb-20 px-2">
              {groupedActivities.map(([date, activities], index) => {
                if (index !== currentDayIndex) return null;
                
                return (
                  <div key={date} className="space-y-3">
                    {activities.map((activity) => (
                      <SwipeActionCard
                        key={activity.itinerary_activity_id}
                        leftAction={{
                          icon: <Edit3 className="h-4 w-4" />,
                          label: 'Edit',
                          action: () => handleActivityEdit(activity.itinerary_activity_id),
                          color: 'bg-blue-500',
                        }}
                        rightAction={{
                          icon: <Trash2 className="h-4 w-4" />,
                          label: 'Delete',
                          action: () => handleActivityDelete(activity.itinerary_activity_id),
                          color: 'bg-red-500',
                        }}
                      >
                        <TouchDraggable
                          id={activity.itinerary_activity_id}
                          config={touchDragConfig}
                        >
                          <MobileActivityCard
                            activity={activity}
                            isSelected={selectedActivities.has(activity.itinerary_activity_id)}
                            onSelect={() => handleActivitySelect(activity.itinerary_activity_id)}
                            onEdit={() => handleActivityEdit(activity.itinerary_activity_id)}
                            onDelete={() => handleActivityDelete(activity.itinerary_activity_id)}
                            className="cursor-pointer"
                            onClick={() => handleActivityTap(activity)}
                          />
                        </TouchDraggable>
                      </SwipeActionCard>
                    ))}
                  </div>
                );
              })}
            </div>
          </SwipeNavigation>
        ) : (
          // Time Slots View
          <div className="overflow-y-auto pb-20">
            {groupedActivities.map(([date, activities]) => (
              <MobileTimeSlots
                key={date}
                date={date}
                activities={activities}
                isExpanded={expandedDays.has(date)}
                onToggleExpanded={() => toggleDayExpansion(date)}
                onActivityEdit={handleActivityEdit}
                onActivitySelect={handleActivitySelect}
                selectedActivities={selectedActivities}
                onAddActivity={onAddActivity}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <MobileFAB
        icon={<Plus className="h-6 w-6" />}
        label="Add Activity"
        onClick={() => {
          onAddActivity();
          hapticTap();
        }}
        position="bottom-right"
      />

      {/* Activity Details Bottom Sheet */}
      <ActivityBottomSheet
        activity={selectedActivityForSheet}
        isOpen={!!selectedActivityForSheet}
        onClose={() => setSelectedActivityForSheet(null)}
        onEdit={() => {
          if (selectedActivityForSheet) {
            handleActivityEdit(selectedActivityForSheet.itinerary_activity_id);
          }
          setSelectedActivityForSheet(null);
        }}
        onDelete={() => {
          if (selectedActivityForSheet) {
            handleActivityDelete(selectedActivityForSheet.itinerary_activity_id);
          }
          setSelectedActivityForSheet(null);
        }}
      />

      {/* Quick Actions Bottom Sheet */}
      <QuickActionsBottomSheet
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        actions={getQuickActions()}
      />
    </div>
  );
}

// Mobile-specific layout wrapper
interface MobileLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export function MobileLayout({ children, showNavigation = true }: MobileLayoutProps) {
  const { isMobile, orientation } = useMobileEnhanced();

  if (!isMobile) {
    return <>{children}</>; // Return unwrapped on desktop
  }

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 dark:bg-gray-900",
      "touch-manipulation select-none",
      orientation === 'landscape' && "landscape:px-safe landscape:py-safe"
    )}>
      {/* Safe area handling for notches */}
      <div className="pt-safe pb-safe">
        {children}
      </div>

      {/* Add bottom padding for navigation if shown */}
      {showNavigation && <div className="h-16" />}
    </div>
  );
}