-- ==========================================
-- 1. LIMPEZA TOTAL (DROP)
-- ==========================================

-- Remover tabelas (ordem inversa das dependências)
DROP TABLE IF EXISTS public.household_invites CASCADE;
DROP TABLE IF EXISTS public.installments CASCADE;
DROP TABLE IF EXISTS public.card_purchases CASCADE;
DROP TABLE IF EXISTS public.despesas_variaveis CASCADE;
DROP TABLE IF EXISTS public.despesas_fixas CASCADE;
DROP TABLE IF EXISTS public.fixed_expense_templates CASCADE;
DROP TABLE IF EXISTS public.receitas CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.household_members CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;

-- Remover tipos customizados
DROP TYPE IF EXISTS public.category_kind CASCADE;
DROP TYPE IF EXISTS public.expense_status CASCADE;
DROP TYPE IF EXISTS public.invite_status CASCADE;
DROP TYPE IF EXISTS public.member_role CASCADE;
DROP TYPE IF EXISTS public.variable_expense_type CASCADE;

-- Remover funções
DROP FUNCTION IF EXISTS public.current_user_email CASCADE;
DROP FUNCTION IF EXISTS public.is_household_member CASCADE;
DROP FUNCTION IF EXISTS public.is_household_admin CASCADE;
DROP FUNCTION IF EXISTS public.bootstrap_household CASCADE;
DROP FUNCTION IF EXISTS public.get_account_balance CASCADE;
DROP FUNCTION IF EXISTS public.get_household_balance CASCADE;
DROP FUNCTION IF EXISTS public.sync_fixed_expenses CASCADE;
DROP FUNCTION IF EXISTS public.get_monthly_summary CASCADE;
DROP FUNCTION IF EXISTS public.accept_household_invite CASCADE;

-- ==========================================
-- 2. CRIAÇÃO DOS ENUMS
-- ==========================================
CREATE TYPE public.category_kind AS ENUM ('receita', 'despesa', 'cartao');
CREATE TYPE public.expense_status AS ENUM ('Pago', 'Pendente');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE public.member_role AS ENUM ('admin', 'member');
CREATE TYPE public.variable_expense_type AS ENUM ('Pago', 'Planejado');

-- ==========================================
-- 3. CRIAÇÃO DAS TABELAS
-- ==========================================
CREATE TABLE public.households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.household_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role DEFAULT 'member' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(household_id, user_id)
);

CREATE TABLE public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  opening_balance NUMERIC DEFAULT 0 NOT NULL,
  opening_date DATE DEFAULT CURRENT_DATE NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.category_kind NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.receitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  paid_at DATE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.fixed_expense_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  start_month TEXT NOT NULL, -- YYYY-MM
  end_month TEXT, -- YYYY-MM
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.despesas_fixas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  due_at DATE NOT NULL,
  due_month TEXT NOT NULL, -- YYYY-MM
  paid_at DATE,
  status public.expense_status DEFAULT 'Pendente' NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  template_id UUID REFERENCES public.fixed_expense_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(template_id, due_month)
);

CREATE TABLE public.despesas_variaveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  paid_at DATE,
  planned_month TEXT, -- YYYY-MM
  type public.variable_expense_type NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  payment_method TEXT,
  amount NUMERIC NOT NULL,
  installment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.card_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  purchase_at DATE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  amount_total NUMERIC NOT NULL,
  installments_count INTEGER NOT NULL,
  first_statement_month TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.card_purchases(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  statement_month TEXT NOT NULL, -- YYYY-MM
  installment_number INTEGER NOT NULL,
  installments_count INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.household_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_role public.member_role DEFAULT 'member' NOT NULL,
  token TEXT DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL,
  status public.invite_status DEFAULT 'pending' NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days') NOT NULL
);

-- ==========================================
-- 4. FUNÇÕES AUXILIARES
-- ==========================================
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT lower((auth.jwt() ->> 'email')::text);
$$;

