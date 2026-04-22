-- Enable Row-Level Security on all public tables.
--
-- Context: This app uses Prisma via a direct PostgreSQL connection (postgres
-- superuser / service role), which bypasses RLS entirely. Enabling RLS here
-- has zero effect on the application itself.
--
-- What this fixes: Supabase exposes a REST API (PostgREST) that is reachable
-- by anyone who knows the project URL + anon key. Without RLS, that API gives
-- full read/write/delete access to every table. Enabling RLS with no
-- permissive policies for the anon/authenticated roles locks that surface down
-- to deny-by-default.

ALTER TABLE "User"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrawlLog"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SwipeAction"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserTagPreference"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSourcePreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Friendship"           ENABLE ROW LEVEL SECURITY;
