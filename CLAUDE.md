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