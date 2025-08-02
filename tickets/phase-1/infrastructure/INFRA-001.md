# INFRA-001: Set up new Supabase project and configure environment

## Priority: High
## Status: ✅ Completed
## Assignee: Claude Code
## Type: Infrastructure

## Description
Set up a new Supabase project to replace the lost one and configure all necessary environment variables and configurations.

## Acceptance Criteria
- [x] Create new Supabase project
- [x] Configure project settings (auth, database, storage)
- [x] Set up environment variables (.env and .env.example)
- [x] Update Supabase configuration files
- [x] Test database connection
- [x] Configure authentication providers (email, Google, etc.)
- [x] Set up Row Level Security (RLS) policies

## Technical Requirements
- Update `utils/supabase/client.ts` and `utils/supabase/server.ts` with new project credentials
- Configure `supabase/config.toml` for local development
- Set up proper environment variable structure

## Dependencies
- None

## Estimated Effort
2-3 hours

## Notes
- Need new Supabase project URL and anon key
- Consider setting up staging and production environments
- Ensure local development environment works with Docker