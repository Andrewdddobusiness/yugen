import type { ViewMode } from '@/components/view/toggle';
import { format, isValid, parseISO } from 'date-fns';

/**
 * View management utilities
 */

// Date Navigation Utilities

/**
 * Formats a date for URL parameters (yyyy-MM-dd format)
 */
export function formatDateForUrl(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses a date string from URL parameters
 */
export function parseDateFromUrl(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Validates if a string is a valid view mode
 */
export function isValidViewMode(view: string | null): view is ViewMode {
  const validViews: ViewMode[] = ['calendar', 'table', 'list'];
  return view !== null && validViews.includes(view as ViewMode);
}

/**
 * Generates a deep link URL for a specific view and date
 */
export function generateDeepLinkUrl(
  baseUrl: string, 
  view: ViewMode, 
  date: Date, 
  defaultView: ViewMode = 'table'
): string {
  const url = new URL(baseUrl);
  
  if (view !== defaultView) {
    url.searchParams.set('view', view);
  }
  
  url.searchParams.set('date', formatDateForUrl(date));
  
  return url.toString();
}

/**
 * Parses deep link parameters from URL search params
 */
export function parseDeepLinkParams(searchParams: URLSearchParams): {
  view: ViewMode | null;
  date: Date | null;
} {
  const viewParam = searchParams.get('view');
  const dateParam = searchParams.get('date');
  
  return {
    view: isValidViewMode(viewParam) ? viewParam : null,
    date: parseDateFromUrl(dateParam)
  };
}

/**
 * Generates shareable URLs for specific dates in different views
 */
export function generateShareableUrls(
  baseUrl: string,
  targetDate: Date,
  defaultView: ViewMode = 'table'
): Record<ViewMode, string> {
  return {
    calendar: generateDeepLinkUrl(baseUrl, 'calendar', targetDate, defaultView),
    table: generateDeepLinkUrl(baseUrl, 'table', targetDate, defaultView),
    list: generateDeepLinkUrl(baseUrl, 'list', targetDate, defaultView)
  };
}

/**
 * Updates URL with view and date parameters while preserving other params
 */
export function updateUrlWithViewAndDate(
  currentUrl: string,
  view?: ViewMode,
  date?: Date | null,
  defaultView: ViewMode = 'table'
): string {
  const url = new URL(currentUrl);
  
  if (view !== undefined) {
    if (view === defaultView) {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', view);
    }
  }
  
  if (date !== undefined) {
    if (date === null) {
      url.searchParams.delete('date');
    } else {
      url.searchParams.set('date', formatDateForUrl(date));
    }
  }
  
  return url.toString();
}

export interface ViewMetrics {
  averageSessionTime: number;
  switchFrequency: number;
  preferredTimeOfDay: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export interface ViewAnalytics {
  viewUsage: Record<ViewMode, {
    totalTime: number;
    sessionCount: number;
    averageSessionLength: number;
    bounceRate: number;
    conversionRate: number;
  }>;
  transitions: Record<string, number>; // e.g., 'calendar-to-table': 45
  userFlow: ViewMode[];
}

/**
 * Calculate view recommendation based on context and user behavior
 */
export function calculateViewRecommendation(context: {
  activityCount: number;
  hasScheduledActivities: boolean;
  timeSpanDays: number;
  userBehavior: {
    prefersDragDrop: boolean;
    prefersDetailView: boolean;
    usesMobile: boolean;
  };
  currentView: ViewMode;
  viewPreferences: Record<ViewMode, {
    usageCount: number;
    userRating: number;
    lastUsed: Date | null;
  }>;
}): ViewMode | null {
  const {
    activityCount,
    hasScheduledActivities,
    timeSpanDays,
    userBehavior,
    currentView,
    viewPreferences
  } = context;

  // Rule-based recommendations
  const recommendations: Array<{ view: ViewMode; score: number; reason: string }> = [];

  // Calendar recommendations
  if (hasScheduledActivities && activityCount > 5 && currentView !== 'calendar') {
    recommendations.push({
      view: 'calendar',
      score: 8,
      reason: 'Many scheduled activities benefit from visual timeline'
    });
  }

  if (userBehavior.prefersDragDrop && currentView !== 'calendar') {
    recommendations.push({
      view: 'calendar',
      score: 7,
      reason: 'User prefers drag-and-drop interactions'
    });
  }

  // Table recommendations
  if (activityCount > 15 && currentView !== 'table') {
    recommendations.push({
      view: 'table',
      score: 7,
      reason: 'Large number of activities easier to manage in table'
    });
  }

  if (userBehavior.prefersDetailView && activityCount > 8 && currentView !== 'table') {
    recommendations.push({
      view: 'table',
      score: 6,
      reason: 'Detailed view preference with substantial activities'
    });
  }

  // List recommendations
  if (userBehavior.usesMobile && currentView !== 'list') {
    recommendations.push({
      view: 'list',
      score: 6,
      reason: 'Mobile-optimized view for better touch experience'
    });
  }

  if (timeSpanDays <= 2 && activityCount <= 8 && currentView !== 'list') {
    recommendations.push({
      view: 'list',
      score: 5,
      reason: 'Simple itinerary works well in list format'
    });
  }

  // Factor in user ratings and usage patterns
  recommendations.forEach(rec => {
    const pref = viewPreferences[rec.view];
    
    // Boost score for highly rated views
    if (pref.userRating >= 4) {
      rec.score += 2;
    }
    
    // Reduce score for views with low usage (user might not like them)
    if (pref.usageCount > 0 && pref.usageCount < 3) {
      rec.score -= 1;
    }
    
    // Boost score for recently used views (user familiarity)
    if (pref.lastUsed && Date.now() - pref.lastUsed.getTime() < 24 * 60 * 60 * 1000) {
      rec.score += 1;
    }
  });

  // Return highest scoring recommendation
  const bestRecommendation = recommendations
    .sort((a, b) => b.score - a.score)
    .find(rec => rec.score >= 5);

  return bestRecommendation?.view || null;
}

/**
 * Get view accessibility description
 */
export function getViewAccessibilityDescription(view: ViewMode): string {
  const descriptions = {
    calendar: 'Calendar view with drag-and-drop timeline. Use arrow keys to navigate between time slots, Enter to select, and Escape to cancel operations.',
    table: 'Table view with sortable columns and filterable data. Use Tab to navigate between cells, Space to sort columns, and arrow keys to move between rows.',
    list: 'List view with day-by-day itinerary. Use Tab to navigate between activities, Enter to expand details, and arrow keys to move between days.'
  };
  
  return descriptions[view];
}

/**
 * Generate shareable URL with view context
 */
export function generateShareableViewUrl(
  baseUrl: string,
  view: ViewMode,
  context?: {
    date?: string;
    activityId?: string;
    filter?: string;
  }
): string {
  const url = new URL(baseUrl);
  
  url.searchParams.set('view', view);
  
  if (context?.date) {
    url.searchParams.set('date', context.date);
  }
  
  if (context?.activityId) {
    url.searchParams.set('activity', context.activityId);
  }
  
  if (context?.filter) {
    url.searchParams.set('filter', context.filter);
  }
  
  return url.toString();
}

/**
 * Track view usage analytics
 */
export function trackViewUsage(
  view: ViewMode,
  action: 'enter' | 'exit' | 'interact',
  context?: {
    sessionId: string;
    timestamp: Date;
    duration?: number;
    interactionType?: string;
  }
): void {
  if (typeof window === 'undefined') return;
  
  // In a real app, this would send to analytics service
  const event = {
    type: 'view_usage',
    view,
    action,
    ...context,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
  
  // Store in localStorage for now (in production, send to analytics service)
  const analytics = JSON.parse(localStorage.getItem('view_analytics') || '[]');
  analytics.push(event);
  
  // Keep only last 1000 events
  if (analytics.length > 1000) {
    analytics.splice(0, analytics.length - 1000);
  }
  
  localStorage.setItem('view_analytics', JSON.stringify(analytics));
}

/**
 * Get view performance metrics
 */
export function getViewPerformanceMetrics(view: ViewMode): ViewMetrics | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const analytics = JSON.parse(localStorage.getItem('view_analytics') || '[]');
    const viewEvents = analytics.filter((event: any) => event.view === view);
    
    if (viewEvents.length === 0) return null;
    
    const sessions = new Map();
    
    // Group events by session
    viewEvents.forEach((event: any) => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, []);
      }
      sessions.get(event.sessionId).push(event);
    });
    
    let totalSessionTime = 0;
    let sessionCount = sessions.size;
    
    sessions.forEach((sessionEvents) => {
      const enterEvent = sessionEvents.find((e: any) => e.action === 'enter');
      const exitEvent = sessionEvents.find((e: any) => e.action === 'exit');
      
      if (enterEvent && exitEvent) {
        totalSessionTime += new Date(exitEvent.timestamp).getTime() - new Date(enterEvent.timestamp).getTime();
      }
    });
    
    const averageSessionTime = sessionCount > 0 ? totalSessionTime / sessionCount : 0;
    
    // Calculate switch frequency (sessions per day)
    const daySpan = viewEvents.length > 0 ? 
      (new Date().getTime() - new Date(viewEvents[0].timestamp).getTime()) / (1000 * 60 * 60 * 24) : 1;
    const switchFrequency = sessionCount / Math.max(daySpan, 1);
    
    // Determine preferred time of day
    const hourCounts = new Array(24).fill(0);
    viewEvents.forEach((event: any) => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    const preferredHour = hourCounts.indexOf(Math.max(...hourCounts));
    const preferredTimeOfDay = preferredHour < 6 ? 'early-morning' :
                              preferredHour < 12 ? 'morning' :
                              preferredHour < 17 ? 'afternoon' :
                              preferredHour < 21 ? 'evening' : 'night';
    
    // Determine device type
    const mobileCount = viewEvents.filter((e: any) => e.viewport?.width < 768).length;
    const tabletCount = viewEvents.filter((e: any) => e.viewport?.width >= 768 && e.viewport?.width < 1024).length;
    const desktopCount = viewEvents.filter((e: any) => e.viewport?.width >= 1024).length;
    
    const deviceType = mobileCount > Math.max(tabletCount, desktopCount) ? 'mobile' :
                      tabletCount > desktopCount ? 'tablet' : 'desktop';
    
    return {
      averageSessionTime,
      switchFrequency,
      preferredTimeOfDay,
      deviceType
    };
  } catch (error) {
    console.warn('Failed to calculate view metrics:', error);
    return null;
  }
}