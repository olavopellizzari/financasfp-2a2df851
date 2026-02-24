-- COPIE E COLE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE

-- 1. Adicionar a coluna faltante na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Remover políticas que causam recursão infinita
DROP POLICY IF EXISTS "Users can read approved family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can read family members" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Allow read all profiles" ON public.profiles;

-- 3. Criar uma política de leitura segura e sem recursão
CREATE POLICY "profiles_read_all" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- 4. Corrigir políticas de atualização
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);