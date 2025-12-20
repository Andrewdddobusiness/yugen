import { useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';

interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  activity?: {
    activity_id?: string;
    name: string;
    address?: string;
    coordinates?: [number, number];
    types?: string[];
    rating?: number;
    price_level?: string;
    phone_number?: string;
    website_url?: string;
    photo_names?: string[];
    place_id?: string;
  };
  deleted_at?: string | null;
}

interface BulkSelectionActions {
  selectAll: () => void;
  selectNone: () => void;
  handleBulkDelete: () => void;
  toggleSelectionMode: () => void;
  selectedActivities: Set<string>;
  selectionMode: boolean;
}

interface UseKeyboardShortcutsProps {
  activeActivities: ItineraryActivity[];
  expandAllDays: () => void;
  collapseAllDays: () => void;
  bulkSelectionActions: BulkSelectionActions;
}

/**
 * Custom hook for handling global keyboard shortcuts in the itinerary list
 * 
 * Features:
 * - Expand/collapse all days (Ctrl+Shift+E/C)
 * - Bulk selection shortcuts (Ctrl+A/D)
 * - Delete selected activities (Delete key)
 * - Exit selection mode (Escape)
 * - Activity reordering (Alt+Arrow keys)
 */
export function useKeyboardShortcuts({
  activeActivities,
  expandAllDays,
  collapseAllDays,
  bulkSelectionActions,
}: UseKeyboardShortcutsProps) {
  const { setItineraryActivities } = useItineraryActivityStore();

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Expand/collapse shortcuts
      if (event.ctrlKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'e':
            event.preventDefault();
            expandAllDays();
            break;
          case 'c':
            event.preventDefault();
            collapseAllDays();
            break;
        }
      }

      // Bulk selection shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'a':
            event.preventDefault();
            bulkSelectionActions.selectAll();
            break;
          case 'd':
            event.preventDefault();
            bulkSelectionActions.selectNone();
            break;
        }
      }
      
      // Delete selected activities
      if (event.key === 'Delete' && bulkSelectionActions.selectedActivities.size > 0) {
        event.preventDefault();
        bulkSelectionActions.handleBulkDelete();
      }
      
      // Toggle selection mode
      if (event.key === 'Escape' && bulkSelectionActions.selectionMode) {
        event.preventDefault();
        bulkSelectionActions.toggleSelectionMode();
      }

      // Alt + Arrow keys for reordering within focused activity
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        
        // Find the focused element
        const focusedElement = document.activeElement;
        if (!focusedElement) return;

        // Find the parent sortable item
        const sortableItem = focusedElement.closest('[data-sortable-id]');
        if (!sortableItem) return;

        const activityId = sortableItem.getAttribute('data-sortable-id');
        if (!activityId) return;

        // Find the activity and its current position
        const activity = activeActivities.find(a => a.itinerary_activity_id === activityId);
        if (!activity) return;

        const dateKey = activity.date ? new Date(activity.date).toISOString().split("T")[0] : 'unscheduled';
        const dayActivities = activeActivities.filter(a => {
          const actDate = a.date || 'unscheduled';
          const actKey = actDate === 'unscheduled' ? 'unscheduled' : new Date(actDate).toISOString().split("T")[0];
          return actKey === dateKey;
        });

        const currentIndex = dayActivities.findIndex(a => a.itinerary_activity_id === activityId);
        if (currentIndex === -1) return;

        // Determine new index
        const newIndex = event.key === 'ArrowUp' 
          ? Math.max(0, currentIndex - 1)
          : Math.min(dayActivities.length - 1, currentIndex + 1);

        if (newIndex === currentIndex) return;

        // Reorder activities
        const reorderedDayActivities = arrayMove(dayActivities, currentIndex, newIndex);

        // Update the full activities list
        const newActivities = activeActivities.map(act => {
          const updated = reorderedDayActivities.find(a => a.itinerary_activity_id === act.itinerary_activity_id);
          return updated || act;
        });

        // Update local state
        setItineraryActivities(newActivities as any);

        // Show feedback
        toast.success(`Moved ${activity.activity?.name || 'activity'} ${event.key === 'ArrowUp' ? 'up' : 'down'}`);

        // Maintain focus on the moved item
        setTimeout(() => {
          const movedItem = document.querySelector(`[data-sortable-id="${activityId}"]`);
          if (movedItem) {
            const focusableElement = movedItem.querySelector('button, [tabindex="0"]') as HTMLElement;
            focusableElement?.focus();
          }
        }, 100);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeActivities, setItineraryActivities, collapseAllDays, expandAllDays, bulkSelectionActions]);
}