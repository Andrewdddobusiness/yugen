# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

For package management, the project supports npm, yarn, pnpm, or bun.

## High-Level Architecture

### Tech Stack
- **Frontend Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom components
- **State Management**: Zustand for global state, React Query for server state
- **Database & Auth**: Supabase
- **Maps**: Google Maps API with @vis.gl/react-google-maps and deck.gl
- **UI Components**: Radix UI primitives with custom styling
- **Forms**: React Hook Form with Zod validation
- **Payments**: Stripe integration

## Project Mission

Journey is a travel itinerary builder that replicates the functionality of Wanderlog, designed for meticulous trip planners who want to organize their travels with the same precision as an Excel spreadsheet. The application follows a three-phase user journey:

1. **Destination Selection**: Users pick their travel destination (e.g., Paris, France or Tokyo, Japan). Future versions will support multiple locations per itinerary.

2. **Place Discovery & Collection**: Users accumulate a comprehensive list of places they want to visit, creating a wishlist they can reference later. This phase focuses on gathering options without worrying about scheduling constraints.

3. **Itinerary Organization**: The core feature - users organize their collected places into a structured itinerary using:
   - **Drag-and-drop calendar interface** similar to Google Calendar for intuitive scheduling
   - **Side panel with place blocks** that can be dragged directly onto specific days and times
   - **List view** showing daily itineraries in text format for traditional planning view
   - **Time-based scheduling** allowing precise placement of activities throughout each day

The application emphasizes ease of use with building-block style interactions, enabling users to quickly construct detailed, time-based travel plans.

### Current Application Features

The application is a travel itinerary builder called "Journey" that allows users to:
- Create and manage travel itineraries
- Search and add activities/places to visit
- Organize activities by date and time
- View activities on interactive maps
- Export itineraries in various formats (PDF, Excel, KML, Google Maps)

### Key Architectural Patterns

1. **App Router Structure**: Uses Next.js App Router with layouts and nested routing
   - Main app layout in `app/layout.tsx` and `app/layoutWrapper.tsx`
   - Protected routes handled via middleware and Supabase auth

2. **Component Organization**:
   - Reusable UI components in `components/ui/` (Radix UI based)
   - Feature-specific components organized by domain (e.g., `components/cards/`, `components/map/`)
   - Complex components like maps and calendars in dedicated folders

3. **State Management**:
   - Zustand stores in `store/` for client-side state (activities, cart, map, user preferences)
   - React Query for server state and data fetching
   - Persistent query storage for offline capabilities

4. **Server Actions**: Located in `actions/` directory, organized by service:
   - `auth/`: Authentication flows
   - `google/`: Google Maps API interactions
   - `stripe/`: Payment processing
   - `supabase/`: Database operations

5. **Type Safety**: 
   - TypeScript with strict mode enabled
   - Path aliases configured (`@/*` maps to root)
   - Zod schemas for form validation in `schemas/`

6. **Map Integration**:
   - Custom Google Maps implementation with markers, overlays, and area search
   - deck.gl for advanced map visualizations
   - Location-based features with geocoding

### Key Features Implementation

- **Itinerary Builder**: Drag-and-drop interface using @dnd-kit
- **Activity Search**: Integration with Google Places API
- **Calendar Views**: Multiple calendar libraries (FullCalendar, React Big Calendar, DayPilot)
- **Export Functionality**: Multiple export formats in `utils/export/`
- **Responsive Design**: Mobile-first approach with custom hooks for responsive behavior

### Supabase Integration

The project uses Supabase for:
- User authentication and session management
- Database operations (via server actions)
- Edge functions for scheduled tasks (cleanup deleted accounts)

Local Supabase development requires Docker Desktop.

### Important Notes

- The project name in package.json is "Journey" but the app may be referred to as "yugen" based on the directory structure
- Color scheme is defined in README.md for consistent theming
- The app includes Stripe integration for subscription management
- Google Maps API key required for map functionality

## Development Roadmap & Tickets

### Phase 1: Foundation & Infrastructure
**Tickets:**
- `INFRA-001`: Set up new Supabase project and configure environment
- `INFRA-002`: Design and create database schema (users, itineraries, destinations, places, activities)
- `INFRA-003`: Implement Supabase authentication and user management
- `INFRA-004`: Create server actions for database operations
- `INFRA-005`: Set up Google Maps API integration and place search functionality

### Phase 2: Core User Journey Implementation
**Tickets:**
- `UX-001`: Redesign landing page with professional theme
- `UX-002`: Implement destination selection flow (Phase 1 of user journey)
- `UX-003`: Build place discovery and search interface
- `UX-004`: Create wishlist/collection system for saving places (Phase 2 of user journey)
- `UX-005`: Design and implement main itinerary builder layout

