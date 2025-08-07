"use client";

import React, { useState } from 'react';
import { Calendar, MapPin, Users, Share, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ItineraryHeaderProps {
  itineraryName: string;
  destination: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  collaborators?: number;
  onNameChange?: (name: string) => void;
  onDateChange?: (dates: { from: Date; to: Date }) => void;
  className?: string;
}

export function ItineraryHeader({
  itineraryName,
  destination,
  dateRange,
  collaborators = 1,
  onNameChange,
  onDateChange,
  className
}: ItineraryHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(itineraryName);

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    onNameChange?.(tempName);
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(itineraryName);
    setIsEditingName(false);
  };

  const getDuration = () => {
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  const formatDateRange = () => {
    const from = dateRange.from.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    const to = dateRange.to.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return `${from} - ${to}`;
  };

  return (
    <div className={cn(
      "bg-white border-b border-gray-200 px-4 py-3",
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left side - Trip info */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') handleNameCancel();
                  }}
                  className="text-lg font-semibold h-8"
                  autoFocus
                />
              </div>
            ) : (
              <h1 
                className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-gray-700"
                onClick={handleNameEdit}
              >
                {itineraryName}
              </h1>
            )}
            
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{destination}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDateRange()}</span>
              </div>

              <Badge variant="secondary" className="text-xs">
                {getDuration()}
              </Badge>

              {collaborators > 1 && (
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{collaborators}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-1" />
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <span>Export to PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Export to Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Export to Google Maps</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}