# List Components Best Practices

This document outlines the development standards and best practices for components within the `/components/list` directory. These guidelines ensure consistency, maintainability, and optimal performance across all list-related components.

## Directory Structure

```
components/list/
├── activity/              # Individual activity components
├── bulk-actions/          # Bulk selection and operations
├── containers/            # Container components (orchestration)
├── drag-drop/             # Drag and drop functionality
├── search-filter/         # Search and filtering features
├── time-management/       # Time slots, conflicts, suggestions
├── __tests__/             # Test files and utilities
└── CLAUDE.md              # This documentation
```

## Component Guidelines

### 1. Component Size & Complexity

**Maximum Lines per Component: 200**
- Components exceeding 200 lines MUST be refactored
- Complex components should be split into smaller, focused units
- Use composition over monolithic components

**Size Guidelines by Type:**
- **Atomic Components**: 20-80 lines (buttons, badges, inputs)
- **Feature Components**: 80-150 lines (cards, list items)
- **Container Components**: 150-200 lines (orchestration, layout)
- **Provider Components**: 100-200 lines (context providers)

### 2. Naming Conventions

**File Naming:**
- Use PascalCase for component files: `ActivityCard.tsx`
- Use camelCase for utility files: `timeHelpers.ts`
- Use kebab-case for directories: `search-filter/`
- Prefix hooks with "use": `useSearchFilter.ts`

**Component Naming:**
```typescript
// ✅ GOOD: Descriptive, specific names
export const ActivityTimeBlock = () => {}
export const BulkActionToolbar = () => {}

// ❌ BAD: Generic, ambiguous names
export const Block = () => {}
export const Toolbar = () => {}
```

**Props Interface Naming:**
```typescript
// ✅ GOOD: Component name + "Props"
interface ActivityCardProps {
  activity: Activity;
  onEdit?: (id: string) => void;
}

// ❌ BAD: Generic or inconsistent naming
interface Props {}
interface ActivityProps {}
```

### 3. Component Structure

**Standard Component Template:**
```typescript
import React from 'react';
import { cn } from '@/lib/utils';
import type { ActivityCardProps } from './types';

/**
 * ActivityCard - Displays a single activity with actions
 * 
 * @example
 * <ActivityCard 
 *   activity={activity}
 *   onEdit={handleEdit}
 *   variant="compact"
 * />
 */
export const ActivityCard = React.memo<ActivityCardProps>(({ 
  activity,
  onEdit,
  variant = 'default',
  className,
  ...props 
}) => {
  // 1. Hooks (in order: state, context, custom)
  const [isEditing, setIsEditing] = useState(false);
  const { updateActivity } = useActivityStore();
  
  // 2. Computed values & memoization
  const formattedTime = useMemo(
    () => formatActivityTime(activity),
    [activity.startTime, activity.endTime]
  );
  
  // 3. Event handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    onEdit?.(activity.id);
  }, [activity.id, onEdit]);
  
  // 4. Early returns
  if (!activity) return null;
  
  // 5. Render
  return (
    <div 
      className={cn(
        'activity-card',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Component JSX */}
    </div>
  );
});

ActivityCard.displayName = 'ActivityCard';
```

### 4. State Management Principles

**Component State Hierarchy:**
1. **Local State**: UI-only state (isOpen, isHovered)
2. **Context/Provider**: Shared feature state (selection, filters)
3. **Zustand Store**: Global app state (activities, user)
4. **Server State**: React Query for API data

**State Management Rules:**
```typescript
// ✅ GOOD: Appropriate state placement
const ActivityCard = () => {
  // Local UI state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Global state from store
  const { activities, updateActivity } = useActivityStore();
  
  // Server state with React Query
  const { data: placeDetails } = useQuery({
    queryKey: ['place', activity.placeId],
    queryFn: () => fetchPlaceDetails(activity.placeId),
  });
};

// ❌ BAD: Over-engineering state
const ActivityCard = () => {
  // Don't use global state for UI-only concerns
  const { isCardExpanded } = useGlobalUIStore();
};
```

