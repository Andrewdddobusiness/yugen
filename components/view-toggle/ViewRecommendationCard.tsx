"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, X, Star, TrendingUp, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";

export type ViewMode = 'calendar' | 'table' | 'list';

interface RecommendationReason {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const recommendationReasons: Record<ViewMode, RecommendationReason[]> = {
  calendar: [
    {
      icon: Clock,
      title: "Time-based Planning",
      description: "Perfect for scheduling activities with specific times"
    },
    {
      icon: TrendingUp,
      title: "Visual Organization",
      description: "Drag and drop makes it easy to rearrange your itinerary"
    }
  ],
  table: [
    {
      icon: Star,
      title: "Detailed Analysis",
      description: "Great for comparing activities and managing details"
    },
    {
      icon: TrendingUp,
      title: "Data Organization",
      description: "Sort and filter to find exactly what you need"
    }
  ],
  list: [
    {
      icon: Users,
      title: "Mobile Friendly",
      description: "Optimized for viewing on phones and tablets"
    },
    {
      icon: Clock,
      title: "Quick Overview",
      description: "Simple day-by-day breakdown of your plans"
    }
  ]
};

const viewLabels: Record<ViewMode, string> = {
  calendar: 'Calendar View',
  table: 'Table View',
  list: 'List View'
};

interface ViewRecommendationCardProps {
  className?: string;
  autoShow?: boolean;
  showDelay?: number;
}

export function ViewRecommendationCard({ 
  className,
  autoShow = true,
  showDelay = 3000
}: ViewRecommendationCardProps) {
  const { 
    currentView,
    getViewRecommendation,
    setCurrentView,
    contextData,
    viewPreferences
  } = useItineraryLayoutStore();

  const [isVisible, setIsVisible] = useState(false);
  const [recommendedView, setRecommendedView] = useState<ViewMode | null>(null);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());

  // Check for recommendations periodically
  useEffect(() => {
    if (!autoShow) return;

    const checkRecommendation = () => {
      const recommendation = getViewRecommendation();
      
      if (recommendation && recommendation !== currentView) {
        const recommendationKey = `${currentView}-to-${recommendation}`;
        
        // Don't show if already dismissed
        if (dismissedRecommendations.has(recommendationKey)) {
          return;
        }

        setRecommendedView(recommendation);
        
        // Show with delay
        setTimeout(() => {
          setIsVisible(true);
          
          // Auto-hide after 8 seconds
          setTimeout(() => {
            setIsVisible(false);
          }, 8000);
        }, showDelay);
      }
    };

    checkRecommendation();
    
    // Check every 30 seconds
    const interval = setInterval(checkRecommendation, 30000);
    return () => clearInterval(interval);
  }, [
    currentView, 
    getViewRecommendation, 
    autoShow, 
    showDelay, 
    dismissedRecommendations,
    contextData.activityCount,
    contextData.hasScheduledActivities
  ]);

  const handleAcceptRecommendation = () => {
    if (recommendedView) {
      setCurrentView(recommendedView);
      setIsVisible(false);
    }
  };

  const handleDismissRecommendation = () => {
    if (recommendedView) {
      const recommendationKey = `${currentView}-to-${recommendedView}`;
      setDismissedRecommendations(prev => new Set([...prev, recommendationKey]));
    }
    setIsVisible(false);
  };

  if (!recommendedView || !isVisible) {
    return null;
  }

  const reasons = recommendationReasons[recommendedView] || [];
  const currentUsage = viewPreferences[currentView]?.usageCount || 0;
  const recommendedUsage = viewPreferences[recommendedView]?.usageCount || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          duration: 0.5, 
          bounce: 0.1 
        }}
        className={cn(
          "fixed bottom-4 right-4 z-50 max-w-sm",
          "md:bottom-6 md:right-6",
          className
        )}
      >
        <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-yellow-200 dark:border-yellow-800 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Try {viewLabels[recommendedView]}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                    Based on your current planning
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissRecommendation}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {/* Reasons */}
            <div className="space-y-2">
              {reasons.slice(0, 2).map((reason, index) => {
                const Icon = reason.icon;
                return (
                  <div key={index} className="flex items-start space-x-2">
                    <Icon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {reason.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Context Info */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  {contextData.activityCount} activities
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {contextData.timeSpanDays} day{contextData.timeSpanDays > 1 ? 's' : ''}
                </span>
                {contextData.hasScheduledActivities && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Scheduled
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleAcceptRecommendation}
                className="flex-1 h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Switch View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDismissRecommendation}
                className="h-8 text-xs"
              >
                Not Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}