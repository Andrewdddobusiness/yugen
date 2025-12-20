"use client";

import React from "react";
import { ChevronDown, Loader2, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ActivityActionsProps } from "../types";
import { SIZE_CONFIGS } from "../constants";
import { cn } from "@/lib/utils";

export const ActivityActions: React.FC<ActivityActionsProps> = ({
  isAdded = false,
  isLoading = false,
  onAdd,
  onRemove,
  onOptions,
  onEdit,
  onDelete,
  variant = 'default',
  size = 'md',
  className,
  showHoverOnly = false
}) => {
  const sizeConfig = SIZE_CONFIGS[size];
  
  // Default variant - footer with split buttons
  if (variant === 'default') {
    return (
      <div className={cn("inline-flex shadow-sm w-full", className)} role="group">
        {isLoading ? (
          <Button
            variant="outline"
            className="flex w-3/4 px-4 py-1 text-sm font-medium rounded-tl-none rounded-r-none hover:bg-gray-100 hover:text-black"
            disabled
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Please wait
          </Button>
        ) : isAdded ? (
          <Button
            variant="secondary"
            className="flex w-3/4 px-4 py-1 text-sm font-medium text-gray-500 rounded-tl-none rounded-r-none hover:bg-gray-100 hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
          >
            Remove
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex w-3/4 px-4 py-1 text-sm font-medium rounded-tl-none rounded-r-none border-b-0 border-l-0 hover:bg-gray-100 hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.();
            }}
          >
            Add to Itinerary
          </Button>
        )}
        <Button
          variant="default"
          className="flex w-1/4 justify-center items-center px-3 py-1 text-sm font-medium rounded-l-none rounded-tr-none hover:bg-[#3F5FA3]/90 bg-[#3F5FA3] text-white"
          onClick={(e) => {
            e.stopPropagation();
            onOptions?.();
          }}
        >
          <ChevronDown size={12} />
        </Button>
      </div>
    );
  }
  
  // Inline variant - compact buttons
  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex gap-1 transition-opacity",
        showHoverOnly && "opacity-0 group-hover:opacity-100",
        className
      )}>
        {(onAdd || onRemove) && (
          <>
            {isLoading ? (
              <Button variant="outline" size="sm" className={sizeConfig.button} disabled>
                <Loader2 className={cn(sizeConfig.icon, "animate-spin")} />
              </Button>
            ) : isAdded ? (
              <Button 
                variant="secondary" 
                size="sm" 
                className={sizeConfig.button}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove?.();
                }}
              >
                Remove
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                className={sizeConfig.button}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd?.();
                }}
              >
                Add
              </Button>
            )}
          </>
        )}
        
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(sizeConfig.button, "w-8 p-0")}
          >
            <Edit3 className={sizeConfig.icon} />
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(sizeConfig.button, "w-8 p-0 text-red-500 hover:text-red-700")}
            disabled={isLoading}
          >
            {isLoading ? 
              <Loader2 className={cn(sizeConfig.icon, "animate-spin")} /> : 
              <Trash2 className={sizeConfig.icon} />
            }
          </Button>
        )}
        
        {onOptions && (
          <Button 
            variant="default" 
            size="sm"
            className={cn(sizeConfig.button, "w-8 p-0")}
            onClick={(e) => {
              e.stopPropagation();
              onOptions();
            }}
          >
            <ChevronDown className={sizeConfig.icon} />
          </Button>
        )}
      </div>
    );
  }
  
  // Dropdown variant - single button with dropdown
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(sizeConfig.button, "w-8 p-0", className)}
      onClick={(e) => {
        e.stopPropagation();
        onOptions?.();
      }}
    >
      <ChevronDown className={sizeConfig.icon} />
    </Button>
  );
};