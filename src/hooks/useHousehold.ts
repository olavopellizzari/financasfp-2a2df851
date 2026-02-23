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

    const fetchHousehold = async () => {
      try {
        const { data, error } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', user.id)
          .maybeSingle(); // Usar maybeSingle para não dar erro se não existir

        if (data) {
          setHouseholdId(data.household_id);
        }
      } catch (err) {
        console.error('Error fetching household:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHousehold();
  }, [user]);

  return { householdId, loading };
}