"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { getCashflowPrediction } from '@/lib/gemini';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Sparkles, TrendingUp, Loader2, Info, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/db';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PredictiveCashflow() {
  const { allTransactions, allAccounts, getAccountBalance } = useFinance();
  const [prediction, setPrediction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      if (allTransactions.length < 5) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const history = allTransactions.slice(0, 50).map(t => ({
          desc: t.description,
          amount: t.amount,
          type: t.type,
          date: t.purchaseDate
        }));
        const result = await getCashflowPrediction(history);
        setPrediction(result);
      } catch (err) {
        console.error("Erro na previsão:", err);
        setError("Não foi possível gerar a previsão no momento.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrediction();
  }, [allTransactions.length]);

  const chartData = useMemo(() => {
    if (!prediction) return [];
    
    const currentBalance = allAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
    const data = [{ month: 'Hoje', balance: currentBalance, isFuture: false }];
    
    if (prediction.predictions && Array.isArray(prediction.predictions)) {
      prediction.predictions.forEach((p: any) => {
        try {
          data.push({
            month: format(parseISO(p.month + '-01'), 'MMM/yy', { locale: ptBR }),
            balance: p.projectedBalance,
            isFuture: true
          });
        } catch (e) {}
      });
    }
    
    return data;
  }, [prediction, allAccounts, getAccountBalance]);

  if (allTransactions.length < 5) {
    return (
      <Card className="border-none shadow-lg bg-muted/20 h-64 flex items-center justify-center text-center p-6">
        <div className="space-y-3">
          <div className="p-3 bg-background rounded-full w-fit mx-auto shadow-sm">
            <Info className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold">Dados Insuficientes</p>
            <p className="text-[11px] text-muted-foreground">A IA precisa de pelo menos 5 lançamentos para começar a projetar seu futuro financeiro.</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading) return (
    <Card className="border-none shadow-md h-64 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">IA calculando projeções...</p>
      </div>
    </Card>
  );

  if (error || !prediction) return (
    <Card className="border-none shadow-md h-64 flex items-center justify-center p-6 text-center">
      <div className="space-y-2">
        <AlertCircle className="w-8 h-8 text-destructive/50 mx-auto" />
        <p className="text-xs text-muted-foreground">{error || "Aguardando dados da IA..."}</p>
      </div>
    </Card>
  );

  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Previsão de Patrimônio (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border shadow-xl p-2 rounded-lg">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{payload[0].payload.month}</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorProj)" 
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {prediction.insight && (
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
              "{prediction.insight}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}