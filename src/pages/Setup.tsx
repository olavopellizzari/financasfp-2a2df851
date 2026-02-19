import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Setup = () => {
  const [householdName, setHouseholdName] = useState('Família');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.rpc('bootstrap_household', {
      _household_name: householdName,
      _opening_balance: parseFloat(openingBalance),
      _opening_date: openingDate,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Household criado!', description: 'Tudo pronto para começar.' });
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-2xl bg-primary p-3">
              <CircleDollarSign className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading">Configuração Inicial</CardTitle>
          <CardDescription>Configure sua família e conta principal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Família</Label>
              <Input id="name" value={householdName} onChange={e => setHouseholdName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo Inicial (Conta Corrente)</Label>
              <Input id="balance" type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data de Abertura</Label>
              <Input id="date" type="date" value={openingDate} onChange={e => setOpeningDate(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Começar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
