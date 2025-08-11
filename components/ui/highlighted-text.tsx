import React from 'react';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

/**
 * Component that highlights search terms within text
 * Case-insensitive highlighting with proper React key handling
 */
export function HighlightedText({ text, searchTerm, className }: HighlightedTextProps) {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters in search term
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
  
  // Split text by search term while preserving the term itself
  const parts = text.split(regex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part matches the search term (case-insensitive)
        const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
        
        return isMatch ? (
          <mark 
            key={index} 
            className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 font-medium"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </span>
  );
}