"use client";

import { useState } from 'react';
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

interface UseItineraryActivityEditorProps {
  activities: ItineraryActivity[];
}

export function useItineraryActivityEditor({ activities }: UseItineraryActivityEditorProps) {
  const optimisticUpdateItineraryActivity = useItineraryActivityStore(
    (s) => s.optimisticUpdateItineraryActivity
  );
  
  const [editingField, setEditingField] = useState<{ activityId: string; field: 'name' | 'time' | 'notes' } | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});

  const normalizeTimeToHHmm = (time: string | null) => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return '';
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  };

  const toTimeWithSeconds = (timeHHmm: string) => {
    if (!timeHHmm) return null;
    return timeHHmm.length === 5 ? `${timeHHmm}:00` : timeHHmm;
  };

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
    const start = normalizeTimeToHHmm(startTime);
    const end = normalizeTimeToHHmm(endTime);
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
      const patch = (() => {
        switch (editingField.field) {
          case 'name':
            return { activity: { name: value } };
          case 'time': {
            const { startTime, endTime } = parseTimeFromEditing(value);
            return {
              start_time: toTimeWithSeconds(startTime),
              end_time: toTimeWithSeconds(endTime),
            };
          }
          case 'notes':
            return { notes: value };
          default:
            return {};
        }
      })();

      const result = await optimisticUpdateItineraryActivity(activityId, patch);

      if (result.success) {
        toast.success('Activity updated successfully');
        setEditingField(null);
        setEditingValues({});
      } else {
        throw new Error(result.error || 'Update failed');
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
