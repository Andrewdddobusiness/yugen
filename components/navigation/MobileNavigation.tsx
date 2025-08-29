"use client";

import React, { useState } from 'react';
import { Calendar, List, MapPin, Settings, Plus, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMobileEnhanced } from '@/components/hooks/use-mobile-enhanced';

interface MobileNavigationProps {
  currentView?: 'calendar' | 'list' | 'map';
  onViewChange?: (view: 'calendar' | 'list' | 'map') => void;
  onAddActivity?: () => void;
  className?: string;
}

export function MobileNavigation({
  currentView = 'list',
  onViewChange,
  onAddActivity,
  className,
}: MobileNavigationProps) {
  const { isMobile } = useMobileEnhanced();

  if (!isMobile) {
    return null; // Don't show mobile nav on desktop
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700",
      "safe-area-pb", // Handle iPhone home indicator
      className
    )}>
      <div className="grid grid-cols-5 h-16">
        {/* Calendar View */}
        <button
          onClick={() => onViewChange?.('calendar')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            currentView === 'calendar'
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          )}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs font-medium">Calendar</span>
        </button>

        {/* List View */}
        <button
          onClick={() => onViewChange?.('list')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            currentView === 'list'
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          )}
        >
          <List className="h-5 w-5" />
          <span className="text-xs font-medium">List</span>
        </button>

        {/* Add Activity - Center FAB */}
        <div className="flex items-center justify-center">
          <Button
            onClick={onAddActivity}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg touch-manipulation"
            size="sm"
          >
            <Plus className="h-5 w-5" />
            <span className="sr-only">Add Activity</span>
          </Button>
        </div>

        {/* Map View */}
        <button
          onClick={() => onViewChange?.('map')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            currentView === 'map'
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          )}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-xs font-medium">Map</span>
        </button>

        {/* More/Settings */}
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-colors touch-manipulation",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            "text-gray-600 dark:text-gray-400"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-xs font-medium">More</span>
        </button>
      </div>
    </div>
  );
}

// Top navigation bar for mobile
interface MobileTopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: {
    icon: React.ReactNode;
    action: () => void;
    label?: string;
  };
  badge?: string | number;
  className?: string;
}

export function MobileTopBar({
  title,
  subtitle,
  onBack,
  rightAction,
  badge,
  className,
}: MobileTopBarProps) {
  return (
    <div className={cn(
      "sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700",
      "safe-area-pt", // Handle iPhone notch
      className
    )}>
      <div className="flex items-center h-14 px-4">
        {/* Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 -ml-2 mr-2 touch-manipulation"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        )}

        {/* Title and Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Action */}
        {rightAction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={rightAction.action}
            className="p-2 -mr-2 ml-2 touch-manipulation"
            title={rightAction.label}
          >
            {rightAction.icon}
            <span className="sr-only">{rightAction.label || 'Action'}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// Floating Action Button
interface MobileFABProps {
  icon: React.ReactNode;
  label?: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileFAB({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  size = 'md',
  className,
}: MobileFABProps) {
  const { isMobile } = useMobileEnhanced();

  if (!isMobile) {
    return null;
  }

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-20 left-4',
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed z-50 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white touch-manipulation",
        positionClasses[position],
        sizeClasses[size],
        className
      )}
      size="sm"
    >
      {icon}
      {label && <span className="sr-only">{label}</span>}
    </Button>
  );
}

// Tab Bar for switching between views
interface MobileTabBarProps {
  tabs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
  className,
}: MobileTabBarProps) {
  return (
    <div className={cn(
      "flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700",
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 px-4 transition-colors touch-manipulation",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            activeTab === tab.id
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400"
          )}
        >
          {tab.icon}
          <span className="text-sm font-medium">{tab.label}</span>
          {tab.badge && (
            <Badge variant="secondary" className="text-xs min-w-0">
              {tab.badge}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}

// Mobile-specific view switcher
interface MobileViewSwitcherProps {
  currentView: 'calendar' | 'list';
  onViewChange: (view: 'calendar' | 'list') => void;
  activityCount?: number;
  className?: string;
}

export function MobileViewSwitcher({
  currentView,
  onViewChange,
  activityCount,
  className,
}: MobileViewSwitcherProps) {
  const { isMobile } = useMobileEnhanced();

  if (!isMobile) {
    return null;
  }

  return (
    <div className={cn(
      "flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mx-4 mb-4",
      className
    )}>
      <button
        onClick={() => onViewChange('calendar')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-colors touch-manipulation",
          currentView === 'calendar'
            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400"
        )}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Calendar</span>
      </button>

      <button
        onClick={() => onViewChange('list')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md transition-colors touch-manipulation",
          currentView === 'list'
            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400"
        )}
      >
        <List className="h-4 w-4" />
        <span className="text-sm font-medium">List</span>
        {activityCount !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {activityCount}
          </Badge>
        )}
      </button>
    </div>
  );
}