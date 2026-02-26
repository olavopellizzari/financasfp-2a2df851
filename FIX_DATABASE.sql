-- SQL para corrigir as funções de convite no Supabase

-- Corrigir a função de enviar convite
CREATE OR REPLACE FUNCTION public.send_family_invite(invitee_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  SELECT family_id INTO v_household_id FROM public.profiles WHERE id = auth.uid();
  
  IF v_household_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Você precisa ter uma família para convidar alguém.');
  END IF;

  INSERT INTO public.household_invites (household_id, created_by, invited_email, status)
  VALUES (v_household_id, auth.uid(), lower(invitee_email), 'pending');

  RETURN json_build_object('success', true, 'message', 'Convite enviado com sucesso!');
END;
$$;

-- Corrigir a função de buscar convites pendentes
CREATE OR REPLACE FUNCTION public.get_pending_invites()
 RETURNS TABLE(invite_id uuid, invite_family_id uuid, inviter_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.household_id, p.name
  FROM public.household_invites i
  JOIN public.profiles p ON i.created_by = p.id
  WHERE lower(i.invited_email) = (SELECT lower(email) FROM public.profiles WHERE id = auth.uid())
    AND i.status = 'pending';
END;
$$;

-- Corrigir a função de aceitar convite
CREATE OR REPLACE FUNCTION public.accept_family_invite(invite_family_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET family_id = invite_family_id,
      is_admin = false
  WHERE id = auth.uid();

  UPDATE public.household_invites 
  SET status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  WHERE lower(invited_email) = (SELECT lower(email) FROM public.profiles WHERE id = auth.uid())
    AND household_id = invite_family_id
    AND status = 'pending';

  RETURN json_build_object('success', true, 'message', 'Você agora faz parte da família!');
END;
$$;