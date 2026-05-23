-- Replace permissive public insert policies with authenticated captain checks.

DROP POLICY IF EXISTS "teams insert public" ON public.teams;
DROP POLICY IF EXISTS "members insert public" ON public.team_members;

CREATE POLICY "teams insert authenticated captain"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND lower(captain_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  AND (auth.jwt() ->> 'email') ILIKE '%@itispaleocapa.it'
);

CREATE POLICY "members insert team captain"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = team_id
      AND t.created_by = auth.uid()
      AND lower(t.captain_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
