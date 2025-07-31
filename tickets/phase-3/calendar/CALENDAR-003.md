# CALENDAR-003: Build side panel for place library/wishlist

## Priority: High
## Status: Open
## Assignee: Unassigned
## Type: Calendar Feature

## Description
Create an integrated side panel that displays the user's wishlist and place library, serving as the source for dragging activities onto the calendar with building-block style interactions.

## Acceptance Criteria
- [ ] Create collapsible sidebar with wishlist items
- [ ] Implement drag initiation from sidebar to calendar
- [ ] Add search and filter functionality within sidebar
- [ ] Create category organization for wishlist items
- [ ] Implement quick add functionality for new places
- [ ] Add bulk actions for wishlist management
- [ ] Create sidebar state persistence
- [ ] Implement responsive behavior (mobile bottom sheet)
- [ ] Add sidebar keyboard navigation
- [ ] Create empty states and loading indicators

## Sidebar Design & Layout

### Structure
```
┌─────────────────────┐
│ Search Box          │
├─────────────────────┤
│ Quick Filters       │
│ [Food][Sites][Shop] │
├─────────────────────┤
│ Wishlist Items      │
│ ┌─────────────────┐ │
│ │ 📍 Place Name   │ │
│ │ ⭐ 4.5 • $$     │ │
│ │ Category        │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 📍 Another Place│ │
│ │ ⭐ 4.2 • $$$    │ │
│ │ Category        │ │
│ └─────────────────┘ │
├─────────────────────┤
│ + Quick Add Place   │
└─────────────────────┘
```

## Technical Implementation

### Components
- `components/sidebar/ItinerarySidebar.tsx` - Main sidebar container
- `components/sidebar/WishlistPanel.tsx` - Wishlist display panel
- `components/sidebar/WishlistItem.tsx` - Individual draggable wishlist item
- `components/sidebar/SidebarSearch.tsx` - Search and filter interface
- `components/sidebar/CategoryFilters.tsx` - Quick category filters
- `components/sidebar/QuickAddPlace.tsx` - Quick place addition
- `components/sidebar/SidebarControls.tsx` - Collapse/expand controls

### Drag Source Implementation
```typescript
interface DraggableWishlistItem {
  id: string;
  place: PlaceData;
  dragType: 'wishlist-item';
  category: string;
  savedAt: Date;
  notes?: string;
}
```

### Sidebar State Management
```typescript
interface SidebarState {
  isCollapsed: boolean;
  searchQuery: string;
  activeFilters: string[];
  selectedCategory: string | null;
  view: 'grid' | 'list';
  sortBy: 'name' | 'category' | 'rating' | 'date_saved';
}
```

## Wishlist Item Design
- **Compact Card**: Name, rating, price level, category
- **Drag Handle**: Clear visual indicator for dragging
- **Quick Actions**: Save/unsave, edit notes, view details
- **Status Indicators**: Already scheduled, visited, etc.
- **Category Icons**: Visual category identification

## Interaction Patterns

### Drag to Calendar
1. User hovers over wishlist item
2. Drag affordance becomes visible
3. User drags item to calendar time slot
4. Visual feedback shows valid drop zones
5. Drop creates scheduled activity
6. Item remains in wishlist but shows "scheduled" status

### Search and Filter
- **Text Search**: Search place names and descriptions
- **Category Filters**: Filter by activity type
- **Quick Filters**: Common categories as chips
- **Sort Options**: By name, rating, date added, category
- **Saved Searches**: Remember common filter combinations

### Quick Add Functionality
- **Search Integration**: Mini search bar for new places
- **Recent Searches**: Show recently discovered places
- **Popular Suggestions**: Suggest popular places for destination
- **Quick Save**: One-click save to wishlist

## Responsive Behavior

### Desktop (> 1024px)
- Full sidebar visible by default
- Collapsible with smooth animation
- Hover interactions for item details

### Tablet (768px - 1024px)
- Sidebar can overlay main content
- Swipe gestures for showing/hiding
- Touch-optimized item interactions

### Mobile (< 768px)
- Bottom sheet implementation
- Swipe up to reveal wishlist
- Full-screen mode for wishlist management
- Touch-first interaction design

## Sidebar Features

### Organization
- **Categories**: Group by activity type
- **Custom Collections**: User-created groupings
- **Priority Sorting**: High-priority items first
- **Recent Activity**: Recently added/modified items

### Management Actions
- **Bulk Select**: Select multiple items for actions
- **Bulk Schedule**: Add multiple items to specific day
- **Export Wishlist**: Share or export wishlist
- **Import Items**: Import from other platforms

### Status Tracking
- **Scheduled**: Items already on calendar
- **Visited**: Completed activities
- **Unavailable**: Closed or unavailable places
- **Favorites**: Starred high-priority items

## Performance Optimizations
- Virtual scrolling for large wishlists
- Lazy loading of place images
- Debounced search and filtering
- Cached filter results
- Progressive loading of wishlist data

## Integration Points
- Connect with UX-004 wishlist system
- Link to CALENDAR-001 drag-and-drop
- Integrate with place discovery (UX-003)
- Sync with database via server actions

## Accessibility
- Keyboard navigation through wishlist items
- Screen reader support for drag operations
- Focus management during sidebar interactions
- Alternative keyboard-based scheduling methods

## Dependencies
- UX-004 (Wishlist system)
- CALENDAR-001 (Calendar drag-and-drop interface)
- INFRA-004 (Server actions for wishlist operations)

## Estimated Effort
5-6 hours

## Notes
- Ensure smooth drag initiation on all devices
- Plan for large wishlists (100+ items)
- Consider user personalization and preferences
- Optimize for one-handed mobile usage
- Add haptic feedback for mobile interactions