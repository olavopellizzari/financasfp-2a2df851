
-- ============================================
-- FINANÇAS FP - COMPLETE DATABASE SCHEMA
-- ============================================

-- 1) ENUM TYPES
CREATE TYPE public.member_role AS ENUM ('admin', 'member');
CREATE TYPE public.category_kind AS ENUM ('receita', 'despesa', 'cartao');
CREATE TYPE public.expense_status AS ENUM ('Pago', 'Pendente');
CREATE TYPE public.variable_expense_type AS ENUM ('Pago', 'Planejado');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- 2) TABLES

-- households
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- household_members (RLS disabled to avoid recursion)
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'corrente',
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, name)
);

-- categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind category_kind NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, kind, name)
);

-- receitas
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  paid_at DATE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fixed_expense_templates
CREATE TABLE public.fixed_expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  start_month TEXT NOT NULL, -- YYYY-MM
  end_month TEXT, -- YYYY-MM, nullable = indefinido
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- despesas_fixas
CREATE TABLE public.despesas_fixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  due_at DATE NOT NULL,
  due_month TEXT NOT NULL, -- YYYY-MM
  paid_at DATE,
  status expense_status NOT NULL DEFAULT 'Pendente',
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  template_id UUID REFERENCES public.fixed_expense_templates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- despesas_variaveis
CREATE TABLE public.despesas_variaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  paid_at DATE,
  planned_month TEXT, -- YYYY-MM
  type variable_expense_type NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  payment_method TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for despesas_variaveis coherence
CREATE OR REPLACE FUNCTION public.validate_despesa_variavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'Pago' AND NEW.paid_at IS NULL THEN
    RAISE EXCEPTION 'Despesa do tipo Pago exige paid_at';
  END IF;
  IF NEW.type = 'Planejado' AND NEW.planned_month IS NULL THEN
    RAISE EXCEPTION 'Despesa do tipo Planejado exige planned_month';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_despesa_variavel
BEFORE INSERT OR UPDATE ON public.despesas_variaveis
FOR EACH ROW EXECUTE FUNCTION public.validate_despesa_variavel();

-- household_invites
CREATE TABLE public.household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_role member_role NOT NULL DEFAULT 'member',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status invite_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- card_purchases
CREATE TABLE public.card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id),
  purchase_at DATE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  card_name TEXT NOT NULL CHECK (card_name IN ('C6 Família', 'C6 Marina', 'NuBank Olavo')),
  amount_total NUMERIC NOT NULL CHECK (amount_total > 0),
  installments_count INT NOT NULL CHECK (installments_count BETWEEN 1 AND 36),
  first_statement_month TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- installments
CREATE TABLE public.installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.card_purchases(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  statement_month TEXT NOT NULL, -- YYYY-MM
  installment_number INT NOT NULL,
  installments_count INT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(purchase_id, installment_number)
);

-- 3) INDEXES
CREATE INDEX idx_accounts_household ON public.accounts(household_id);
CREATE INDEX idx_categories_household ON public.categories(household_id, kind);
CREATE INDEX idx_receitas_household_date ON public.receitas(household_id, paid_at);
CREATE INDEX idx_receitas_account ON public.receitas(account_id);
CREATE INDEX idx_despesas_fixas_household_month ON public.despesas_fixas(household_id, due_month);
CREATE INDEX idx_despesas_fixas_template ON public.despesas_fixas(template_id, due_month);
CREATE INDEX idx_despesas_variaveis_household ON public.despesas_variaveis(household_id);
CREATE INDEX idx_despesas_variaveis_paid ON public.despesas_variaveis(household_id, paid_at);
CREATE INDEX idx_despesas_variaveis_planned ON public.despesas_variaveis(household_id, planned_month);
CREATE INDEX idx_card_purchases_household ON public.card_purchases(household_id, card_name);
CREATE INDEX idx_installments_month ON public.installments(household_id, statement_month, card_name);
CREATE INDEX idx_invites_token ON public.household_invites(token);
CREATE INDEX idx_members_user ON public.household_members(user_id);

