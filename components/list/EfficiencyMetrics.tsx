"use client";

import React, { useState } from 'react';
import { BarChart3, Clock, Target, TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  EfficiencyMetrics, 
  getEfficiencyScoreColor, 
  getEfficiencyBadgeVariant,
  getRecommendationIcon
} from '@/utils/efficiencyMetrics';
import { formatDuration } from '@/utils/formatting/time';

interface EfficiencyMetricsProps {
  metrics: EfficiencyMetrics;
  className?: string;
}

export function EfficiencyMetricsCard({ metrics, className }: EfficiencyMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { score, activeRatio, freeTimeRatio, travelTimeRatio, recommendation, breakdown } = metrics;

  return (
    <Card className={cn("border-l-4 border-l-blue-500", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-4 h-auto hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3 w-full text-left">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 flex-shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Day Efficiency
                  </span>
                  <Badge variant={getEfficiencyBadgeVariant(score)} className="text-xs">
                    {score}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {breakdown.scheduledActivities} activities • {formatDuration(breakdown.activeMinutes)} active
                </p>
              </div>

              <div className="flex items-center text-gray-400">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
              
              {/* Score Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Time Breakdown
                </h4>
                
                <div className="space-y-2">
                  {/* Active Time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Active Time</span>
                    </div>
                    <span className="font-medium">
                      {formatDuration(breakdown.activeMinutes)} ({Math.round(activeRatio * 100)}%)
                    </span>
                  </div>
                  <Progress value={activeRatio * 100} className="h-2" />
                  
                  {/* Travel Time */}
                  {breakdown.travelMinutes > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span>Travel Time</span>
                        </div>
                        <span className="font-medium">
                          {formatDuration(breakdown.travelMinutes)} ({Math.round(travelTimeRatio * 100)}%)
                        </span>
                      </div>
                      <Progress value={travelTimeRatio * 100} className="h-2" />
                    </>
                  )}
                  
                  {/* Free Time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span>Free Time</span>
                    </div>
                    <span className="font-medium">
                      {formatDuration(breakdown.freeMinutes)} ({Math.round(freeTimeRatio * 100)}%)
                    </span>
                  </div>
                  <Progress value={freeTimeRatio * 100} className="h-2" />
                </div>
              </div>

              {/* Efficiency Score */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Target className={cn("h-5 w-5", getEfficiencyScoreColor(score))} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Efficiency Score</span>
                    <Badge variant={getEfficiencyBadgeVariant(score)} className="text-sm">
                      {score}%
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Based on activity balance and time utilization
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recommendations
                  </h4>
                  <span className="text-lg">{getRecommendationIcon(recommendation.type)}</span>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                    {recommendation.message}
                  </p>
                  
                  {recommendation.suggestions.length > 0 && (
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {recommendation.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface EfficiencyScoreSummaryProps {
  score: number;
  recommendationType: string;
  className?: string;
}

export function EfficiencyScoreSummary({ score, recommendationType, className }: EfficiencyScoreSummaryProps) {
  const getScoreLabel = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <div className="flex items-center gap-1">
        <TrendingUp className={cn("h-3 w-3", getEfficiencyScoreColor(score))} />
        <span className={cn("font-medium", getEfficiencyScoreColor(score))}>
          {score}% {getScoreLabel(score)}
        </span>
      </div>
      <span className="text-gray-500">•</span>
      <span className="text-gray-600 dark:text-gray-400 capitalize">
        {recommendationType}
      </span>
    </div>
  );
}