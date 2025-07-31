# CALENDAR-002: Create draggable place blocks with activity information

## Priority: High
## Status: Open
## Assignee: Unassigned
## Type: Calendar Feature

## Description
Design and implement draggable activity blocks that display comprehensive place information and can be easily manipulated within the calendar interface.

## Acceptance Criteria
- [ ] Create visually appealing activity blocks with place information
- [ ] Implement different block sizes based on activity duration
- [ ] Add hover states with detailed information popover
- [ ] Create block variants for different activity types
- [ ] Implement drag handle and visual feedback
- [ ] Add activity status indicators (confirmed, tentative, cancelled)
- [ ] Create compact and expanded block views
- [ ] Implement block editing functionality
- [ ] Add color coding system for activity categories
- [ ] Create mobile-optimized block interactions

## Activity Block Design

### Block Information Display
- **Primary**: Place name (truncated if needed)
- **Secondary**: Time range and duration
- **Tertiary**: Address or activity type
- **Visual**: Small place photo or category icon
- **Status**: Confirmation status indicator

### Block Variants by Duration
- **< 1 hour**: Compact block with minimal info
- **1-3 hours**: Standard block with name, time, type
- **3+ hours**: Extended block with photo and details
- **All day**: Full-width block spanning entire day

### Block States
- **Default**: Normal appearance
- **Hover**: Elevated with more details
- **Dragging**: Semi-transparent with ghost effect
- **Selected**: Highlighted border and actions
- **Editing**: Inline editing mode
- **Conflict**: Warning styling for scheduling conflicts

## Technical Implementation

### Components
- `components/calendar/ActivityBlock.tsx` - Main draggable block component
- `components/calendar/ActivityBlockContent.tsx` - Block content renderer
- `components/calendar/ActivityBlockPopover.tsx` - Hover detail popover
- `components/calendar/ActivityBlockEditor.tsx` - Inline editing interface
- `components/calendar/BlockVariants.tsx` - Different block size variants

### Block Data Structure
```typescript
interface ActivityBlock {
  id: string;
  place: PlaceData;
  scheduledTime: {
    date: Date;
    startTime: string;
    endTime: string;
    duration: number;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  category: ActivityCategory;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  color?: string;
}
```

### Visual Design Elements
- **Category Colors**: Different colors for food, attractions, shopping, etc.
- **Status Indicators**: Icons or borders for confirmation status
- **Duration Bars**: Visual representation of activity length
- **Priority Badges**: Small indicators for high-priority activities
- **Drag Handles**: Clear affordances for dragging

## Block Interactions

### Drag Operations
- **Initiate**: Click and hold or touch and hold
- **Visual Feedback**: Block becomes semi-transparent
- **Ghost Element**: Shows where block will be placed
- **Drop Feedback**: Visual confirmation of successful placement

### Context Actions
- **Quick Edit**: Double-click to edit time or notes
- **Menu Actions**: Right-click for full menu
- **Status Toggle**: Quick confirmation/tentative toggle
- **Delete**: Remove from itinerary (return to wishlist)

### Hover Information
- **Place Photos**: Show place images
- **Reviews**: Display rating and review snippet
- **Details**: Address, phone, website links
- **Travel Info**: Distance from previous activity
- **Notes**: User-added notes and reminders

## Responsive Design
- **Desktop**: Full information display with hover effects
- **Tablet**: Touch-optimized with larger touch targets
- **Mobile**: Simplified view with essential information
- **Touch Devices**: Long-press for context menus

## Accessibility Features
- **Keyboard Navigation**: Tab through blocks, arrow keys to move
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **Drag Alternatives**: Keyboard-based moving options

## Color Coding System
- 🍴 **Food & Dining**: Red/Orange tones
- 🏛️ **Attractions**: Blue tones  
- 🛍️ **Shopping**: Purple tones
- 🌳 **Outdoors**: Green tones
- 🎭 **Entertainment**: Pink/Magenta tones
- 🏨 **Accommodation**: Gray tones
- 🚗 **Transportation**: Yellow/Amber tones

## Performance Optimizations
- Virtualize blocks for large itineraries
- Lazy load place images in hover states
- Memoize block renders to prevent unnecessary updates
- Optimize drag performance with RequestAnimationFrame

## State Management
- Track block positions and properties
- Handle optimistic updates during drag
- Sync changes with server actions
- Manage block selection state

## Dependencies
- CALENDAR-001 (Drag-and-drop interface)
- UX-004 (Wishlist data for place information)
- INFRA-004 (Server actions for activity updates)

## Estimated Effort
6-7 hours

## Notes
- Focus on clear visual hierarchy and readability
- Ensure blocks work well on touch devices
- Plan for different languages and text lengths
- Consider block templates for common activity types
- Test with various activity durations and types