### Phase 3: Drag-and-Drop Calendar System
**Tickets:**
- `CALENDAR-001`: Implement Google Calendar-style drag-and-drop interface
- `CALENDAR-002`: Create draggable place blocks with activity information
- `CALENDAR-003`: Build side panel for place library/wishlist
- `CALENDAR-004`: Implement time-based scheduling with precise placement
- `CALENDAR-005`: Add calendar grid with day/hour slots for dropping activities
- `CALENDAR-006`: Handle drag-and-drop interactions between wishlist and calendar

### Phase 4: Alternative Views & Organization
**Tickets:**
- `VIEW-001`: Create text-based list view for daily itineraries
- `VIEW-002`: Implement view switching between calendar and list modes
- `VIEW-003`: Add day-by-day breakdown with time slots
- `VIEW-004`: Build responsive mobile version of itinerary views

### Phase 5: Enhanced Features & Polish
**Tickets:**
- `FEATURE-001`: Improve map integration with itinerary activities
- `FEATURE-002`: Add duration estimates and travel time calculations
- `FEATURE-003`: Implement export functionality (PDF, Excel, etc.)
- `FEATURE-004`: Add collaboration features for shared itineraries
- `FEATURE-005`: Performance optimization and loading states

### Phase 6: Advanced Features
**Tickets:**
- `ADVANCED-001`: Multi-destination itinerary support
- `ADVANCED-002`: Smart scheduling suggestions based on location and time
- `ADVANCED-003`: Integration with booking platforms
- `ADVANCED-004`: Offline capability and sync
- `ADVANCED-005`: Advanced filtering and recommendation system

### Bug Fixes & Improvements
**Tickets:**
- `BUG-001`: Fix any existing TypeScript errors and warnings
- `BUG-002`: Resolve mobile responsiveness issues
- `BUG-003`: Fix map rendering and interaction bugs
- `IMPROVE-001`: Refactor component structure for better maintainability
- `IMPROVE-002`: Add comprehensive error handling and user feedback
- `IMPROVE-003`: Implement proper loading states and skeleton screens

## Development Best Practices & Standards

This section provides comprehensive guidelines for maintaining consistency, performance, and scalability across the Journey codebase.

### **Directory Structure & Organization**

#### **Root-Level Component Organization**
```
components/
├── ui/                          # Base UI primitives (Radix UI based)
├── [feature-name]/              # Feature-specific components
│   ├── __tests__/               # Co-located tests
│   ├── types.ts                 # Feature-specific types
│   ├── constants.ts             # Feature constants
│   ├── utils.ts                 # Feature utilities
│   ├── hooks/                   # Feature-specific hooks (if many)
│   ├── [sub-feature]/           # Nested sub-features
│   └── index.ts                 # Barrel exports
├── layouts/                     # Layout components
├── providers/                   # Context providers
└── hooks/                       # Shared custom hooks
```

#### **Feature Directory Standards**
Each feature directory should follow this pattern:
- **Atomic components** (single responsibility)
- **Composite components** (composed of atomic components) 
- **Container components** (business logic, data fetching)
- **Supporting files** (types, constants, utilities)

**Example: `components/map/` structure:**
```
map/
├── __tests__/                   # Feature tests
├── suggestions/                 # Sub-feature module
│   ├── components/              # Suggestion-specific components  
│   ├── hooks/                   # Custom hooks
│   ├── types.ts                 # Type definitions
│   ├── constants.ts             # Constants
│   ├── utils.ts                 # Utilities
│   └── index.ts                 # Public API
├── GoogleMap.tsx                # Main container component
├── MapMarker.tsx                # Atomic component
├── MapOverlay.tsx               # Composite component
├── types.ts                     # Map-specific types
└── index.ts                     # Barrel exports
```

#### **Page Structure Standards**
```
app/
├── (dashboard)/                 # Route groups for shared layouts
│   ├── layout.tsx               # Group layout
│   └── [feature]/               # Feature pages
├── [dynamic-route]/             # Dynamic routing
│   ├── [id]/                    # Nested dynamic routes
│   │   ├── layout.tsx           # Route-specific layout
│   │   └── page.tsx             # Page component
│   └── layout.tsx               # Parent layout
└── layout.tsx                   # Root layout
```

### **Component Architecture & Design Principles**

#### **Component Hierarchy & Composition**