-- 4) UTILITY FUNCTIONS

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(auth.jwt()->>'email');
$$;

CREATE OR REPLACE FUNCTION public.is_household_member(_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_household_admin(_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_household_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 5) RLS POLICIES

-- household_members: disable RLS, use grants
-- We keep RLS disabled to avoid infinite recursion
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
-- But we use a simple policy that doesn't reference itself
CREATE POLICY "Members can view their household members"
  ON public.household_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR household_id IN (SELECT hm.household_id FROM public.household_members hm WHERE hm.user_id = auth.uid()));

-- households
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their household"
  ON public.households FOR SELECT TO authenticated
  USING (public.is_household_member(id));
CREATE POLICY "Members can update their household"
  ON public.households FOR UPDATE TO authenticated
  USING (public.is_household_member(id));

-- accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view accounts"
  ON public.accounts FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert accounts"
  ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update accounts"
  ON public.accounts FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete accounts"
  ON public.accounts FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view categories"
  ON public.categories FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete categories"
  ON public.categories FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- receitas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view receitas"
  ON public.receitas FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert receitas"
  ON public.receitas FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update receitas"
  ON public.receitas FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete receitas"
  ON public.receitas FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- despesas_fixas
ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view despesas_fixas"
  ON public.despesas_fixas FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert despesas_fixas"
  ON public.despesas_fixas FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update despesas_fixas"
  ON public.despesas_fixas FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete despesas_fixas"
  ON public.despesas_fixas FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- fixed_expense_templates
ALTER TABLE public.fixed_expense_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view templates"
  ON public.fixed_expense_templates FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert templates"
  ON public.fixed_expense_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update templates"
  ON public.fixed_expense_templates FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete templates"
  ON public.fixed_expense_templates FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- despesas_variaveis
ALTER TABLE public.despesas_variaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view despesas_variaveis"
  ON public.despesas_variaveis FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert despesas_variaveis"
  ON public.despesas_variaveis FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update despesas_variaveis"
  ON public.despesas_variaveis FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete despesas_variaveis"
  ON public.despesas_variaveis FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- household_invites
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view invites"
  ON public.household_invites FOR SELECT TO authenticated
  USING (public.is_household_member(household_id) OR lower(invited_email) = public.current_user_email());
CREATE POLICY "Admins can insert invites"
  ON public.household_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_household_admin(household_id));
CREATE POLICY "Admins can update invites"
  ON public.household_invites FOR UPDATE TO authenticated
  USING (public.is_household_admin(household_id));

-- card_purchases
ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view card_purchases"
  ON public.card_purchases FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert card_purchases"
  ON public.card_purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can update card_purchases"
  ON public.card_purchases FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can delete card_purchases"
  ON public.card_purchases FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- installments
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view installments"
  ON public.installments FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));
CREATE POLICY "Members can insert installments"
  ON public.installments FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));
CREATE POLICY "Members can delete installments"
  ON public.installments FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- 6) RPCs

