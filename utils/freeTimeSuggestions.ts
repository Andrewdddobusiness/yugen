import { parseTimeToMinutes, minutesToTimeString, formatHour } from './timeSlots';

export interface FreeTimeGap {
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  type: 'short' | 'medium' | 'long' | 'meal';
  suggestions: FreeTimeSuggestion[];
}

export interface FreeTimeSuggestion {
  type: 'activity' | 'meal' | 'rest' | 'travel_buffer' | 'explore_nearby';
  title: string;
  description: string;
  duration: number; // suggested duration in minutes
  icon: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Detect free time gaps between scheduled activities
 */
export function detectFreeTimeGaps(activities: any[]): FreeTimeGap[] {
  const gaps: FreeTimeGap[] = [];
  
  // Sort activities by start time
  const scheduledActivities = activities
    .filter(a => a.start_time && a.end_time)
    .sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  if (scheduledActivities.length === 0) {
    // Entire day is free
    gaps.push({
      startTime: '06:00',
      endTime: '23:00',
      duration: 17 * 60, // 17 hours
      type: 'long',
      suggestions: generateFullDaySuggestions()
    });
    return gaps;
  }

  // Check gap before first activity
  const firstActivity = scheduledActivities[0];
  const firstStart = parseTimeToMinutes(firstActivity.start_time);
  const dayStart = 6 * 60; // 6 AM
  
  if (firstStart > dayStart) {
    const duration = firstStart - dayStart;
    gaps.push({
      startTime: minutesToTimeString(dayStart),
      endTime: firstActivity.start_time,
      duration,
      type: categorizeGapDuration(duration),
      suggestions: generateSuggestions(minutesToTimeString(dayStart), firstActivity.start_time, duration, 'start_of_day')
    });
  }

  // Check gaps between activities
  for (let i = 0; i < scheduledActivities.length - 1; i++) {
    const current = scheduledActivities[i];
    const next = scheduledActivities[i + 1];
    
    const currentEnd = parseTimeToMinutes(current.end_time);
    const nextStart = parseTimeToMinutes(next.start_time);
    
    if (nextStart > currentEnd) {
      const duration = nextStart - currentEnd;
      gaps.push({
        startTime: current.end_time,
        endTime: next.start_time,
        duration,
        type: categorizeGapDuration(duration),
        suggestions: generateSuggestions(current.end_time, next.start_time, duration, 'between_activities')
      });
    }
  }

  // Check gap after last activity
  const lastActivity = scheduledActivities[scheduledActivities.length - 1];
  const lastEnd = parseTimeToMinutes(lastActivity.end_time);
  const dayEnd = 23 * 60; // 11 PM
  
  if (lastEnd < dayEnd) {
    const duration = dayEnd - lastEnd;
    gaps.push({
      startTime: lastActivity.end_time,
      endTime: minutesToTimeString(dayEnd),
      duration,
      type: categorizeGapDuration(duration),
      suggestions: generateSuggestions(lastActivity.end_time, minutesToTimeString(dayEnd), duration, 'end_of_day')
    });
  }

  return gaps.filter(gap => gap.duration >= 15); // Only show gaps of 15+ minutes
}

/**
 * Categorize gap duration
 */
function categorizeGapDuration(minutes: number): 'short' | 'medium' | 'long' | 'meal' {
  if (minutes < 30) return 'short';
  if (minutes < 120) return 'medium';
  if (minutes >= 120) return 'long';
  return 'medium';
}

/**
 * Generate suggestions based on time gap
 */
function generateSuggestions(
  startTime: string, 
  endTime: string, 
  duration: number, 
  context: 'start_of_day' | 'between_activities' | 'end_of_day'
): FreeTimeSuggestion[] {
  const suggestions: FreeTimeSuggestion[] = [];
  const startHour = Math.floor(parseTimeToMinutes(startTime) / 60);
  const endHour = Math.floor(parseTimeToMinutes(endTime) / 60);

  // Meal time suggestions
  if (isMealTime(startTime, endTime)) {
    suggestions.push(...getMealSuggestions(startTime, endTime, duration));
  }

  // Duration-based suggestions
  if (duration < 30) {
    // Short gaps (15-30 minutes)
    suggestions.push(
      {
        type: 'rest',
        title: 'Take a break',
        description: 'Rest, grab a coffee, or use the restroom',
        duration: 15,
        icon: '☕',
        priority: 'medium'
      },
      {
        type: 'travel_buffer',
        title: 'Travel buffer',
        description: 'Allow extra time for transportation',
        duration: Math.min(duration, 20),
        icon: '🚶',
        priority: 'high'
      }
    );
  } else if (duration < 120) {
    // Medium gaps (30 minutes - 2 hours)
    suggestions.push(
      {
        type: 'explore_nearby',
        title: 'Explore nearby',
        description: 'Visit a nearby attraction, shop, or café',
        duration: Math.min(duration - 15, 90),
        icon: '🗺️',
        priority: 'high'
      },
      {
        type: 'activity',
        title: 'Quick activity',
        description: 'Museum visit, shopping, or sightseeing',
        duration: Math.min(duration - 10, 90),
        icon: '🏛️',
        priority: 'medium'
      }
    );

    if (duration >= 60) {
      suggestions.push({
        type: 'meal',
        title: 'Meal time',
        description: 'Find a restaurant or café for a proper meal',
        duration: 60,
        icon: '🍽️',
        priority: 'medium'
      });
    }
  } else {
    // Long gaps (2+ hours)
    suggestions.push(
      {
        type: 'activity',
        title: 'Major attraction',
        description: 'Visit a museum, landmark, or major attraction',
        duration: Math.min(duration - 30, 180),
        icon: '🏰',
        priority: 'high'
      },
      {
        type: 'explore_nearby',
        title: 'Neighborhood exploration',
        description: 'Walk around, discover local shops and cafés',
        duration: Math.min(duration - 30, 120),
        icon: '🚶‍♂️',
        priority: 'medium'
      },
      {
        type: 'rest',
        title: 'Extended break',
        description: 'Return to hotel, rest, or enjoy leisure time',
        duration: Math.min(duration, 120),
        icon: '🏨',
        priority: 'low'
      }
    );

    if (!isMealTime(startTime, endTime)) {
      suggestions.push({
        type: 'meal',
        title: 'Long meal',
        description: 'Enjoy a leisurely lunch or dinner experience',
        duration: 90,
        icon: '🍽️',
        priority: 'medium'
      });
    }
  }

  // Context-specific suggestions
  if (context === 'start_of_day') {
    suggestions.unshift({
      type: 'meal',
      title: 'Morning routine',
      description: 'Breakfast, coffee, and prepare for the day',
      duration: Math.min(duration, 90),
      icon: '🌅',
      priority: 'high'
    });
  }

  if (context === 'end_of_day') {
    suggestions.push(
      {
        type: 'meal',
        title: 'Evening dining',
        description: 'Dinner and drinks to end the day',
        duration: Math.min(duration, 120),
        icon: '🌙',
        priority: 'medium'
      },
      {
        type: 'rest',
        title: 'Wind down',
        description: 'Return to accommodation and relax',
        duration: Math.min(duration, 60),
        icon: '🛏️',
        priority: 'low'
      }
    );
  }

  return suggestions.slice(0, 4); // Limit to top 4 suggestions
}

/**
 * Check if time range overlaps with meal times
 */
function isMealTime(startTime: string, endTime: string): boolean {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  const mealTimes = [
    { start: 7 * 60, end: 10 * 60 }, // Breakfast: 7-10 AM
    { start: 11.5 * 60, end: 14.5 * 60 }, // Lunch: 11:30 AM - 2:30 PM
    { start: 17.5 * 60, end: 21 * 60 }, // Dinner: 5:30-9 PM
  ];

  return mealTimes.some(meal => 
    (startMinutes >= meal.start && startMinutes <= meal.end) ||
    (endMinutes >= meal.start && endMinutes <= meal.end) ||
    (startMinutes <= meal.start && endMinutes >= meal.end)
  );
}

/**
 * Get meal-specific suggestions
 */
function getMealSuggestions(startTime: string, endTime: string, duration: number): FreeTimeSuggestion[] {
  const startMinutes = parseTimeToMinutes(startTime);
  const suggestions: FreeTimeSuggestion[] = [];

  if (startMinutes >= 7 * 60 && startMinutes <= 10 * 60) {
    suggestions.push({
      type: 'meal',
      title: 'Breakfast',
      description: 'Start your day with a good breakfast',
      duration: Math.min(duration, 60),
      icon: '🥐',
      priority: 'high'
    });
  }

  if (startMinutes >= 11.5 * 60 && startMinutes <= 14.5 * 60) {
    suggestions.push({
      type: 'meal',
      title: 'Lunch',
      description: 'Take a lunch break to refuel',
      duration: Math.min(duration, 90),
      icon: '🥗',
      priority: 'high'
    });
  }

  if (startMinutes >= 17.5 * 60 && startMinutes <= 21 * 60) {
    suggestions.push({
      type: 'meal',
      title: 'Dinner',
      description: 'Enjoy dinner at a local restaurant',
      duration: Math.min(duration, 120),
      icon: '🍽️',
      priority: 'high'
    });
  }

  return suggestions;
}

/**
 * Generate suggestions for a completely free day
 */
function generateFullDaySuggestions(): FreeTimeSuggestion[] {
  return [
    {
      type: 'activity',
      title: 'Plan your day',
      description: 'Add activities from your wishlist to fill this day',
      duration: 480, // 8 hours
      icon: '📋',
      priority: 'high'
    },
    {
      type: 'explore_nearby',
      title: 'Explore the area',
      description: 'Take a walking tour or discover the neighborhood',
      duration: 240,
      icon: '🗺️',
      priority: 'medium'
    },
    {
      type: 'rest',
      title: 'Rest day',
      description: 'Take it easy and enjoy a relaxed day',
      duration: 360,
      icon: '😌',
      priority: 'low'
    }
  ];
}

/**
 * Get summary of free time for a day
 */
export function getFreeTimeSummary(activities: any[]): {
  totalFreeTime: number;
  largestGap: number;
  gapCount: number;
  efficiency: number;
} {
  const gaps = detectFreeTimeGaps(activities);
  const totalFreeTime = gaps.reduce((sum, gap) => sum + gap.duration, 0);
  const largestGap = gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0;
  
  const totalScheduledTime = activities
    .filter(a => a.start_time && a.end_time)
    .reduce((sum, activity) => {
      const start = parseTimeToMinutes(activity.start_time);
      const end = parseTimeToMinutes(activity.end_time);
      return sum + (end - start);
    }, 0);
  
  const totalDayTime = 17 * 60; // 6 AM to 11 PM
  const efficiency = totalDayTime > 0 ? (totalScheduledTime / totalDayTime) * 100 : 0;
  
  return {
    totalFreeTime,
    largestGap,
    gapCount: gaps.length,
    efficiency: Math.round(efficiency)
  };
}