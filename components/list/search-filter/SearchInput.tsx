"use client";

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchFilters } from './types';

interface SearchInputProps {
  searchText: string;
  onSearchChange: (key: keyof SearchFilters, value: any) => void;
  className?: string;
}

export function SearchInput({ searchText, onSearchChange, className }: SearchInputProps) {
  return (
    <div className={`relative ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Search activities, addresses, or notes... (Ctrl+K)"
        value={searchText}
        onChange={(e) => onSearchChange('searchText', e.target.value)}
        className="pl-10 pr-16"
      />
      {searchText && (
        <button
          onClick={() => onSearchChange('searchText', '')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
          title="Clear search (Esc)"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}