import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useHousehold() {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHousehold = async () => {
    if (!user) {
      setHouseholdId(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setHouseholdId(data.household_id);
      } else {
        setHouseholdId(null);
      }
    } catch (err) {
      console.error('Error fetching household:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousehold();
  }, [user]);

  return { householdId, loading, refresh: fetchHousehold };
}