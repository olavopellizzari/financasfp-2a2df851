import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useHousehold() {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHouseholdId(null);
      setLoading(false);
      return;
    }
    supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setHouseholdId(data.household_id);
        }
        setLoading(false);
      });
  }, [user]);

  return { householdId, loading };
}
