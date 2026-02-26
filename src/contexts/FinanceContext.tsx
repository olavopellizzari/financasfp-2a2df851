const fetchData = useCallback(async () => {
  if (!currentUser) {
    setLoading(false);
    return;
  }

  try {
    // Build categories query based on family membership
    let categoriesQuery = supabase.from('categories').select('*').order('name');
    
    if (currentUser.family_id) {
      // User has a family: show family categories + global categories
      categoriesQuery = categoriesQuery.or(`household_id.eq.${currentUser.family_id},household_id.is.null`);
    } else {
      // User has no family: show only global categories
      categoriesQuery = categoriesQuery.is('household_id', null);
    }

    const [catData, accData, cardData, txData, budData, invData, goalData, debtData] = await Promise.all([
      categoriesQuery,
      supabase.from('accounts').select('*').order('name'),
      supabase.from('cards').select('*').order('name'),
      supabase.from('transactions').select('*').order('purchase_date', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('debts').select('*')
    ]);
</parameter>
</function>
</tool_call>
<tool_call>
<function=dyad-write>
<parameter=path>
src/contexts/FinanceContext.tsx
</parameter>
<parameter=description>
Fix categories query to fetch family categories correctly
</parameter>
<parameter=file_text>
const fetchData = useCallback(async () => {
  if (!currentUser) {
    setLoading(false);
    return;
  }

  try {
    // Build categories query based on family membership
    let categoriesQuery = supabase.from('categories').select('*').order('name');
    
    if (currentUser.family_id) {
      // User has a family: show family categories + global categories
      categoriesQuery = categoriesQuery.or(`household_id.eq.${currentUser.family_id},household_id.is.null`);
    } else {
      // User has no family: show only global categories
      categoriesQuery = categoriesQuery.is('household_id', null);
    }

    const [catData, accData, cardData, txData, budData, invData, goalData, debtData] = await Promise.all([
      categoriesQuery,
      supabase.from('accounts').select('*').order('name'),
      supabase.from('cards').select('*').order('name'),
      supabase.from('transactions').select('*').order('purchase_date', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('debts').select('*')
    ]);
</parameter>
</function>
</tool_call>Agora vamos criar a função RPC `get_categories` no Supabase para retornar as categorias de forma mais eficiente:

<dyad-write path="supabase/functions/get_categories/index.ts" description="Edge function wrapper for get_categories RPC">
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // This is just a health check endpoint
    // The actual logic is in the SQL function
    return new Response(JSON.stringify({ 
      message: 'get_categories function is available',
      usage: 'Call the RPC function directly from your client: supabase.rpc(\'get_categories\')'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})