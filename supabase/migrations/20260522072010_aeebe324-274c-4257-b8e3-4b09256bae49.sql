
-- Drop old auth-bound policies
DROP POLICY IF EXISTS "teams insert auth" ON public.teams;
DROP POLICY IF EXISTS "members insert owner" ON public.team_members;

-- Allow public insert on teams (frontend enforces email + session lock)
CREATE POLICY "teams insert public"
ON public.teams
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public insert on team_members
CREATE POLICY "members insert public"
ON public.team_members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Unique constraint: one team per email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS teams_captain_email_unique
ON public.teams (lower(captain_email));
