"use client";

import React, { useState } from 'react';
import { Edit3, Save, X, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useWishlistStore, type WishlistItem } from '@/store/wishlistStore';

interface PlaceNotesProps {
  item: WishlistItem;
  trigger?: React.ReactNode;
}

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High Priority', color: 'destructive' },
  { value: 'medium', label: 'Medium Priority', color: 'default' },
  { value: 'low', label: 'Low Priority', color: 'secondary' },
] as const;

export default function PlaceNotes({ item, trigger }: PlaceNotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [priority, setPriority] = useState(item.priority || 'medium');
  const [isEditing, setIsEditing] = useState(false);
  
  const { updateWishlistItem } = useWishlistStore();

  const handleSave = () => {
    updateWishlistItem(item.searchHistoryId, {
      notes: notes.trim() || undefined,
      priority: priority as 'high' | 'medium' | 'low'
    });
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setNotes(item.notes || '');
    setPriority(item.priority || 'medium');
    setIsEditing(false);
  };

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center space-x-1"
    >
      <Edit3 className="h-3 w-3" />
      <span className="text-xs">Notes</span>
    </Button>
  );

  const priorityOption = PRIORITY_OPTIONS.find(opt => opt.value === (item.priority || 'medium'));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Notes & Priority</span>
            {item.activity?.name && (
              <span className="text-sm font-normal text-gray-500 truncate">
                - {item.activity.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Priority Level
            </label>
            <div className="flex items-center space-x-2">
              <Select
                value={priority}
                onValueChange={setPriority}
                disabled={!isEditing}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {!isEditing && priorityOption && (
                <Badge variant={priorityOption.color as any}>
                  {priorityOption.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Personal Notes
            </label>
            
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your personal notes about this place..."
                rows={4}
                className="resize-none"
              />
            ) : (
              <div 
                className="min-h-[100px] p-3 border border-gray-200 rounded-md bg-gray-50 text-sm"
                onClick={() => setIsEditing(true)}
              >
                {notes ? (
                  <p className="whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-gray-500 italic cursor-pointer">
                    Click to add notes about this place...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tips */}
          {isEditing && (
            <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Tips for better notes:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Add opening hours or best times to visit</li>
                  <li>Note special requirements (reservations, tickets)</li>
                  <li>Include personal reasons for wanting to visit</li>
                  <li>Add budget estimates or price ranges</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center space-x-1"
                >
                  <X className="h-3 w-3" />
                  <span>Cancel</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center space-x-1"
                >
                  <Save className="h-3 w-3" />
                  <span>Save</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1"
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}