CREATE OR REPLACE FUNCTION public.is_household_member(_household_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_household_admin(_household_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ==========================================
-- 5. POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "households_select" ON public.households FOR SELECT TO authenticated USING (is_household_member(id));

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON public.household_members FOR SELECT TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all" ON public.accounts FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_all" ON public.categories FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receitas_all" ON public.receitas FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixas_all" ON public.despesas_fixas FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.despesas_variaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variaveis_all" ON public.despesas_variaveis FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.fixed_expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_all" ON public.fixed_expense_templates FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_all" ON public.card_purchases FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installments_all" ON public.installments FOR ALL TO authenticated USING (is_household_member(household_id));

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites_select" ON public.household_invites FOR SELECT TO authenticated USING (is_household_admin(household_id) OR lower(invited_email) = current_user_email());
CREATE POLICY "invites_insert" ON public.household_invites FOR INSERT TO authenticated WITH CHECK (is_household_admin(household_id));

-- ==========================================
-- 6. FUNÇÕES DE NEGÓCIO (RPC)
-- ==========================================

CREATE OR REPLACE FUNCTION public.bootstrap_household(_household_name TEXT, _opening_balance NUMERIC, _opening_date DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_household_id UUID;
  v_account_id UUID;
BEGIN
  INSERT INTO public.households (name) VALUES (_household_name) RETURNING id INTO v_household_id;
  INSERT INTO public.household_members (household_id, user_id, role) VALUES (v_household_id, auth.uid(), 'admin');
  INSERT INTO public.accounts (household_id, name, account_type, opening_balance, opening_date)
  VALUES (v_household_id, 'Conta Corrente', 'corrente', _opening_balance, _opening_date) RETURNING id INTO v_account_id;

  INSERT INTO public.categories (household_id, kind, name, is_default) VALUES
    (v_household_id, 'despesa', 'Moradia', true), (v_household_id, 'despesa', 'Alimentação', true),
    (v_household_id, 'receita', 'Salário', true), (v_household_id, 'cartao', 'Mercado', true);

  RETURN json_build_object('ok', true, 'household_id', v_household_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_balance(_account_id UUID, _until_date DATE)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE((SELECT opening_balance FROM public.accounts WHERE id = _account_id), 0) +
         COALESCE((SELECT SUM(amount) FROM public.receitas WHERE account_id = _account_id AND paid_at <= _until_date), 0) -
         COALESCE((SELECT SUM(amount) FROM public.despesas_fixas WHERE account_id = _account_id AND status = 'Pago' AND paid_at <= _until_date), 0) -
         COALESCE((SELECT SUM(amount) FROM public.despesas_variaveis WHERE account_id = _account_id AND type = 'Pago' AND paid_at <= _until_date), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_household_balance(_household_id UUID, _until_date DATE)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(public.get_account_balance(id, _until_date)), 0)
  FROM public.accounts WHERE household_id = _household_id AND active = true;
$$;

CREATE OR REPLACE FUNCTION public.sync_fixed_expenses(_household_id UUID, _month TEXT, _default_account_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
  v_template RECORD;
  v_due_date DATE;
BEGIN
  FOR v_template IN 
    SELECT * FROM public.fixed_expense_templates 
    WHERE household_id = _household_id AND active = true AND start_month <= _month AND (end_month IS NULL OR end_month >= _month)
  LOOP
    v_due_date := (left(_month, 4) || '-' || right(_month, 2) || '-' || lpad(v_template.due_day::text, 2, '0'))::DATE;
    INSERT INTO public.despesas_fixas (household_id, account_id, due_at, due_month, description, category_id, amount, template_id)
    VALUES (_household_id, _default_account_id, v_due_date, _month, v_template.description, v_template.category_id, v_template.amount, v_template.id)
    ON CONFLICT (template_id, due_month) DO NOTHING;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_summary(_account_id UUID, _month TEXT)
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_first_day DATE := (_month || '-01')::DATE;
  v_last_day DATE := (v_first_day + interval '1 month' - interval '1 day')::DATE;
  v_rec NUMERIC; v_fix NUMERIC; v_var NUMERIC;
BEGIN
  v_rec := COALESCE((SELECT SUM(amount) FROM public.receitas WHERE account_id = _account_id AND paid_at BETWEEN v_first_day AND v_last_day), 0);
  v_fix := COALESCE((SELECT SUM(amount) FROM public.despesas_fixas WHERE account_id = _account_id AND status = 'Pago' AND paid_at BETWEEN v_first_day AND v_last_day), 0);
  v_var := COALESCE((SELECT SUM(amount) FROM public.despesas_variaveis WHERE account_id = _account_id AND type = 'Pago' AND paid_at BETWEEN v_first_day AND v_last_day), 0);
  
  RETURN json_build_object(
    'balance_start', public.get_account_balance(_account_id, (v_first_day - 1)),
    'balance_end', public.get_account_balance(_account_id, v_last_day),
    'total_receitas', v_rec,
    'total_despesas', v_fix + v_var,
    'total_fixas', v_fix,
    'total_variaveis', v_var,
    'saldo_mes', v_rec - (v_fix + v_var)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_household_invite(_token TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM public.household_invites WHERE token = _token AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Convite inválido ou expirado'); END IF;
  
  INSERT INTO public.household_members (household_id, user_id, role) VALUES (v_invite.household_id, auth.uid(), v_invite.invited_role)
  ON CONFLICT DO NOTHING;
  
  UPDATE public.household_invites SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now() WHERE id = v_invite.id;
  RETURN json_build_object('ok', true);
END;
$$;