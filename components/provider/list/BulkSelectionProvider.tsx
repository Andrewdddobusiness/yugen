"use client";

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useItineraryActivityStore, IItineraryActivity } from '@/store/itineraryActivityStore';
import { batchUpdateItineraryActivities, setItineraryActivityNotes, setItineraryActivityTimes } from '@/actions/supabase/actions';

// Use the interface from the store
type ItineraryActivity = IItineraryActivity;

interface UseBulkSelectionProps {
  activities: ItineraryActivity[];
  onRemoveActivity: (placeId: string) => void;
}

export function useBulkSelection({ activities, onRemoveActivity }: UseBulkSelectionProps) {
  const queryClient = useQueryClient();
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  
  // Undo functionality
  const [undoStack, setUndoStack] = useState<{
    operation: string;
    data: ItineraryActivity[];
    timestamp: number;
  }[]>([]);

  // Selection handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedActivities(new Set());
      setLastSelectedId(null);
    }
  };

  const toggleActivitySelection = (activityId: string, selected: boolean, event?: React.MouseEvent) => {
    const newSelected = new Set(selectedActivities);
    
    // Handle shift+click for range selection
    if (event?.shiftKey && lastSelectedId) {
      const visibleActivityIds = activities.map(a => a.itinerary_activity_id);
      const lastIndex = visibleActivityIds.indexOf(lastSelectedId);
      const currentIndex = visibleActivityIds.indexOf(activityId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        for (let i = start; i <= end; i++) {
          if (selected) {
            newSelected.add(visibleActivityIds[i]);
          } else {
            newSelected.delete(visibleActivityIds[i]);
          }
        }
      }
    } else {
      // Regular single selection
      if (selected) {
        newSelected.add(activityId);
      } else {
        newSelected.delete(activityId);
      }
    }
    
    setSelectedActivities(newSelected);
    setLastSelectedId(activityId);
    
    // Auto-enable selection mode if activities are selected
    if (newSelected.size > 0 && !selectionMode) {
      setSelectionMode(true);
    }
  };

  const selectNone = () => {
    setSelectedActivities(new Set());
  };

  const selectAll = useCallback(() => {
    const visibleIds = activities.map(a => a.itinerary_activity_id);
    setSelectedActivities(new Set(visibleIds));
    setSelectionMode(true);
  }, [activities]);

  const selectDay = (date: string, dayActivities: ItineraryActivity[]) => {
    const dayActivityIds = dayActivities.map(a => a.itinerary_activity_id);
    const newSelected = new Set(selectedActivities);
    
    dayActivityIds.forEach(id => newSelected.add(id));
    setSelectedActivities(newSelected);
    setSelectionMode(true);
  };

  const isActivitySelected = (activityId: string) => selectedActivities.has(activityId);
  
  const getSelectedActivities = () => {
    return activities.filter(activity => 
      selectedActivities.has(activity.itinerary_activity_id)
    );
  };

  // Undo functionality
  const saveToUndoStack = (operation: string, affectedActivities: ItineraryActivity[]) => {
    setUndoStack(prev => [
      ...prev.slice(-4), // Keep only last 5 operations
      {
        operation,
        data: JSON.parse(JSON.stringify(affectedActivities)), // Deep clone
        timestamp: Date.now()
      }
    ]);
  };

  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}?`
    );
    
    if (!confirmed) return;

    setBulkOperationLoading(true);
    
    try {
      // Delete activities one by one
      await Promise.all(
        selectedItems.map(activity => 
          onRemoveActivity(activity.activity?.place_id || '')
        )
      );
      
      setSelectedActivities(new Set());
      setSelectionMode(false);
      toast.success(`Deleted ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}`);
    } catch (error) {
      console.error('Error deleting activities:', error);
      toast.error('Failed to delete some activities');
    } finally {
      setBulkOperationLoading(false);
    }
  }, [getSelectedActivities, onRemoveActivity]);

  const handleBulkMove = async (targetDate: string) => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;

    // Save original state for undo
    saveToUndoStack('move', selectedItems);

    setBulkOperationLoading(true);
    
    try {
      // Move activities by updating their dates
      const updates = selectedItems.map(activity => ({
        id: activity.itinerary_activity_id,
        date: targetDate === 'unscheduled' ? null : targetDate,
        start_time: null, // Clear times when moving to new day
        end_time: null,
      }));
      
      const result = await batchUpdateItineraryActivities(updates);
      
      if (result.success) {
        // Update local state
        const updatedActivities = itineraryActivities.map(activity => {
          const update = updates.find(u => u.id === activity.itinerary_activity_id);
          return update ? { ...activity, ...update, itinerary_activity_id: update.id } : activity;
        });
        
        setItineraryActivities(updatedActivities);
        // Update cache directly instead of invalidating
        queryClient.setQueryData(["itineraryActivities"], updatedActivities);
        
        setSelectedActivities(new Set());
        setSelectionMode(false);
        
        const dateLabel = targetDate === 'unscheduled' ? 'Unscheduled' : format(new Date(targetDate), 'MMM d');
        toast.success(`Moved ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'} to ${dateLabel}`);
      } else {
        throw new Error(result.message || 'Move failed');
      }
    } catch (error) {
      console.error('Error moving activities:', error);
      toast.error('Failed to move activities');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkAddNotes = async (notes: string) => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0 || !notes.trim()) return;

    // Save original state for undo
    saveToUndoStack('notes', selectedItems);

    setBulkOperationLoading(true);
    
    try {
      await Promise.all(
        selectedItems.map(activity => 
          setItineraryActivityNotes(
            activity.itinerary_activity_id, 
            activity.notes ? `${activity.notes}\n\n${notes}` : notes
          )
        )
      );
      
      // Update local state
      const updatedActivities = itineraryActivities.map(activity => {
        if (selectedActivities.has(activity.itinerary_activity_id)) {
          return {
            ...activity,
            notes: activity.notes ? `${activity.notes}\n\n${notes}` : notes
          };
        }
        return activity;
      });
      
      setItineraryActivities(updatedActivities);
      // Update cache directly instead of invalidating  
      queryClient.setQueryData(["itineraryActivities"], updatedActivities);
      
      setSelectedActivities(new Set());
      setSelectionMode(false);
      
      toast.success(`Added notes to ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}`);
    } catch (error) {
      console.error('Error adding notes:', error);
      toast.error('Failed to add notes to some activities');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkSetTimes = async (startTime: string, endTime: string) => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;

    // Save original state for undo
    saveToUndoStack('times', selectedItems);

    setBulkOperationLoading(true);
    
    try {
      await Promise.all(
        selectedItems.map(activity => 
          setItineraryActivityTimes(
            activity.itinerary_activity_id,
            startTime || '',
            endTime || ''
          )
        )
      );
      
      // Update local state
      const updatedActivities = itineraryActivities.map(activity => {
        if (selectedActivities.has(activity.itinerary_activity_id)) {
          return {
            ...activity,
            start_time: startTime || null,
            end_time: endTime || null
          };
        }
        return activity;
      });
      
      setItineraryActivities(updatedActivities);
      // Update cache directly instead of invalidating  
      queryClient.setQueryData(["itineraryActivities"], updatedActivities);
      
      setSelectedActivities(new Set());
      setSelectionMode(false);
      
      const action = startTime || endTime ? 'Set times for' : 'Cleared times for';
      toast.success(`${action} ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}`);
    } catch (error) {
      console.error('Error setting times:', error);
      toast.error('Failed to set times for some activities');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  // Bulk export handler
  const handleBulkExport = () => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;
    
    try {
      // Create CSV content
      const csvHeader = 'Name,Date,Start Time,End Time,Address,Notes,Category,Rating,Price Level\n';
      const csvRows = selectedItems.map(activity => {
        const name = (activity.activity?.name || 'Unnamed Activity').replace(/"/g, '""');
        const date = activity.date || '';
        const startTime = activity.start_time || '';
        const endTime = activity.end_time || '';
        const address = (activity.activity?.address || '').replace(/"/g, '""');
        const notes = (activity.notes || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const category = activity.activity?.types?.[0] || '';
        const rating = activity.activity?.rating || '';
        const priceLevel = activity.activity?.price_level || '';
        
        return `"${name}","${date}","${startTime}","${endTime}","${address}","${notes}","${category}","${rating}","${priceLevel}"`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected-activities-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'} to CSV`);
    } catch (error) {
      console.error('Error exporting activities:', error);
      toast.error('Failed to export activities');
    }
  };

  return {
    // State
    selectedActivities,
    selectionMode,
    lastSelectedId,
    bulkOperationLoading,
    undoStack,
    
    // Selection handlers
    toggleSelectionMode,
    toggleActivitySelection,
    selectNone,
    selectAll,
    selectDay,
    isActivitySelected,
    getSelectedActivities,
    
    // Bulk operations
    handleBulkDelete,
    handleBulkMove,
    handleBulkAddNotes,
    handleBulkSetTimes,
    handleBulkExport,
  };
}