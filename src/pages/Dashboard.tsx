import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/hooks/useHousehold';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency, currentMonth, monthLabel, addMonths } from '@/lib/format';
import { ChevronLeft, ChevronRight, FileText, Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { householdId, loading: hhLoading } = useHousehold();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [householdBalance, setHouseholdBalance] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!hhLoading && !householdId) {
      navigate('/setup');
    }
  }, [hhLoading, householdId, navigate]);

  useEffect(() => {
    if (!householdId) return;
    supabase.from('accounts').select('*').eq('household_id', householdId).eq('active', true).order('name')
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    setLoadingData(true);

    const lastDay = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0);
    const untilDate = lastDay.toISOString().split('T')[0];

    if (accounts.length > 0) {
      supabase.rpc('sync_fixed_expenses', {
        _household_id: householdId,
        _month: month,
        _default_account_id: accounts[0].id,
      }).then(() => {});
    }

    supabase.rpc('get_household_balance', { _household_id: householdId, _until_date: untilDate })
      .then(({ data }) => { if (data !== null) setHouseholdBalance(Number(data)); });

    if (selectedAccount !== 'all') {
      supabase.rpc('get_account_balance', { _account_id: selectedAccount, _until_date: untilDate })
        .then(({ data }) => { if (data !== null) setBalance(Number(data)); });
      
      supabase.rpc('get_monthly_summary', { _account_id: selectedAccount, _month: month })
        .then(({ data }) => { 
          setSummary(data); 
          setLoadingData(false); 
        });
    } else {
      setSummary(null); // Não exibe resumo parcial para "Todas as contas"
      setLoadingData(false);
    }
  }, [householdId, selectedAccount, month, accounts.length]);

  if (hhLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></AppLayout>;
  }

  const displayBalance = selectedAccount === 'all' ? householdBalance : balance;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-heading font-bold">Dashboard</h2>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-6">
            <p className="text-sm opacity-80">{selectedAccount === 'all' ? 'Saldo Conjunto' : 'Saldo da Conta'}</p>
            <p className="text-3xl font-bold font-heading mt-1">{formatCurrency(displayBalance)}</p>
            {selectedAccount !== 'all' && (
              <p className="text-xs opacity-60 mt-2">Saldo conjunto: {formatCurrency(householdBalance)}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-heading font-semibold text-lg">{monthLabel(month)}</span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {selectedAccount === 'all' ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-8 flex flex-col items-center text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Selecione uma conta específica para ver o resumo de receitas e despesas do mês.</p>
            </CardContent>
          </Card>
        ) : summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Receitas</span>
                </div>
                <p className="text-lg font-bold currency-positive">{formatCurrency(Number(summary.total_receitas))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Despesas</span>
                </div>
                <p className="text-lg font-bold currency-negative">{formatCurrency(Number(summary.total_despesas))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Saldo Início</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(Number(summary.balance_start))}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Saldo Final</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(Number(summary.balance_end))}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {selectedAccount !== 'all' && (
            <Link to={`/relatorio?month=${month}&accountId=${selectedAccount}`}>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Relatório do Mês
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;