**1. Base UI Components (`components/ui/`)**
- Single responsibility primitives
- 20-80 lines maximum
- Zero business logic
- Highly reusable across features
- Variant-based styling with `class-variance-authority`

```typescript
// Example: Button component structure
const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => (
  <button
    className={cn(buttonVariants({ variant, size, className }))}
    ref={ref}
    {...props}
  />
))
```

**2. Feature Components**
- **Atomic**: 50-150 lines (single UI element)
- **Composite**: 100-200 lines (multiple UI elements)  
- **Container**: 150-300 lines (business logic + UI)
- **System**: 200+ lines (complex interactions, justified exceptions)

**3. Page Components**
- **Simple pages**: 100-200 lines maximum
- **Complex pages**: 200-400 lines (break into smaller components if larger)
- Focus on composition over massive single components
- Extract reusable sections into named components

#### **Component Reusability Strategy**

**BEFORE creating new components:**
1. **Search existing components**: Use `find` or `grep` to locate similar functionality
2. **Check UI primitives**: Review `components/ui/` for base components
3. **Evaluate composition**: Can you combine existing components?
4. **Assess customization**: Can existing components be extended with props?

**Component Reusability Hierarchy:**
1. **Extend existing UI primitives** (preferred)
2. **Compose existing components** (second choice)
3. **Create feature-specific variants** (third choice)
4. **Build new components** (last resort)

**Example: Reusing ActivityCard patterns:**
```typescript
// ✅ GOOD: Extend existing ActivityCard
<ActivityCard
  variant="horizontal"
  showBulkActions={true}
  customActions={customActions}
/>

// ❌ BAD: Creating ActivityCardHorizontalWithBulk
// Only create new if fundamentally different behavior needed
```

### **Styling & Theme Standards**

#### **Color System & Theme Adherence**

**Primary Brand Colors (from README.md):**
- **Dark Blue**: `#2A3B63` - Primary navigation, headers
- **Blue**: `#3F5FA3` - Primary actions, links, highlights
- **Pink**: `#FF006E` - Accent colors, CTAs
- **Purple**: `#8338EC` - Secondary actions, tags
- **Orange**: `#FB5607` - Warning states, alerts
- **Yellow**: `#FFBE0B` - Attention, notifications
- **Green**: `#5AD63E` - Success states, confirmations

**Semantic CSS Variables (HSL format):**
```css
/* Use semantic variables for consistency */
bg-primary          /* Brand blue */
bg-secondary        /* Muted backgrounds */
bg-accent          /* Highlight backgrounds */
bg-destructive     /* Error/danger states */
text-primary       /* Primary text */
text-muted-foreground /* Secondary text */
border-border      /* Consistent borders */
```

**Color Usage Guidelines:**
- **DO**: Use semantic CSS variables from `globals.css`
- **DO**: Follow existing activity type color coding (restaurants=red, attractions=blue)
- **DON'T**: Introduce arbitrary colors outside the brand palette
- **DON'T**: Use hardcoded hex values in components

#### **Responsive Design Standards**

**Breakpoint System:**
```typescript
// Extended breakpoints (tailwind.config.ts)
xs: '475px'    // Mobile landscape
sm: '640px'    // Small tablets  
md: '768px'    // Large tablets
lg: '1024px'   // Small desktop
xl: '1280px'   // Desktop
2xl: '1536px'  // Large desktop
3xl: '1600px'  // Extended desktop
```

**Responsive Patterns:**
```typescript
// ✅ GOOD: Mobile-first approach
className="
  flex flex-col gap-2           // Mobile
  md:flex-row md:gap-4          // Tablet+
  lg:gap-6                      // Desktop+
"

// ✅ GOOD: Component-level responsiveness
const isMobile = useIsMobile();
return isMobile ? <MobileView /> : <DesktopView />;
```

### **State Management Best Practices**

#### **useEffect Guidelines - Avoiding "useEffect Hell"**

**Rule 1: Minimize useEffect Usage**
```typescript
// ❌ BAD: Unnecessary useEffect
const [data, setData] = useState(null);
useEffect(() => {
  setData(processData(props.rawData));
}, [props.rawData]);

// ✅ GOOD: Derived state
const data = useMemo(() => processData(props.rawData), [props.rawData]);
```

**Rule 2: Logical useEffect Placement**
```typescript
// ✅ GOOD: Group related effects, clear dependencies
useEffect(() => {
  // Initialization logic
  const cleanup = initializeFeature();
  return cleanup;
}, []); // Mount only

useEffect(() => {
  // Data sync logic  
  if (shouldSync) {
    syncData();
  }
}, [shouldSync, dataId]); // Clear dependencies

useEffect(() => {
  // Event listeners
  const handleResize = () => updateLayout();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []); // Event lifecycle
```

