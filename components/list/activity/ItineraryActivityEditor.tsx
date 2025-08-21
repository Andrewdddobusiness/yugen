"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useQueryClient } from '@tanstack/react-query';
import { setItineraryActivityTimes, setItineraryActivityNotes, setActivityName } from '@/actions/supabase/actions';

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

interface UseItineraryActivityEditorProps {
  activities: ItineraryActivity[];
}

export function useItineraryActivityEditor({ activities }: UseItineraryActivityEditorProps) {
  const queryClient = useQueryClient();
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  
  const [editingField, setEditingField] = useState<{ activityId: string; field: 'name' | 'time' | 'notes' } | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});

  // Time formatting and validation utilities
  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const formatTimeForEditing = (startTime: string | null, endTime: string | null) => {
    const start = startTime || '';
    const end = endTime || '';
    return `${start}|${end}`;
  };

  const parseTimeFromEditing = (value: string) => {
    const [startTime, endTime] = value.split('|');
    return { startTime, endTime };
  };

  const isValidTime = (timeString: string) => {
    if (!timeString) return true; // Allow empty times
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  };

  const validateTimeInput = (value: string) => {
    const { startTime, endTime } = parseTimeFromEditing(value);
    return isValidTime(startTime) && isValidTime(endTime);
  };

  const getPriceDisplay = (priceLevel?: string) => {
    if (!priceLevel) return null;
    const level = parseInt(priceLevel);
    return '$'.repeat(Math.max(1, Math.min(4, level)));
  };

  // Editing handlers
  const startEditing = (activityId: string, field: 'name' | 'time' | 'notes', currentValue: string = '') => {
    setEditingField({ activityId, field });
    setEditingValues({ ...editingValues, [`${activityId}-${field}`]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditingValues({});
  };

  const handleEditingValueChange = (key: string, value: string) => {
    setEditingValues({ ...editingValues, [key]: value });
  };

  const saveField = async (activity: ItineraryActivity) => {
    if (!editingField) return;

    const key = `${editingField.activityId}-${editingField.field}`;
    const value = editingValues[key];
    const activityId = editingField.activityId;

    setSavingStates({ ...savingStates, [key]: true });

    try {
      let result;
      
      switch (editingField.field) {
        case 'name':
          if (!activity.activity?.activity_id) throw new Error('Activity ID not found');
          result = await setActivityName(activity.activity.activity_id, value);
          break;
        case 'time':
          const [startTime, endTime] = value.split('|');
          result = await setItineraryActivityTimes(activityId, startTime || '', endTime || '');
          break;
        case 'notes':
          result = await setItineraryActivityNotes(activityId, value);
          break;
        default:
          throw new Error('Unknown field type');
      }

      if (result.success) {
        // Update local state
        const updatedActivities = itineraryActivities.map(act => {
          if (act.itinerary_activity_id === activityId) {
            switch (editingField.field) {
              case 'name':
                return {
                  ...act,
                  activity: act.activity ? { ...act.activity, name: value } : act.activity
                };
              case 'time':
                const [startTime, endTime] = value.split('|');
                return { ...act, start_time: startTime || null, end_time: endTime || null };
              case 'notes':
                return { ...act, notes: value };
              default:
                return act;
            }
          }
          return act;
        });
        
        setItineraryActivities(updatedActivities);
        
        // Update cache directly for successful operations
        queryClient.setQueryData(["itineraryActivities"], (oldData: any) => 
          oldData?.map((activity: any) => {
            if (activity.itinerary_activity_id === activityId) {
              switch (editingField.field) {
                case 'name':
                  return {
                    ...activity,
                    activity: activity.activity ? { ...activity.activity, name: value } : activity.activity
                  };
                case 'time':
                  const [startTime, endTime] = value.split('|');
                  return { ...activity, start_time: startTime || null, end_time: endTime || null };
                case 'notes':
                  return { ...activity, notes: value };
                default:
                  return activity;
              }
            }
            return activity;
          }) || []
        );
        
        toast.success('Activity updated successfully');
        setEditingField(null);
        setEditingValues({});
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error saving field:', error);
      toast.error('Failed to update activity');
    } finally {
      setSavingStates({ ...savingStates, [key]: false });
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, activity: ItineraryActivity) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveField(activity);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  return {
    // State
    editingField,
    editingValues,
    savingStates,
    
    // Formatting utilities
    formatTime,
    formatTimeForEditing,
    validateTimeInput,
    getPriceDisplay,
    
    // Editing handlers
    startEditing,
    cancelEditing,
    saveField,
    handleEditKeyDown,
    handleEditingValueChange,
  };
}