-- bootstrap_household
CREATE OR REPLACE FUNCTION public.bootstrap_household(
  _household_name TEXT,
  _opening_balance NUMERIC,
  _opening_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _hh_id UUID;
  _existing UUID;
BEGIN
  -- Check if user already has a household
  SELECT household_id INTO _existing FROM public.household_members WHERE user_id = _user_id LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN json_build_object('ok', true, 'already', true, 'household_id', _existing);
  END IF;

  -- Create household
  INSERT INTO public.households (name) VALUES (_household_name) RETURNING id INTO _hh_id;
  
  -- Add user as admin
  INSERT INTO public.household_members (household_id, user_id, role) VALUES (_hh_id, _user_id, 'admin');
  
  -- Create default account
  INSERT INTO public.accounts (household_id, name, account_type, opening_balance, opening_date)
  VALUES (_hh_id, 'Conta Corrente', 'corrente', _opening_balance, _opening_date);
  
  -- Seed default categories
  -- despesa
  INSERT INTO public.categories (household_id, name, kind, is_default) VALUES
    (_hh_id, 'Moradia', 'despesa', true),
    (_hh_id, 'Alimentação', 'despesa', true),
    (_hh_id, 'Transporte', 'despesa', true),
    (_hh_id, 'Saúde', 'despesa', true),
    (_hh_id, 'Lazer', 'despesa', true),
    (_hh_id, 'Educação', 'despesa', true),
    (_hh_id, 'Pets', 'despesa', true),
    (_hh_id, 'Impostos', 'despesa', true),
    (_hh_id, 'Assinaturas', 'despesa', true),
    (_hh_id, 'Outros', 'despesa', true);
  -- receita
  INSERT INTO public.categories (household_id, name, kind, is_default) VALUES
    (_hh_id, 'Salário', 'receita', true),
    (_hh_id, 'Honorários', 'receita', true),
    (_hh_id, 'Reembolso', 'receita', true),
    (_hh_id, 'Outros', 'receita', true);
  -- cartao
  INSERT INTO public.categories (household_id, name, kind, is_default) VALUES
    (_hh_id, 'Mercado', 'cartao', true),
    (_hh_id, 'Restaurantes', 'cartao', true),
    (_hh_id, 'Combustível', 'cartao', true),
    (_hh_id, 'Farmácia', 'cartao', true),
    (_hh_id, 'Assinaturas', 'cartao', true),
    (_hh_id, 'Outros', 'cartao', true);

  RETURN json_build_object('ok', true, 'already', false, 'household_id', _hh_id);
END;
$$;

-- accept_household_invite
CREATE OR REPLACE FUNCTION public.accept_household_invite(_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite RECORD;
  _user_id UUID := auth.uid();
  _user_email TEXT;
BEGIN
  _user_email := lower(auth.jwt()->>'email');
  
  SELECT * INTO _invite FROM public.household_invites WHERE token = _token::UUID;
  
  IF _invite IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Convite não encontrado');
  END IF;
  
  IF _invite.status != 'pending' THEN
    RETURN json_build_object('ok', false, 'error', 'Convite já utilizado ou revogado');
  END IF;
  
  IF _invite.expires_at < now() THEN
    UPDATE public.household_invites SET status = 'expired' WHERE id = _invite.id;
    RETURN json_build_object('ok', false, 'error', 'Convite expirado');
  END IF;
  
  IF lower(_invite.invited_email) != _user_email THEN
    RETURN json_build_object('ok', false, 'error', 'E-mail do convite não corresponde ao usuário logado');
  END IF;
  
  -- Insert membership
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (_invite.household_id, _user_id, _invite.invited_role)
  ON CONFLICT (household_id, user_id) DO NOTHING;
  
  -- Mark invite as accepted
  UPDATE public.household_invites
  SET status = 'accepted', accepted_by = _user_id, accepted_at = now()
  WHERE id = _invite.id;
  
  RETURN json_build_object('ok', true, 'household_id', _invite.household_id);
END;
$$;

-- get_account_balance
CREATE OR REPLACE FUNCTION public.get_account_balance(_account_id UUID, _until_date DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(a.opening_balance, 0)
    + COALESCE((SELECT SUM(r.amount) FROM public.receitas r WHERE r.account_id = _account_id AND r.paid_at <= _until_date), 0)
    - COALESCE((SELECT SUM(df.amount) FROM public.despesas_fixas df WHERE df.account_id = _account_id AND df.status = 'Pago' AND df.paid_at <= _until_date), 0)
    - COALESCE((SELECT SUM(dv.amount) FROM public.despesas_variaveis dv WHERE dv.account_id = _account_id AND dv.type = 'Pago' AND dv.paid_at <= _until_date), 0)
  FROM public.accounts a WHERE a.id = _account_id;
$$;

-- get_household_balance
CREATE OR REPLACE FUNCTION public.get_household_balance(_household_id UUID, _until_date DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(public.get_account_balance(a.id, _until_date)), 0)
  FROM public.accounts a
  WHERE a.household_id = _household_id AND a.active = true;
$$;

-- get_monthly_summary
CREATE OR REPLACE FUNCTION public.get_monthly_summary(_account_id UUID, _month TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _first_day DATE;
  _last_day DATE;
  _prev_day DATE;
  _balance_start NUMERIC;
  _balance_end NUMERIC;
  _total_receitas NUMERIC;
  _total_fixas NUMERIC;
  _total_variaveis NUMERIC;
BEGIN
  _first_day := (_month || '-01')::DATE;
  _last_day := (_first_day + interval '1 month' - interval '1 day')::DATE;
  _prev_day := (_first_day - interval '1 day')::DATE;
  
  _balance_start := public.get_account_balance(_account_id, _prev_day);
  _balance_end := public.get_account_balance(_account_id, _last_day);
  
  SELECT COALESCE(SUM(amount), 0) INTO _total_receitas
  FROM public.receitas WHERE account_id = _account_id AND paid_at BETWEEN _first_day AND _last_day;
  
  SELECT COALESCE(SUM(amount), 0) INTO _total_fixas
  FROM public.despesas_fixas WHERE account_id = _account_id AND status = 'Pago' AND paid_at BETWEEN _first_day AND _last_day;
  
  SELECT COALESCE(SUM(amount), 0) INTO _total_variaveis
  FROM public.despesas_variaveis WHERE account_id = _account_id AND type = 'Pago' AND paid_at BETWEEN _first_day AND _last_day;
  
  RETURN json_build_object(
    'balance_start', _balance_start,
    'balance_end', _balance_end,
    'total_receitas', _total_receitas,
    'total_fixas', _total_fixas,
    'total_variaveis', _total_variaveis,
    'total_despesas', _total_fixas + _total_variaveis,
    'saldo_mes', _total_receitas - _total_fixas - _total_variaveis
  );
END;
$$;

-- sync_fixed_expenses for a given month
CREATE OR REPLACE FUNCTION public.sync_fixed_expenses(_household_id UUID, _month TEXT, _default_account_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tmpl RECORD;
  _due_date DATE;
  _count INT := 0;
  _days_in_month INT;
BEGIN
  _days_in_month := EXTRACT(DAY FROM ((_month || '-01')::DATE + interval '1 month' - interval '1 day'));
  
  FOR _tmpl IN
    SELECT * FROM public.fixed_expense_templates
    WHERE household_id = _household_id AND active = true
    AND start_month <= _month
    AND (end_month IS NULL OR end_month >= _month)
  LOOP
    -- Check if instance already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.despesas_fixas
      WHERE template_id = _tmpl.id AND due_month = _month
    ) THEN
      _due_date := (_month || '-' || LPAD(LEAST(_tmpl.due_day, _days_in_month)::TEXT, 2, '0'))::DATE;
      
      INSERT INTO public.despesas_fixas (household_id, account_id, due_at, due_month, status, description, category_id, amount, template_id)
      VALUES (_household_id, _default_account_id, _due_date, _month, 'Pendente', _tmpl.description, _tmpl.category_id, _tmpl.amount, _tmpl.id);
      
      _count := _count + 1;
    END IF;
  END LOOP;
  
  RETURN _count;
END;
$$;

-- generate_installments trigger
CREATE OR REPLACE FUNCTION public.generate_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_amount NUMERIC;
  _remainder NUMERIC;
  _month DATE;
  _i INT;
BEGIN
  _base_amount := TRUNC(NEW.amount_total / NEW.installments_count, 2);
  _remainder := NEW.amount_total - (_base_amount * NEW.installments_count);
  _month := (NEW.first_statement_month || '-01')::DATE;
  
  FOR _i IN 1..NEW.installments_count LOOP
    INSERT INTO public.installments (household_id, purchase_id, card_name, statement_month, installment_number, installments_count, amount)
    VALUES (
      NEW.household_id,
      NEW.id,
      NEW.card_name,
      TO_CHAR(_month, 'YYYY-MM'),
      _i,
      NEW.installments_count,
      CASE WHEN _i = NEW.installments_count THEN _base_amount + _remainder ELSE _base_amount END
    );
    _month := _month + interval '1 month';
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_installments
AFTER INSERT ON public.card_purchases
FOR EACH ROW EXECUTE FUNCTION public.generate_installments();
