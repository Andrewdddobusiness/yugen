import { parseTimeToMinutes } from './timeSlots';

export interface EfficiencyMetrics {
  score: number; // 0-100
  activeRatio: number; // 0-1
  freeTimeRatio: number; // 0-1
  travelTimeRatio: number; // 0-1
  recommendation: EfficiencyRecommendation;
  breakdown: EfficiencyBreakdown;
}

export interface EfficiencyBreakdown {
  totalWakingMinutes: number;
  activeMinutes: number;
  travelMinutes: number;
  freeMinutes: number;
  scheduledActivities: number;
}

export interface EfficiencyRecommendation {
  type: 'optimal' | 'overpacked' | 'underpacked' | 'unbalanced';
  message: string;
  suggestions: string[];
  priority: 'low' | 'medium' | 'high';
}

/**
 * Calculate efficiency metrics for a day's activities
 */
export function calculateDayEfficiency(
  activities: any[], 
  travelTimes: { [key: string]: { durationValue: number } } = {}
): EfficiencyMetrics {
  const totalWakingHours = 17; // 6 AM to 11 PM
  const totalWakingMinutes = totalWakingHours * 60;
  
  // Calculate active time from scheduled activities
  const scheduledActivities = activities.filter(a => a.start_time && a.end_time);
  const activeMinutes = scheduledActivities.reduce((sum, activity) => {
    const start = parseTimeToMinutes(activity.start_time);
    const end = parseTimeToMinutes(activity.end_time);
    return sum + (end - start);
  }, 0);
  
  // Calculate travel time
  const travelMinutes = Object.values(travelTimes).reduce((sum, travel) => {
    return sum + Math.ceil(travel.durationValue / 60); // Convert seconds to minutes
  }, 0);
  
  // Calculate free time
  const freeMinutes = Math.max(0, totalWakingMinutes - activeMinutes - travelMinutes);
  
  // Calculate ratios
  const activeRatio = activeMinutes / totalWakingMinutes;
  const travelTimeRatio = travelMinutes / totalWakingMinutes;
  const freeTimeRatio = freeMinutes / totalWakingMinutes;
  
  // Calculate efficiency score (optimal is around 60-70% active time)
  const optimalActiveRatio = 0.65; // 65% active time is ideal
  const efficiency = 100 - Math.abs(activeRatio - optimalActiveRatio) * 200;
  const score = Math.max(0, Math.min(100, Math.round(efficiency)));
  
  const breakdown: EfficiencyBreakdown = {
    totalWakingMinutes,
    activeMinutes,
    travelMinutes,
    freeMinutes,
    scheduledActivities: scheduledActivities.length
  };
  
  const recommendation = generateEfficiencyRecommendation(
    score, 
    activeRatio, 
    travelTimeRatio, 
    scheduledActivities.length
  );
  
  return {
    score,
    activeRatio,
    freeTimeRatio,
    travelTimeRatio,
    recommendation,
    breakdown
  };
}

/**
 * Generate efficiency recommendation based on metrics
 */
function generateEfficiencyRecommendation(
  score: number,
  activeRatio: number,
  travelRatio: number,
  activityCount: number
): EfficiencyRecommendation {
  const suggestions: string[] = [];
  let type: EfficiencyRecommendation['type'];
  let message: string;
  let priority: EfficiencyRecommendation['priority'];
  
  if (score >= 85) {
    type = 'optimal';
    message = 'Your day is well-balanced with good mix of activities and free time!';
    priority = 'low';
    suggestions.push('Great planning! Your schedule looks optimal.');
  } else if (activeRatio > 0.8) {
    type = 'overpacked';
    message = 'Your day might be too packed. Consider reducing activities or extending durations.';
    priority = 'high';
    suggestions.push('Remove 1-2 less important activities');
    suggestions.push('Add buffer time between activities');
    suggestions.push('Consider shorter activity durations');
  } else if (activeRatio < 0.3) {
    type = 'underpacked';
    message = 'You have lots of free time. Consider adding more activities to make the most of your day.';
    priority = 'medium';
    suggestions.push('Add activities from your wishlist');
    suggestions.push('Explore nearby attractions during gaps');
    suggestions.push('Consider longer activities or experiences');
  } else if (travelRatio > 0.25) {
    type = 'unbalanced';
    message = 'You\'re spending a lot of time traveling. Try grouping activities by location.';
    priority = 'medium';
    suggestions.push('Group activities by neighborhood');
    suggestions.push('Use faster transportation when possible');
    suggestions.push('Consider activities within walking distance');
  } else {
    type = 'unbalanced';
    message = 'Your schedule could be optimized for better flow and efficiency.';
    priority = 'low';
    
    if (activityCount > 8) {
      suggestions.push('Consider fewer, longer activities');
    } else if (activityCount < 3 && activeRatio > 0.4) {
      suggestions.push('Add variety with different types of activities');
    } else {
      suggestions.push('Adjust activity timing for better flow');
    }
  }
  
  return { type, message, suggestions, priority };
}

/**
 * Get efficiency score color for UI display
 */
export function getEfficiencyScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get efficiency badge variant for UI display
 */
export function getEfficiencyBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 85) return 'default'; // Green
  if (score >= 50) return 'secondary'; // Yellow/Gray
  return 'destructive'; // Red
}


/**
 * Get recommendation icon
 */
export function getRecommendationIcon(type: EfficiencyRecommendation['type']): string {
  switch (type) {
    case 'optimal':
      return '✅';
    case 'overpacked':
      return '⚠️';
    case 'underpacked':
      return '📝';
    case 'unbalanced':
      return '⚖️';
    default:
      return '📊';
  }
}

/**
 * Calculate comparative efficiency scores for multiple days
 */
export function calculateMultiDayEfficiency(dayMetrics: EfficiencyMetrics[]): {
  averageScore: number;
  bestDay: number;
  worstDay: number;
  totalActivities: number;
  totalActiveTime: number;
} {
  if (dayMetrics.length === 0) {
    return {
      averageScore: 0,
      bestDay: 0,
      worstDay: 0,
      totalActivities: 0,
      totalActiveTime: 0
    };
  }
  
  const averageScore = Math.round(
    dayMetrics.reduce((sum, day) => sum + day.score, 0) / dayMetrics.length
  );
  
  const bestDay = Math.max(...dayMetrics.map(d => d.score));
  const worstDay = Math.min(...dayMetrics.map(d => d.score));
  
  const totalActivities = dayMetrics.reduce((sum, day) => sum + day.breakdown.scheduledActivities, 0);
  const totalActiveTime = dayMetrics.reduce((sum, day) => sum + day.breakdown.activeMinutes, 0);
  
  return {
    averageScore,
    bestDay,
    worstDay,
    totalActivities,
    totalActiveTime
  };
}