CREATE OR REPLACE FUNCTION public.get_categories()
RETURNS SETOF categories
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    c.id,
    c.name,
    c.icon,
    c.color,
    c.kind,
    c.household_id,
    c.is_default,
    c.created_at
  FROM categories c
  WHERE c.household_id IS NULL 
     OR c.household_id = auth.uid()::uuid
  ORDER BY 
    CASE WHEN c.household_id IS NULL THEN 0 ELSE 1 END,
    c.name;
$$;