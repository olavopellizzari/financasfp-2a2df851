-- [Mantenha o código anterior e adicione estas funções no final]

-- Função para criar compra com parcelas automaticamente
CREATE OR REPLACE FUNCTION public.create_card_purchase_with_installments(
  _household_id uuid, 
  _account_id uuid, 
  _purchase_at date, 
  _description text, 
  _category_id uuid, 
  _card_name text, 
  _amount_total numeric, 
  _installments_count integer, 
  _first_statement_month text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  v_purchase_id uuid;
  v_base_amount numeric;
  v_remainder numeric;
  v_current_month date;
  v_year int;
  v_month int;
begin
  if not public.is_household_member(_household_id) then
    raise exception 'Acesso negado';
  end if;

  if _installments_count < 1 or _installments_count > 36 then
    raise exception 'Número de parcelas deve ser entre 1 e 36';
  end if;

  -- insere a compra
  insert into public.card_purchases (
    household_id, account_id, purchase_at, description, category_id, card_name, amount_total, installments_count, first_statement_month
  ) values (
    _household_id, _account_id, _purchase_at, _description, _category_id, _card_name, _amount_total, _installments_count, _first_statement_month
  )
  returning id into v_purchase_id;

  -- calcula valor base por parcela
  v_base_amount := floor(_amount_total / _installments_count * 100) / 100;
  v_remainder := _amount_total - (v_base_amount * _installments_count);

  -- mês inicial
  v_year := split_part(_first_statement_month, '-', 1)::int;
  v_month := split_part(_first_statement_month, '-', 2)::int;
  v_current_month := make_date(v_year, v_month, 1);

  -- gera parcelas
  for i in 1 .. _installments_count loop
    insert into public.installments (
      household_id, purchase_id, card_name, statement_month, installment_number, installments_count, amount
    ) values (
      _household_id, v_purchase_id, _card_name, to_char(v_current_month, 'YYYY-MM'), i, _installments_count,
      case when i = _installments_count then v_base_amount + v_remainder else v_base_amount end
    );
    v_current_month := v_current_month + interval '1 month';
  end loop;

  return json_build_object('ok', true, 'purchase_id', v_purchase_id);
end;
$$;

-- Função para gerar despesas variáveis a partir das parcelas da fatura (Pagar Fatura)
CREATE OR REPLACE FUNCTION public.generate_variable_expenses_from_installments(
  _household_id uuid, 
  _account_id uuid, 
  _statement_month text, 
  _card_name text, 
  _pay_date date
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  v_created int := 0;
  v_row record;
  v_desc text;
begin
  if not public.is_household_member(_household_id) then
    raise exception 'Acesso negado';
  end if;

  for v_row in
    select i.id, i.amount, i.installment_number, i.installments_count, p.description, p.category_id
    from public.installments i
    join public.card_purchases p on p.id = i.purchase_id
    where i.household_id = _household_id and i.statement_month = _statement_month and i.card_name = _card_name
  loop
    v_desc := 'Fatura ' || _card_name || ' - ' || coalesce(v_row.description, '') || ' (' || v_row.installment_number || '/' || v_row.installments_count || ')';

    insert into public.despesas_variaveis (
      household_id, account_id, paid_at, type, description, category_id, payment_method, amount, installment_id
    ) values (
      _household_id, _account_id, _pay_date, 'Pago', v_desc, v_row.category_id, 'Cartão', v_row.amount, v_row.id
    ) on conflict do nothing;
    
    v_created := v_created + 1;
  end loop;

  return json_build_object('ok', true, 'created', v_created);
end;
$$;