-- Allow authenticated users to read their own pro grants via RLS policy.
-- Needed for client-side feature gating (see lib/billing/subscriptionClient.ts).

grant usage on schema public to authenticated;
grant select on table public.pro_grants to authenticated;

