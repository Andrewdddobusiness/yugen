# INFRA-002: Design and create database schema

## Priority: High
## Status: ✅ Completed
## Assignee: Claude Code
## Type: Infrastructure

## Description
Design and implement the complete database schema for the Journey travel itinerary application, including all necessary tables, relationships, and indexes.

## Acceptance Criteria
- [x] Design ER diagram for database schema
- [x] Create `profiles` table with user profile information
- [x] Create `itinerary` table for trip planning
- [x] Create `countries` and `cities` tables for travel locations
- [x] Create `activity` table for places/activities
- [x] Create `itinerary_activity` table for scheduled activities
- [x] Create `itinerary_search_history` table for saved places/wishlist
- [x] Set up proper foreign key relationships
- [x] Add necessary indexes for performance
- [x] Create database migration files
- [x] Set up Row Level Security policies

## Database Tables Design

### Users Table
```sql
- id (uuid, primary key)
- email (text, unique)
- full_name (text)
- avatar_url (text)
- subscription_status (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### Itineraries Table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- title (text)
- description (text)
- start_date (date)
- end_date (date)
- destination_id (uuid, foreign key)
- is_public (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

### Destinations Table
```sql
- id (uuid, primary key)
- name (text)
- country (text)
- city (text)
- coordinates (point/geography)
- google_place_id (text)
- timezone (text)
- created_at (timestamp)
```

### Places Table
```sql
- id (uuid, primary key)
- google_place_id (text, unique)
- name (text)
- address (text)
- coordinates (point/geography)
- place_types (text[])
- rating (decimal)
- price_level (text)
- description (text)
- google_maps_url (text)
- website_url (text)
- phone_number (text)
- photo_urls (text[])
- opening_hours (jsonb)
- created_at (timestamp)
- updated_at (timestamp)
```

### Itinerary Activities Table
```sql
- id (uuid, primary key)
- itinerary_id (uuid, foreign key)
- place_id (uuid, foreign key)
- scheduled_date (date)
- start_time (time)
- end_time (time)
- duration_minutes (integer)
- notes (text)
- order_index (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

### Wishlist Places Table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- place_id (uuid, foreign key)
- itinerary_id (uuid, foreign key, nullable)
- notes (text)
- priority (integer)
- created_at (timestamp)
```

## Technical Requirements
- Use Supabase SQL editor or migration files
- Implement proper indexing strategy
- Set up RLS policies for data security
- Create database functions for complex operations
- Add triggers for updated_at timestamps

## Dependencies
- INFRA-001 (Supabase project setup)

## Estimated Effort
4-6 hours

## Notes
- Consider partitioning strategies for large datasets
- Plan for international timezone handling
- Ensure schema supports future multi-destination feature