**Rule 3: useEffect vs Zustand Store Decision Matrix**

**Use useEffect when:**
- Component-specific side effects (DOM manipulation, event listeners)
- Cleanup required (subscriptions, timers, listeners) 
- Single component state synchronization
- External API calls triggered by user interactions

**Use Zustand Store when:**
- State shared across multiple components
- Complex state logic with multiple actions
- Persistent state (localStorage, sessionStorage)
- Global application state (user, cart, preferences)

**Existing Zustand Stores:**
- `useItineraryActivityStore` - Activity data and operations
- `useMapStore` - Map state and coordinates  
- `useCartStore` - Shopping cart functionality
- `useUserStore` - User preferences and profile
- `useDateRangeStore` - Date selection state

#### **Custom Hooks Strategy**

**Extract to custom hooks when:**
- Logic used in 2+ components
- Complex state management patterns
- External API integrations
- Reusable side effects

```typescript
// ✅ GOOD: Reusable hook pattern
const useTravelTimes = (activities: Activity[]) => {
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (activities.length < 2) return;
    
    setLoading(true);
    calculateTravelTimes(activities)
      .then(setTravelTimes)
      .finally(() => setLoading(false));
  }, [activities]);
  
  return { travelTimes, loading };
};
```

### **TypeScript Standards**

#### **Type Definition Organization**
```
types/
├── global.ts           # Global type definitions
├── api.ts             # API response types
├── database.ts        # Supabase generated types  
└── [feature].ts       # Feature-specific types
```

**Component Type Patterns:**
```typescript
// ✅ GOOD: Comprehensive prop interfaces
interface ActivityCardProps {
  activity: Activity;
  variant?: 'default' | 'horizontal' | 'compact';
  showActions?: boolean;
  onEdit?: (activity: Activity) => void;
  onDelete?: (id: string) => void;
  className?: string;
  children?: React.ReactNode;
}

// ✅ GOOD: Generic component types
interface DataCardProps<T> {
  data: T;
  renderContent: (item: T) => React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: (item: T) => void;
  }>;
}
```

### **Performance & Optimization Guidelines**

#### **Component Performance**
```typescript
// ✅ GOOD: Memoization patterns
const ExpensiveComponent = memo(({ data, onAction }) => {
  const processedData = useMemo(
    () => expensiveDataProcessing(data), 
    [data]
  );
  
  const handleAction = useCallback(
    (id: string) => onAction?.(id), 
    [onAction]
  );
  
  return <div>{/* Component JSX */}</div>;
});

// ✅ GOOD: Conditional rendering
return (
  <div>
    {showComplexFeature && <ComplexFeature />}
    {data.length > 0 && (
      <VirtualizedList items={data} />
    )}
  </div>
);
```

#### **Bundle Optimization**
```typescript
// ✅ GOOD: Dynamic imports for large features
const CalendarView = lazy(() => import('./CalendarView'));
const MapView = lazy(() => import('./MapView'));

// ✅ GOOD: Selective imports
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatting/datetime';
```

### **Testing Standards**

#### **Test Organization**
```
components/[feature]/
├── __tests__/
│   ├── [Component].test.tsx       # Unit tests
│   ├── [Component].integration.test.tsx # Integration tests
│   ├── [Component].edge-cases.test.tsx  # Edge cases
│   ├── test-utils.ts              # Test utilities
│   └── README.md                  # Test documentation
```

**Test Coverage Priorities:**
1. **Critical user flows** (creating itineraries, adding activities)
2. **Complex business logic** (scheduling, travel time calculations)
3. **Data transformations** (export functionality, formatting)
4. **Error handling** (API failures, invalid data)

### **Error Handling & User Experience**

#### **Error Boundaries**
```typescript
// Feature-level error boundaries
<ErrorBoundary fallback={<FeatureErrorFallback />}>
  <ComplexFeature />
</ErrorBoundary>
```

#### **Loading States**
```typescript
// ✅ GOOD: Consistent loading patterns
if (loading) return <SkeletonLoader />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <DataView data={data} />;
```

#### **User Feedback**
```typescript
// ✅ GOOD: Consistent toast notifications
import { toast } from 'sonner';

const handleSave = async () => {
  try {
    await saveData();
    toast.success('Changes saved successfully');
  } catch (error) {
    toast.error('Failed to save changes');
  }
};
```

### **Code Quality & Maintenance**

