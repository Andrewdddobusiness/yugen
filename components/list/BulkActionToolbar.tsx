"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  CheckSquare2, 
  Square, 
  Trash2, 
  Move, 
  StickyNote, 
  FileDown, 
  Calendar,
  Loader2,
  X,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/components/hooks/use-mobile';

interface BulkActionToolbarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onBulkDelete: () => void;
  onBulkMove: (targetDate: string) => void;
  onBulkAddNotes: (notes: string) => void;
  onBulkSetTimes: (startTime: string, endTime: string) => void;
  onBulkExport: () => void;
  onToggleSelectionMode: () => void;
  availableDates: { date: string; label: string; count: number }[];
  loading: boolean;
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onSelectAll,
  onSelectNone,
  onBulkDelete,
  onBulkMove,
  onBulkAddNotes,
  onBulkSetTimes,
  onBulkExport,
  onToggleSelectionMode,
  availableDates,
  loading,
  className,
}: BulkActionToolbarProps) {
  const [notesDialog, setNotesDialog] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [timeDialog, setTimeDialog] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const isMobile = useIsMobile();

  const handleAddNotes = () => {
    if (notesValue.trim()) {
      onBulkAddNotes(notesValue.trim());
      setNotesValue('');
      setNotesDialog(false);
    }
  };

  const handleSetTimes = () => {
    // Validate times
    const isValidTime = (time: string) => {
      if (!time) return true; // Allow empty times
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(time);
    };

    if (isValidTime(startTime) && isValidTime(endTime)) {
      onBulkSetTimes(startTime, endTime);
      setStartTime('');
      setEndTime('');
      setTimeDialog(false);
    }
  };

  const handleMoveToDate = (targetDate: string) => {
    onBulkMove(targetDate);
  };

  return (
    <>
      <div className={cn(
        "flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm",
        isMobile ? "flex-wrap gap-2" : "gap-3",
        className
      )}>
        {/* Selection Summary */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "sm"}
            onClick={onToggleSelectionMode}
            className="text-gray-500 hover:text-gray-700"
            title="Exit selection mode"
          >
            <X className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Exit</span>}
          </Button>
          
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-medium">
            <CheckSquare2 className="h-3 w-3 mr-1" />
            {selectedCount} {isMobile ? '' : 'selected'}
          </Badge>
        </div>

        {!isMobile && <Separator orientation="vertical" className="h-6" />}

        {/* Selection Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 text-xs"
            disabled={loading}
          >
            {isMobile ? 'All' : 'Select All'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectNone}
            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 text-xs"
            disabled={loading}
          >
            {isMobile ? 'None' : 'Select None'}
          </Button>
        </div>

        {!isMobile && <Separator orientation="vertical" className="h-6" />}

        {/* Primary Actions */}
        <div className="flex items-center gap-2">
          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBulkDelete}
            disabled={selectedCount === 0 || loading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {!isMobile && 'Delete'}
          </Button>

          {/* Move */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedCount === 0 || loading}
                className="flex items-center gap-1"
              >
                <Move className="h-4 w-4" />
                {!isMobile && 'Move'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => handleMoveToDate('unscheduled')}>
                <Calendar className="h-4 w-4 mr-2" />
                Move to Unscheduled
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableDates.map(({ date, label, count }) => (
                <DropdownMenuItem
                  key={date}
                  onClick={() => handleMoveToDate(date)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  <div className="flex items-center justify-between w-full">
                    <span>{label}</span>
                    <Badge variant="outline" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedCount === 0 || loading}
                className="flex items-center gap-1"
              >
                <MoreHorizontal className="h-4 w-4" />
                {!isMobile && 'More'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setTimeDialog(true)}>
                <Clock className="h-4 w-4 mr-2" />
                Set Times
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNotesDialog(true)}>
                <StickyNote className="h-4 w-4 mr-2" />
                Add Notes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onBulkExport}>
                <FileDown className="h-4 w-4 mr-2" />
                Export Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2 text-blue-600 ml-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </div>

      {/* Bulk Notes Dialog */}
      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Notes to Selected Activities</DialogTitle>
            <DialogDescription>
              Add notes to all {selectedCount} selected {selectedCount === 1 ? 'activity' : 'activities'}. 
              These notes will be appended to existing notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Enter notes to add to all selected activities..."
              className="min-h-[100px] resize-y"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setNotesDialog(false);
                setNotesValue('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNotes}
              disabled={!notesValue.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Notes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Time Setting Dialog */}
      <Dialog open={timeDialog} onOpenChange={setTimeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Times for Selected Activities</DialogTitle>
            <DialogDescription>
              Set start and end times for all {selectedCount} selected {selectedCount === 1 ? 'activity' : 'activities'}.
              Leave empty to clear times.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="09:00"
                  className="text-center"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="17:00"
                  className="text-center"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Use HH:MM format (24-hour). Leave empty to clear existing times.
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setTimeDialog(false);
                setStartTime('');
                setEndTime('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSetTimes}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                'Set Times'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}