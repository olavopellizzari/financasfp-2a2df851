"use client";

import React, { useState, useEffect } from 'react';
import { useAIAssistant, AIInsight } from '@/hooks/use-ai-assistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, AlertTriangle, CheckCircle2, Lightbulb, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function AIFinanceAssistant() {
  const { insights } = useAIAssistant();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (insights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [insights.length]);

  // Resetar o índice se a lista de insights mudar drasticamente
  useEffect(() => {
    if (currentIndex >= insights.length) {
      setCurrentIndex(0);
    }
  }, [insights.length, currentIndex]);

  if (insights.length === 0) return null;

  const insight = insights[currentIndex];

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-income" />;
      case 'tip': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          Dyad AI Assistant
          {insights.length > 1 && (
            <span className="ml-auto text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
              {currentIndex + 1} de {insights.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          key={currentIndex} 
          className={cn(
            "p-3 rounded-xl border flex items-start gap-3 transition-all animate-fade-in min-h-[60px]",
            insight.type === 'warning' ? "bg-orange-500/5 border-orange-500/10" : 
            insight.type === 'success' ? "bg-income/5 border-income/10" : "bg-muted/30 border-border/50"
          )}
        >
          <div className="mt-0.5 shrink-0">{getIcon(insight.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-none mb-1">{insight.title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.message}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/reports')}
          className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          Ver análise completa <ChevronRight className="w-3 h-3" />
        </button>
      </CardContent>
    </Card>
  );
}