
-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view their household members" ON public.household_members;

-- Disable RLS on household_members to avoid recursion (as per original spec)
ALTER TABLE public.household_members DISABLE ROW LEVEL SECURITY;

-- Instead, restrict direct access via grants
-- Revoke all from anon/authenticated, then grant only SELECT to authenticated
REVOKE ALL ON public.household_members FROM anon;
REVOKE ALL ON public.household_members FROM authenticated;
GRANT SELECT ON public.household_members TO authenticated;
