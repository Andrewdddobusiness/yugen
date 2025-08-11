"use client";

import React, { useState } from 'react';
import { Settings, RefreshCw, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { clearTravelTimeCache, getTravelTimeCacheStats } from '@/actions/google/travelTime';
import type { TravelMode } from '@/actions/google/travelTime';

interface TravelTimeSettingsProps {
  defaultModes?: TravelMode[];
  onModesChange?: (modes: TravelMode[]) => void;
  onRefresh?: () => void;
  className?: string;
}

const AVAILABLE_MODES: Array<{
  mode: TravelMode;
  label: string;
  description: string;
  icon: string;
}> = [
  { mode: 'walking', label: 'Walking', description: 'Walking directions', icon: '🚶' },
  { mode: 'driving', label: 'Driving', description: 'Driving directions', icon: '🚗' },
  { mode: 'transit', label: 'Public Transit', description: 'Public transportation', icon: '🚌' },
  { mode: 'bicycling', label: 'Bicycling', description: 'Bicycle directions', icon: '🚲' },
];

export function TravelTimeSettings({ 
  defaultModes = ['walking', 'driving'],
  onModesChange,
  onRefresh,
  className 
}: TravelTimeSettingsProps) {
  const [selectedModes, setSelectedModes] = useState<TravelMode[]>(defaultModes);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleModeToggle = (mode: TravelMode, enabled: boolean) => {
    const newModes = enabled 
      ? [...selectedModes, mode]
      : selectedModes.filter(m => m !== mode);
    
    setSelectedModes(newModes);
    onModesChange?.(newModes);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearTravelTimeCache();
      await loadCacheStats();
    } finally {
      setIsClearingCache(false);
    }
  };

  const loadCacheStats = async () => {
    try {
      const stats = await getTravelTimeCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  React.useEffect(() => {
    if (showAdvanced) {
      loadCacheStats();
    }
  }, [showAdvanced]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings className="h-4 w-4 mr-2" />
          Travel Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Travel Time Settings</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <Separator />

          {/* Transport modes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Transport Modes</Label>
            <div className="space-y-2">
              {AVAILABLE_MODES.map(({ mode, label, description, icon }) => (
                <div key={mode} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <div>
                      <Label htmlFor={`mode-${mode}`} className="text-sm font-medium">
                        {label}
                      </Label>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`mode-${mode}`}
                    checked={selectedModes.includes(mode)}
                    onCheckedChange={(checked) => handleModeToggle(mode, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Advanced settings */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start p-2"
            >
              <Settings className="h-3 w-3 mr-2" />
              Advanced Settings
            </Button>

            {showAdvanced && (
              <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                {/* Cache statistics */}
                {cacheStats && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Cache Statistics</Label>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Cached routes:</span>
                        <Badge variant="secondary" className="text-xs">
                          {cacheStats.size}
                        </Badge>
                      </div>
                      {cacheStats.size > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span>Oldest entry:</span>
                            <span>{Math.round(cacheStats.oldestEntry / (1000 * 60))}m ago</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Newest entry:</span>
                            <span>{Math.round(cacheStats.newestEntry / (1000 * 60))}m ago</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Cache actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearingCache}
                    className="w-full text-xs"
                  >
                    <Trash2 className={cn("h-3 w-3 mr-1", isClearingCache && "animate-pulse")} />
                    Clear Cache
                  </Button>
                </div>

                {/* Help text */}
                <div className="text-xs text-gray-500">
                  <p>Travel times are cached for 24 hours to improve performance and reduce API usage.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TravelTimeSettings;