### 5. Performance Optimization

**Memoization Guidelines:**
```typescript
// ✅ GOOD: Memoize expensive computations
const expensiveData = useMemo(
  () => calculateComplexMetrics(activities),
  [activities]
);

// ✅ GOOD: Memoize callbacks passed to children
const handleUpdate = useCallback(
  (id: string, data: Partial<Activity>) => {
    updateActivity(id, data);
  },
  [updateActivity]
);

// ✅ GOOD: Memoize components with complex props
export const ActivityCard = React.memo(ActivityCardComponent);

// ❌ BAD: Over-memoization
const simpleValue = useMemo(() => activity.name, [activity.name]);
```

**Rendering Optimization:**
```typescript
// ✅ GOOD: Conditional rendering
{showMetrics && <EfficiencyMetrics data={metrics} />}

// ✅ GOOD: Lazy loading heavy components
const MapView = lazy(() => import('./MapView'));

// ❌ BAD: Rendering hidden elements
<div style={{ display: showMetrics ? 'block' : 'none' }}>
  <EfficiencyMetrics data={metrics} />
</div>
```

### 6. Props & TypeScript

**Props Best Practices:**
```typescript
interface ActivityCardProps {
  // Required props first
  activity: Activity;
  
  // Optional props with defaults
  variant?: 'default' | 'compact' | 'expanded';
  showActions?: boolean;
  
  // Event handlers
  onEdit?: (activity: Activity) => void;
  onDelete?: (id: string) => void;
  
  // Standard HTML props
  className?: string;
  children?: React.ReactNode;
}

// ✅ GOOD: Extend HTML element props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

// ❌ BAD: Any types or loose typing
interface BadProps {
  data: any;
  onChange: Function;
}
```

### 7. Composition Patterns

**Component Composition:**
```typescript
// ✅ GOOD: Composable components
<ActivityCard>
  <ActivityCard.Header>
    <ActivityCard.Title>{activity.name}</ActivityCard.Title>
    <ActivityCard.Actions>
      <EditButton onClick={handleEdit} />
      <DeleteButton onClick={handleDelete} />
    </ActivityCard.Actions>
  </ActivityCard.Header>
  <ActivityCard.Content>
    {activity.description}
  </ActivityCard.Content>
</ActivityCard>

// ✅ GOOD: Render props for flexibility
<DragDropProvider
  render={({ isDragging, dragRef }) => (
    <div ref={dragRef} className={isDragging ? 'dragging' : ''}>
      {children}
    </div>
  )}
/>

// ❌ BAD: Prop drilling
<Parent data={data} onEdit={onEdit} onDelete={onDelete}>
  <Child data={data} onEdit={onEdit} onDelete={onDelete}>
    <GrandChild data={data} onEdit={onEdit} onDelete={onDelete} />
  </Child>
</Parent>
```

### 8. Error Handling

**Component Error Boundaries:**
```typescript
// ✅ GOOD: Graceful error handling
const ActivityList = () => {
  const { activities, error, loading } = useActivities();
  
  if (error) {
    return <ErrorMessage message="Failed to load activities" />;
  }
  
  if (loading) {
    return <ActivityListSkeleton />;
  }
  
  if (!activities?.length) {
    return <EmptyState message="No activities yet" />;
  }
  
  return <>{/* Render activities */}</>;
};

// ✅ GOOD: Error boundaries for features
<ErrorBoundary fallback={<ListErrorFallback />}>
  <ItineraryListContainer />
</ErrorBoundary>
```

### 9. Accessibility Standards

