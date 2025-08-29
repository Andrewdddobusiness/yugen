# Component Directory Organization Guide

This guide outlines the preferred organization structure for the `/components` directory in the Journey project.

## Directory Structure Philosophy

Components should be organized following a **UI-first, then feature-specific** hierarchy. This makes it easier to find reusable components and understand their purpose at a glance.

## Naming Conventions

1. **Parent directories** should be named after common UI component types (lowercase, singular)
2. **Subdirectories** within UI components should be feature/page-specific
3. Use descriptive, semantic names that clearly indicate the component's purpose

## Directory Structure

```
components/
├── button/                    # UI: Button components
│   ├── index.tsx             # Base button exports
│   ├── activity/             # Activity-specific buttons
│   │   ├── AddToItineraryButton.tsx
│   │   └── ActivityActionButton.tsx
│   └── map/                  # Map-specific buttons
│       ├── MapViewToggleButton.tsx
│       └── ClearHistoryButton.tsx
│
├── card/                      # UI: Card components
│   ├── index.tsx             # Base card exports
│   ├── activity/             # Activity cards
│   │   ├── ActivityCard.tsx
│   │   └── ActivitySkeletonCard.tsx
│   └── itinerary/            # Itinerary cards
│       └── ItineraryCard.tsx
│
├── dialog/                    # UI: Dialog/Modal components
│   ├── index.tsx
│   ├── export/               # Export-specific dialogs
│   │   └── ExportDialog.tsx
│   └── activity/             # Activity dialogs
│       └── ActivityDetailsDialog.tsx
│
├── form/                      # UI: Form components
│   ├── index.tsx
│   ├── auth/                 # Authentication forms
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── activity/             # Activity forms
│       └── ActivityEditForm.tsx
│
├── layout/                    # UI: Layout components
│   ├── index.tsx
│   ├── sidebar/              # Sidebar layouts
│   │   ├── AppSidebar.tsx
│   │   └── ActivitySidebar.tsx
│   └── header/               # Header layouts
│       └── AppHeader.tsx
│
├── list/                      # UI: List components
│   ├── index.tsx
│   ├── activity/             # Activity lists
│   │   └── ActivityList.tsx
│   └── itinerary/            # Itinerary lists
│       └── ItineraryListView.tsx
│
├── map/                       # UI: Map components
│   ├── index.tsx
│   ├── GoogleMap.tsx         # Base map component
│   ├── markers/              # Map markers
│   │   ├── GoogleMarker.tsx
│   │   └── ActivityMarker.tsx
│   ├── controls/             # Map controls
│   │   └── MapController.tsx
│   └── suggestions/          # Map suggestions feature
│       ├── LocationSuggestions.tsx
│       ├── SuggestionMarker.tsx
│       └── FilterPanel.tsx
│
├── provider/                  # UI: Context providers
│   ├── index.tsx
│   ├── auth/                 # Auth providers
│   │   └── AuthProvider.tsx
│   └── theme/                # Theme providers
│       └── ThemeProvider.tsx
│
├── search/                    # UI: Search components
│   ├── index.tsx
│   ├── SearchField.tsx       # Base search
│   └── place/                # Place search
│       └── PlaceSearch.tsx
│
├── table/                     # UI: Table components
│   ├── index.tsx
│   └── itinerary/            # Itinerary tables
│       └── ItineraryTable.tsx
│
├── ui/                        # UI: Primitive components (Radix UI)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ... (other primitives)
│
├── view/                      # UI: View components
│   ├── calendar/             # Calendar views
│   │   ├── Calendar.tsx
│   │   └── GoogleCalendarView.tsx
│   └── toggle/               # View toggles
│       └── ViewToggle.tsx
│
└── hooks/                     # Shared custom hooks
    ├── use-debounce.ts
    ├── use-mobile.ts
    └── use-responsive.ts
```

## Guidelines

### 1. **UI-First Organization**
- Start with the UI component type (button, card, dialog, etc.)
- Then organize by feature/domain within each UI type
- This makes reusable components easy to find

### 2. **Feature Grouping**
Common feature subdirectories:
- `activity/` - Activity-related components
- `itinerary/` - Itinerary-specific components
- `auth/` - Authentication components
- `map/` - Map-related components
- `builder/` - Builder-specific components

### 3. **Component Exports**
- Each parent directory should have an `index.ts` for public exports
- Feature subdirectories can have their own index files for organization

### 4. **Shared vs. Specific**
- Base/shared components live at the parent level
- Feature-specific variants live in subdirectories

### 5. **Complex Features**
For complex features like map suggestions:
- Keep related components together in a feature subdirectory
- Include types, hooks, and utilities within the feature directory
- Maintain clear separation of concerns

## Examples

### Good Organization ✅
```
components/
├── button/
│   ├── Button.tsx           # Base button
│   └── activity/
│       └── AddButton.tsx    # Activity-specific
```

### Poor Organization ❌
```
components/
├── activity/                # Feature-first (avoid)
│   ├── ActivityButton.tsx
│   ├── ActivityCard.tsx
│   └── ActivityDialog.tsx
```

## Migration Strategy

When refactoring existing components:
1. Identify the primary UI type
2. Create the appropriate parent directory if needed
3. Move component to correct location
4. Update imports across the codebase
5. Add to parent directory's index.ts exports

## Benefits

1. **Discoverability**: Easy to find components by UI type
2. **Reusability**: Clear separation of generic vs. specific components
3. **Scalability**: Structure scales well as features grow
4. **Consistency**: Predictable location for new components
5. **Developer Experience**: Intuitive navigation and reduced cognitive load