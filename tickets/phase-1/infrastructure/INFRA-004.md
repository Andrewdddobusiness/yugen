# INFRA-004: Create server actions for database operations

## Priority: High
## Status: Open
## Assignee: Unassigned
## Type: Infrastructure

## Description
Create comprehensive server actions for all database operations including CRUD operations for itineraries, places, activities, and wishlist management.

## Acceptance Criteria
- [ ] Create itinerary management actions (create, read, update, delete)
- [ ] Implement place management actions
- [ ] Create activity scheduling actions
- [ ] Build wishlist management actions
- [ ] Add destination management actions
- [ ] Implement proper error handling
- [ ] Add input validation with Zod schemas
- [ ] Create TypeScript types for all operations
- [ ] Add logging for debugging
- [ ] Implement optimistic updates where appropriate

## Server Actions to Create

### Itinerary Actions (`actions/supabase/itinerary.ts`)
- `createItinerary(data: CreateItineraryData)`
- `getItineraries(userId: string)`
- `getItinerary(id: string)`
- `updateItinerary(id: string, data: UpdateItineraryData)`
- `deleteItinerary(id: string)`
- `duplicateItinerary(id: string)`

### Place Actions (`actions/supabase/places.ts`)
- `createPlace(data: CreatePlaceData)`
- `getPlace(id: string)`
- `updatePlace(id: string, data: UpdatePlaceData)`
- `searchPlaces(query: string, location?: Coordinates)`
- `getPlacesByDestination(destinationId: string)`

### Activity Actions (`actions/supabase/activities.ts`)
- `scheduleActivity(data: ScheduleActivityData)`
- `updateActivitySchedule(id: string, data: UpdateScheduleData)`
- `removeActivityFromSchedule(id: string)`
- `getItineraryActivities(itineraryId: string)`
- `reorderActivities(activityIds: string[])`

### Wishlist Actions (`actions/supabase/wishlist.ts`)
- `addToWishlist(data: AddToWishlistData)`
- `removeFromWishlist(id: string)`
- `getWishlist(userId: string, itineraryId?: string)`
- `updateWishlistItem(id: string, data: UpdateWishlistData)`

### Destination Actions (`actions/supabase/destinations.ts`)
- `createDestination(data: CreateDestinationData)`
- `getDestination(id: string)`
- `searchDestinations(query: string)`

## Technical Requirements
- Use Supabase client for server-side operations
- Implement proper error handling with try-catch
- Add input validation using Zod schemas
- Return consistent response format `{ data, error }`
- Use TypeScript for type safety
- Add JSDoc comments for documentation
- Implement database transactions where needed

## Validation Schemas
Create Zod schemas in `schemas/` directory:
- `createItinerarySchema.ts`
- `placeSchema.ts`
- `activitySchema.ts`
- `wishlistSchema.ts`
- `destinationSchema.ts`

## Dependencies
- INFRA-001 (Supabase project setup)
- INFRA-002 (Database schema)
- INFRA-003 (Authentication for user context)

## Estimated Effort
5-6 hours

## Notes
- Ensure all operations respect Row Level Security
- Add comprehensive error messages for better UX
- Consider implementing caching for frequently accessed data
- Plan for batch operations in future phases