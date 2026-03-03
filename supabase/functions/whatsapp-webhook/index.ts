import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Verificação do Webhook (GET) - Necessário para configurar no Meta Developers
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === 'financas_bot_token') {
      console.log("[whatsapp-webhook] Webhook verificado com sucesso!")
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // Processamento de Mensagem (POST)
  try {
    const body = await req.json()
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    
    if (!message || message.type !== 'text') {
      return new Response('OK', { status: 200 })
    }

    const from = message.from // Número do WhatsApp
    const text = message.text.body.trim()

    console.log(`[whatsapp-webhook] Mensagem recebida de ${from}: ${text}`)

    // 1. Identificar o usuário pelo número
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, family_id')
      .eq('whatsapp_number', from)
      .single()

    if (profileError || !profile) {
      console.error("[whatsapp-webhook] Usuário não encontrado para o número:", from)
      return new Response('User not found', { status: 200 })
    }

    // 2. Parsear a mensagem (Ex: "50.00 Almoço")
    // Regex simples: busca um número seguido de texto
    const match = text.match(/^(\d+[.,]?\d*)\s+(.+)$/)
    
    if (!match) {
      console.log("[whatsapp-webhook] Formato inválido:", text)
      return new Response('Invalid format', { status: 200 })
    }

    const amount = parseFloat(match[1].replace(',', '.'))
    const description = match[2]
    const type = amount > 0 ? 'EXPENSE' : 'INCOME' // Lógica simples: positivo é gasto, negativo é ganho (ou vice-versa conforme preferir)
    
    // 3. Buscar conta padrão do usuário
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', profile.id)
      .eq('account_type', 'corrente')
      .limit(1)
      .single()

    if (!account) {
      console.error("[whatsapp-webhook] Conta corrente não encontrada para o usuário")
      return new Response('Account not found', { status: 200 })
    }

    // 4. Inserir transação
    const now = new Date()
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        account_id: account.id,
        amount: Math.abs(amount),
        description: `[WhatsApp] ${description}`,
        type: amount > 0 ? 'EXPENSE' : 'INCOME',
        status: 'confirmed',
        is_paid: true,
        purchase_date: now.toISOString().split('T')[0],
        effective_date: now.toISOString().split('T')[0],
        effective_month: now.toISOString().substring(0, 7)
      })

    if (insertError) throw insertError

    console.log("[whatsapp-webhook] Lançamento salvo com sucesso!")
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error("[whatsapp-webhook] Erro ao processar:", error)
    return new Response('Error', { status: 500 })
  }
})