**Required Accessibility Patterns:**
```typescript
// ✅ GOOD: Comprehensive accessibility
<button
  aria-label="Edit activity"
  aria-describedby={`edit-${activity.id}`}
  onClick={handleEdit}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleEdit();
    }
  }}
>
  <EditIcon aria-hidden="true" />
</button>

// ✅ GOOD: Semantic HTML
<article role="listitem" aria-label={activity.name}>
  <h3>{activity.name}</h3>
  <time dateTime={activity.startTime}>
    {formatTime(activity.startTime)}
  </time>
</article>

// ❌ BAD: Div soup
<div onClick={handleClick}>
  <div>{activity.name}</div>
  <div>{activity.time}</div>
</div>
```

### 10. Testing Guidelines

**Component Testing Structure:**
```typescript
// __tests__/ActivityCard.test.tsx
describe('ActivityCard', () => {
  const mockActivity = createMockActivity();
  
  it('renders activity information', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText(mockActivity.name)).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<ActivityCard activity={mockActivity} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByLabelText('Edit activity'));
    expect(onEdit).toHaveBeenCalledWith(mockActivity);
  });
  
  it('handles missing activity gracefully', () => {
    render(<ActivityCard activity={null} />);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
```

### 11. Code Quality Checklist

Before committing a component, ensure:

- [ ] Component is under 200 lines
- [ ] Props are properly typed with TypeScript
- [ ] Component has JSDoc documentation
- [ ] Memoization is used appropriately
- [ ] Error states are handled
- [ ] Loading states are implemented
- [ ] Component is accessible (ARIA labels, keyboard nav)
- [ ] No hardcoded strings (use constants)
- [ ] No inline styles (use Tailwind classes)
- [ ] Component follows naming conventions
- [ ] Unused imports are removed
- [ ] Console.logs are removed

### 12. Common Patterns

**List Item Pattern:**
```typescript
export const ListItem = ({ item, isSelected, onSelect }) => (
  <li
    role="option"
    aria-selected={isSelected}
    onClick={() => onSelect(item.id)}
    className={cn(
      'list-item',
      isSelected && 'list-item--selected'
    )}
  >
    {item.content}
  </li>
);
```

**Filter Pattern:**
```typescript
export const useFilter = <T,>(
  items: T[],
  predicate: (item: T) => boolean
) => {
  return useMemo(
    () => items.filter(predicate),
    [items, predicate]
  );
};
```

**Drag & Drop Pattern:**
```typescript
export const DraggableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn('draggable', isDragging && 'dragging')}
    >
      {children}
    </div>
  );
};
```

## Migration Guide

When refactoring existing components:

1. **Check component size** - Split if over 200 lines
2. **Extract reusable logic** into custom hooks
3. **Move to appropriate subdirectory**
4. **Update imports** across the codebase
5. **Add proper TypeScript types**
6. **Add accessibility attributes**
7. **Write/update tests**
8. **Update this documentation** if patterns change

## Component API Documentation

Each component should include:

```typescript
/**
 * ComponentName - Brief description of purpose
 * 
 * @example
 * <ComponentName
 *   requiredProp={value}
 *   optionalProp="value"
 *   onAction={handleAction}
 * />
 * 
 * @param {Object} props - Component props
 * @param {Type} props.requiredProp - Description
 * @param {Type} [props.optionalProp] - Description
 * @returns {JSX.Element} Rendered component
 */
```

## Banned Practices

1. **NO Class Components** - Use functional components only
2. **NO Direct DOM Manipulation** - Use React refs and state
3. **NO Inline Functions in JSX** - Use useCallback
4. **NO Any Types** - Always provide proper types
5. **NO Console Logs** - Use proper debugging tools
6. **NO Magic Numbers** - Use named constants
7. **NO Nested Ternaries** - Use early returns or switch
8. **NO Side Effects in Render** - Use useEffect
9. **NO Mutations** - Use immutable updates
10. **NO CSS-in-JS** - Use Tailwind classes

## Resources

- [React Documentation](https://react.dev)
- [Next.js Best Practices](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Best Practices](https://testing-library.com/docs/react-testing-library/intro/)