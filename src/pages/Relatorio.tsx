import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, monthLabel } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

const Relatorio = () => {
  const [params] = useSearchParams();
  const month = params.get('month') || '';
  const accountId = params.get('accountId') || '';
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accountName, setAccountName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!accountId || !month) return;

    supabase.rpc('get_monthly_summary', { _account_id: accountId, _month: month })
      .then(({ data }) => setSummary(data));

    supabase.from('accounts').select('name, opening_balance').eq('id', accountId).single()
      .then(({ data }) => { if (data) setAccountName(data.name); });

    // Build unified statement
    const firstDay = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).toISOString().split('T')[0];

    Promise.all([
      supabase.from('receitas').select('paid_at, description, amount, categories(name)').eq('account_id', accountId).gte('paid_at', firstDay).lte('paid_at', lastDay),
      supabase.from('despesas_fixas').select('paid_at, description, amount, categories(name)').eq('account_id', accountId).eq('status', 'Pago').gte('paid_at', firstDay).lte('paid_at', lastDay),
      supabase.from('despesas_variaveis').select('paid_at, description, amount, categories(name)').eq('account_id', accountId).eq('type', 'Pago').gte('paid_at', firstDay).lte('paid_at', lastDay),
    ]).then(([receitas, fixas, variaveis]) => {
      const items: any[] = [];
      (receitas.data || []).forEach(r => items.push({ date: r.paid_at, desc: r.description, amount: Number(r.amount), type: 'receita', cat: (r.categories as any)?.name }));
      (fixas.data || []).forEach(r => items.push({ date: r.paid_at, desc: r.description, amount: -Number(r.amount), type: 'fixa', cat: (r.categories as any)?.name }));
      (variaveis.data || []).forEach(r => items.push({ date: r.paid_at, desc: r.description, amount: -Number(r.amount), type: 'variavel', cat: (r.categories as any)?.name }));
      items.sort((a, b) => a.date.localeCompare(b.date));
      setTransactions(items);
    });
  }, [accountId, month]);

  const copyReport = () => {
    if (!summary) return;
    let text = `RELATÓRIO ${monthLabel(month).toUpperCase()} - ${accountName}\n`;
    text += `${'='.repeat(40)}\n\n`;
    text += `Saldo Inicial: ${formatCurrency(Number(summary.balance_start))}\n`;
    text += `Receitas: ${formatCurrency(Number(summary.total_receitas))}\n`;
    text += `Despesas Fixas: ${formatCurrency(Number(summary.total_fixas))}\n`;
    text += `Despesas Variáveis: ${formatCurrency(Number(summary.total_variaveis))}\n`;
    text += `Total Despesas: ${formatCurrency(Number(summary.total_despesas))}\n`;
    text += `Saldo do Mês: ${formatCurrency(Number(summary.saldo_mes))}\n`;
    text += `Saldo Final: ${formatCurrency(Number(summary.balance_end))}\n\n`;
    text += `EXTRATO\n${'─'.repeat(40)}\n`;

    let running = Number(summary.balance_start);
    transactions.forEach(t => {
      running += t.amount;
      text += `${t.date} | ${t.desc.padEnd(20)} | ${formatCurrency(t.amount).padStart(12)} | ${formatCurrency(running).padStart(12)}\n`;
    });

    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Relatório copiado para a área de transferência.' });
  };

  if (!month || !accountId) {
    return <AppLayout><p className="text-muted-foreground">Selecione um mês e conta no dashboard.</p></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Relatório - {monthLabel(month)}</h2>
          <Button onClick={copyReport} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" /> Copiar
          </Button>
        </div>

        {summary && (
          <Card>
            <CardHeader><CardTitle>Resumo - {accountName}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Saldo Inicial:</span> <strong>{formatCurrency(Number(summary.balance_start))}</strong></div>
                <div><span className="text-muted-foreground">Saldo Final:</span> <strong>{formatCurrency(Number(summary.balance_end))}</strong></div>
                <div><span className="text-muted-foreground">Receitas:</span> <strong className="currency-positive">{formatCurrency(Number(summary.total_receitas))}</strong></div>
                <div><span className="text-muted-foreground">Despesas:</span> <strong className="currency-negative">{formatCurrency(Number(summary.total_despesas))}</strong></div>
                <div><span className="text-muted-foreground">Saldo do Mês:</span> <strong>{formatCurrency(Number(summary.saldo_mes))}</strong></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statement */}
        <Card>
          <CardHeader><CardTitle>Extrato</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Descrição</th>
                    <th className="py-2 pr-4">Categoria</th>
                    <th className="py-2 pr-4 text-right">Valor</th>
                    <th className="py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = summary ? Number(summary.balance_start) : 0;
                    return transactions.map((t, i) => {
                      running += t.amount;
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-4">{t.date}</td>
                          <td className="py-2 pr-4">{t.desc}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{t.cat || '-'}</td>
                          <td className={`py-2 pr-4 text-right font-medium ${t.amount >= 0 ? 'currency-positive' : 'currency-negative'}`}>{formatCurrency(t.amount)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(running)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Relatorio;
