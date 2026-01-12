"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from './SwipeGestures';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  snapPoints?: number[]; // Array of heights in vh units
  className?: string;
  showDragHandle?: boolean;
  closeOnSwipeDown?: boolean;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  height = 'auto',
  snapPoints = [30, 60, 90],
  className,
  showDragHandle = true,
  closeOnSwipeDown = true,
}: MobileBottomSheetProps) {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // Start at middle snap point
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const { getSwipeProps } = useSwipeGesture({
    threshold: 50,
    onSwipe: (direction) => {
      if (direction === 'down') {
        if (closeOnSwipeDown && currentSnapIndex === 0) {
          onClose();
        } else {
          // Snap to next lower position
          const nextIndex = Math.max(0, currentSnapIndex - 1);
          setCurrentSnapIndex(nextIndex);
          
          if (nextIndex === 0 && closeOnSwipeDown) {
            setTimeout(onClose, 200);
          }
        }
      } else if (direction === 'up') {
        // Snap to next higher position
        const nextIndex = Math.min(snapPoints.length - 1, currentSnapIndex + 1);
        setCurrentSnapIndex(nextIndex);
      }
    },
  });

  const getHeightClass = () => {
    if (snapPoints.length > 0) {
      return `h-[${snapPoints[currentSnapIndex]}vh]`;
    }
    
    switch (height) {
      case 'half':
        return 'h-[50vh]';
      case 'full':
        return 'h-[90vh]';
      case 'auto':
      default:
        return 'h-auto max-h-[80vh]';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        className={cn(
          "p-0 border-t-2 rounded-t-2xl transition-all duration-300",
          getHeightClass(),
          isDragging && "transition-none",
          className
        )}
        style={{
          height: snapPoints.length > 0 ? `${snapPoints[currentSnapIndex]}vh` : undefined,
        }}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            {...getSwipeProps()}
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-manipulation"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
          >
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <SheetHeader className="px-4 pb-4 text-left">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {title && <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>}
                {description && (
                  <SheetDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </SheetDescription>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 -mt-1"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </SheetHeader>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>

        {/* Snap Points Indicator */}
        {snapPoints.length > 1 && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
            {snapPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSnapIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors touch-manipulation",
                  index === currentSnapIndex
                    ? "bg-blue-500"
                    : "bg-gray-300 dark:bg-gray-600"
                )}
                aria-label={`Snap to position ${index + 1}`}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Activity Details Bottom Sheet
interface ActivityBottomSheetProps {
  activity: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ActivityBottomSheet({
  activity,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ActivityBottomSheetProps) {
  if (!activity) return null;

  const sourceAttributions = Array.isArray((activity as any)?.sources) ? ((activity as any).sources as any[]) : [];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={activity.activity?.name || 'Activity Details'}
      description={activity.activity?.address}
      snapPoints={[40, 70, 90]}
    >
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-3">
          {activity.start_time && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Time:</div>
              <div className="text-sm">
                {activity.start_time}
                {activity.end_time && ` - ${activity.end_time}`}
              </div>
            </div>
          )}

          {activity.activity?.rating && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Rating:</div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm">{activity.activity.rating}</span>
              </div>
            </div>
          )}

          {activity.activity?.price_level && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Price:</div>
              <div className="text-sm">
                {'$'.repeat(parseInt(activity.activity.price_level))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {activity.notes && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes:</div>
            <div className="text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {activity.notes}
            </div>
          </div>
        )}

        {/* Contact */}
        {(activity.activity?.phone_number || activity.activity?.website_url) && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact:</div>
            
            {activity.activity.phone_number && (
              <a
                href={`tel:${activity.activity.phone_number}`}
                className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg touch-manipulation"
              >
                <span className="text-green-600">📞</span>
                <span className="text-sm">{activity.activity.phone_number}</span>
              </a>
            )}
            
            {activity.activity.website_url && (
              <a
                href={activity.activity.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg touch-manipulation"
              >
                <span>🌐</span>
                <span className="text-sm text-blue-600">Visit Website</span>
              </a>
            )}
          </div>
        )}

        {/* Source */}
        {sourceAttributions.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Source:</div>
            <div className="space-y-3">
              {sourceAttributions.map((row) => {
                const source = (row as any)?.itinerary_source ?? null;
                const url = String(source?.canonical_url ?? source?.url ?? "").trim();
                const title = String(source?.title ?? "").trim() || url || "Source";
                const provider = String(source?.provider ?? "web");
                const embedUrl = typeof source?.embed_url === "string" ? source.embed_url : "";
                const snippet = typeof (row as any)?.snippet === "string" ? (row as any).snippet : "";

                return (
                  <div key={String(source?.itinerary_source_id ?? url)} className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{provider.toUpperCase()}</div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline"
                      >
                        {title}
                      </a>
                    ) : (
                      <div className="text-sm">{title}</div>
                    )}
                    {snippet ? <div className="text-xs text-gray-600 dark:text-gray-400">{snippet}</div> : null}

                    {provider === "youtube" && embedUrl ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5">
                        <iframe
                          src={embedUrl}
                          title={title}
                          className="w-full h-[200px]"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onEdit && (
            <Button onClick={onEdit} className="flex-1 touch-manipulation">
              Edit Activity
            </Button>
          )}
          
          {onDelete && (
            <Button 
              onClick={onDelete} 
              variant="destructive" 
              className="flex-1 touch-manipulation"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </MobileBottomSheet>
  );
}

// Quick Actions Bottom Sheet
interface QuickActionsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Array<{
    icon: React.ReactNode;
    label: string;
    action: () => void;
    destructive?: boolean;
  }>;
}

export function QuickActionsBottomSheet({
  isOpen,
  onClose,
  actions,
}: QuickActionsBottomSheetProps) {
  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      height="auto"
      showDragHandle={false}
      closeOnSwipeDown={true}
    >
      <div className="py-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.action();
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800",
              "transition-colors touch-manipulation text-left",
              action.destructive && "text-red-600 dark:text-red-400"
            )}
          >
            <div className="flex-shrink-0">{action.icon}</div>
            <span className="flex-1">{action.label}</span>
          </button>
        ))}
        
        <div className="border-t border-gray-200 dark:border-gray-700 mt-2">
          <button
            onClick={onClose}
            className="w-full p-4 text-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
}
