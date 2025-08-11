# Enhanced Deep Linking System - Usage Examples

The enhanced view switching system now supports deep linking to specific dates within views. Here's how to use the new functionality:

## URL Patterns

The system supports these URL patterns:

- `/itinerary/:id/:destinationId/builder?view=calendar&date=2024-03-15`
- `/itinerary/:id/:destinationId/builder?view=list&date=2024-03-15`
- `/itinerary/:id/:destinationId/builder?view=table&date=2024-03-15`

## useViewRouter Hook

The enhanced `useViewRouter` hook provides the following new capabilities:

### Basic Usage

```typescript
import { useViewRouter } from '@/hooks/useViewRouter';

function MyComponent() {
  const { 
    currentView, 
    currentDate, 
    changeView, 
    navigateToDate,
    getDeepLinkUrl 
  } = useViewRouter({
    enableUrlSync: true,
    defaultView: 'table',
    onDateChange: (date) => {
      console.log('Navigated to date:', date);
    }
  });

  // Switch to list view on a specific date
  const handleDateClick = (date: Date) => {
    changeView('list', date);
  };

  // Navigate to specific date in current view
  const goToToday = () => {
    navigateToDate(new Date());
  };

  // Generate shareable link
  const shareDate = (date: Date) => {
    const url = getDeepLinkUrl('list', date);
    navigator.clipboard.writeText(url);
  };
}
```

### Advanced Usage

```typescript
function AdvancedComponent() {
  const { 
    changeView, 
    navigateToDate, 
    getShareableUrl,
    currentDate 
  } = useViewRouter({
    enableUrlSync: true,
    dateParamName: 'selectedDate', // Custom date parameter name
    onDateChange: (date) => {
      // Custom date change handling
      if (date) {
        // Scroll to specific date in the view
        scrollToDate(date);
      }
    }
  });

  return (
    <div>
      {/* Quick navigation buttons */}
      <button onClick={() => changeView('calendar', new Date())}>
        Calendar Today
      </button>
      
      <button onClick={() => changeView('list', new Date('2024-12-25'))}>
        Christmas Plans
      </button>
      
      {/* Share buttons */}
      <button onClick={() => {
        const urls = {
          calendar: getShareableUrl('calendar', currentDate),
          list: getShareableUrl('list', currentDate),
          table: getShareableUrl('table', currentDate)
        };
        console.log('Share URLs:', urls);
      }}>
        Get Share URLs
      </button>
    </div>
  );
}
```

## ItineraryListView with Date Navigation

The `ItineraryListView` component now supports automatic scrolling to dates:

```typescript
import { ItineraryListView, ItineraryListViewRef } from '@/components/list/ItineraryListView';

function MyItinerary() {
  const listRef = useRef<ItineraryListViewRef>(null);
  
  const scrollToSpecificDate = () => {
    const targetDate = new Date('2024-03-20');
    listRef.current?.scrollToDate(targetDate);
  };

  return (
    <div>
      <button onClick={scrollToSpecificDate}>
        Go to March 20th
      </button>
      
      <ItineraryListView
        ref={listRef}
        targetDate={new Date('2024-03-15')} // Initial date to show
        showMap={false}
        onToggleMap={() => {}}
      />
    </div>
  );
}
```

## ViewToggle with Date Support

The ViewToggle component can now handle date changes:

```typescript
function Toolbar() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  
  const handleViewChange = (view: ViewMode, date?: Date | null) => {
    console.log('View changed to:', view, 'Date:', date);
  };
  
  const handleDateChange = (date: Date | null) => {
    setCurrentDate(date);
    // Custom date handling logic
  };

  return (
    <ViewToggle
      onViewChange={handleViewChange}
      onDateChange={handleDateChange}
      currentDate={currentDate}
    />
  );
}
```

## Utility Functions

The system includes utility functions for working with view and date URLs:

```typescript
import { 
  formatDateForUrl, 
  parseDateFromUrl, 
  generateDeepLinkUrl,
  generateShareableUrls,
  updateUrlWithViewAndDate 
} from '@/utils/viewUtils';

// Format date for URL
const dateStr = formatDateForUrl(new Date('2024-03-15')); // "2024-03-15"

// Parse date from URL
const date = parseDateFromUrl('2024-03-15'); // Date object

// Generate deep link
const deepLink = generateDeepLinkUrl(
  'https://example.com/itinerary/123/builder',
  'list',
  new Date('2024-03-15')
); // "https://example.com/itinerary/123/builder?view=list&date=2024-03-15"

// Generate all view URLs for a date
const shareUrls = generateShareableUrls(
  'https://example.com/itinerary/123/builder',
  new Date('2024-03-15')
);
// {
//   calendar: "https://example.com/itinerary/123/builder?view=calendar&date=2024-03-15",
//   list: "https://example.com/itinerary/123/builder?view=list&date=2024-03-15",
//   table: "https://example.com/itinerary/123/builder?view=table&date=2024-03-15"
// }
```

## Integration Examples

### Date Picker Integration

```typescript
function DatePicker() {
  const { navigateToDate, currentDate } = useViewRouter();
  
  return (
    <input
      type="date"
      value={currentDate ? format(currentDate, 'yyyy-MM-dd') : ''}
      onChange={(e) => {
        const date = e.target.value ? parseISO(e.target.value) : null;
        navigateToDate(date, true); // Push to history
      }}
    />
  );
}
```

### Activity Links

```typescript
function ActivityCard({ activity, date }) {
  const { getDeepLinkUrl } = useViewRouter();
  
  const shareActivityDate = () => {
    const url = getDeepLinkUrl('list', new Date(date));
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };
  
  return (
    <div>
      <h3>{activity.name}</h3>
      <button onClick={shareActivityDate}>
        Share Date
      </button>
    </div>
  );
}
```

### Calendar Integration

```typescript
function CalendarWidget() {
  const { changeView } = useViewRouter();
  
  const handleDateSelect = (date: Date) => {
    // Switch to list view and navigate to selected date
    changeView('list', date);
  };
  
  return (
    <Calendar onDateSelect={handleDateSelect} />
  );
}
```

## Benefits

1. **Shareable URLs**: Users can share specific dates in specific views
2. **Bookmarking**: Users can bookmark specific dates and views
3. **Deep Navigation**: Direct links to specific content within the app
4. **Better UX**: Seamless navigation between dates and views
5. **SEO Friendly**: URLs are meaningful and indexable

## Browser Support

The enhanced deep linking system works in all modern browsers and gracefully degrades if JavaScript is disabled.