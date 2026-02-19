import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleDollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AceitarConvite = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const accept = async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('accept_household_invite', { _token: token });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    const result = data as any;
    if (result?.ok) {
      toast({ title: 'Convite aceito!', description: 'Você agora faz parte da família.' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Erro', description: result?.error || 'Erro desconhecido', variant: 'destructive' });
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-2xl bg-primary p-3"><CircleDollarSign className="h-8 w-8 text-primary-foreground" /></div>
            </div>
            <CardTitle>Aceitar Convite</CardTitle>
            <CardDescription>Você precisa estar logado para aceitar o convite.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/login?redirect=/aceitar?token=${token}`)} className="w-full">Ir para Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-2xl bg-primary p-3"><CircleDollarSign className="h-8 w-8 text-primary-foreground" /></div>
          </div>
          <CardTitle>Aceitar Convite</CardTitle>
          <CardDescription>Clique abaixo para entrar na família.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={accept} disabled={loading || !token} className="w-full">
            {loading ? 'Processando...' : 'Aceitar Convite'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AceitarConvite;