#### **Import Organization**
```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries  
import { format } from 'date-fns';
import { toast } from 'sonner';

// 3. Internal utilities
import { cn } from '@/lib/utils';

// 4. Store imports
import { useActivityStore } from '@/store/activityStore';

// 5. Component imports (grouped by type)
import { Button } from '@/components/ui/button';
import { ActivityCard } from '@/components/cards/activityCard';

// 6. Type imports (separate from value imports)
import type { Activity, ItineraryActivity } from '@/types/activity';
```

#### **Component Documentation**
```typescript
/**
 * ActivityListView - Displays itinerary activities in a sortable list format
 * 
 * Features:
 * - Drag & drop reordering with @dnd-kit
 * - Bulk selection and actions  
 * - Time conflict detection
 * - Travel time calculations
 * - Responsive design with mobile optimization
 * 
 * @example
 * <ActivityListView 
 *   activities={activities}
 *   onReorder={handleReorder}
 *   showTravelTimes={true}
 * />
 */
```

### **Component Size Guidelines & Refactoring Triggers**

#### **Size Guidelines by Component Type**

**Micro Components (20-50 lines):**
- Icons, badges, simple buttons
- Single-purpose utilities
- Basic form inputs

**Standard Components (50-200 lines):**  
- Cards, modals, form sections
- **TARGET RANGE** - Most components should fall here
- Feature-specific UI elements

**Complex Components (200-400 lines):**
- Multi-step forms, data tables
- **REQUIRES JUSTIFICATION** - Document why complexity is needed
- Consider breaking into smaller components

**System Components (400+ lines):**
- **EXCEPTION ONLY** - Requires architectural review
- Must be split unless core system functionality
- Examples: `ItineraryListView` (complex interaction system)

#### **Refactoring Triggers**
**Split component when:**
- Exceeds 200 lines without strong justification
- Contains 3+ distinct responsibilities  
- Has 10+ props (consider composition)
- Difficult to test as single unit
- Multiple developers conflict on same file

**Refactoring Strategies:**
```typescript
// ❌ BAD: Monolithic component
const ItineraryBuilder = () => {
  // 500+ lines of mixed concerns
  return (
    <div>
      {/* Header logic */}
      {/* Sidebar logic */}  
      {/* Calendar logic */}
      {/* Footer logic */}
    </div>
  );
};

// ✅ GOOD: Composed architecture
const ItineraryBuilder = () => {
  return (
    <ItineraryBuilderLayout>
      <ItineraryHeader />
      <div className="flex">
        <ItinerarySidebar />
        <ItineraryCalendar />
      </div>
      <ItineraryFooter />
    </ItineraryBuilderLayout>
  );
};
```

### **Mobile-First Development**

#### **Mobile Component Strategy**
```
components/
├── mobile/                    # Mobile-specific components
│   ├── MobileActivityCard.tsx # Mobile-optimized versions
│   ├── MobileNavigation.tsx   # Touch-friendly navigation
│   └── SwipeGestures.tsx      # Gesture handling
└── [feature]/
    ├── [Component].tsx        # Responsive component
    └── [Component].mobile.tsx # Mobile variant (if needed)
```

**Responsive Component Pattern:**
```typescript
const ActivityCard = ({ activity, ...props }) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileActivityCard activity={activity} {...props} />;
  }
  
  return <DesktopActivityCard activity={activity} {...props} />;
};
```

### **Accessibility Standards**

#### **Required Accessibility Patterns**
```typescript
// ✅ GOOD: Comprehensive accessibility
<button
  className={buttonStyles}
  aria-label={ariaLabel}
  aria-describedby={descriptionId}
  disabled={isLoading}
  onClick={handleClick}
>
  {isLoading && <Spinner aria-hidden="true" />}
  {label}
</button>

// ✅ GOOD: Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction();
    }
  }}
  onClick={handleAction}
>
```

### **Summary: Key Development Principles**

1. **Composition over Inheritance**: Build complex UIs by composing smaller, reusable components
2. **Performance by Default**: Use `memo`, `useMemo`, and `useCallback` appropriately  
3. **TypeScript Everywhere**: Comprehensive type coverage with proper interfaces
4. **Mobile-First**: Design for mobile, enhance for desktop
5. **Accessibility First**: WCAG compliance from the start, not as afterthought
6. **Test-Driven Features**: Write tests for complex business logic
7. **Consistent Styling**: Use design system tokens and semantic CSS variables
8. **Error Resilience**: Graceful error handling and recovery
9. **State Management**: Choose the right tool (local state, stores, server state)
10. **Documentation**: Self-documenting code with comprehensive inline documentation