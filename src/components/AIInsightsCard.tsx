"use client";

import React, { useState, useEffect } from 'react';
import { useAIAssistant, AIInsight } from '@/hooks/use-ai-assistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface AIInsightsCardProps {
  onSendMessage: (message: string) => Promise<void>;
  onOpenChat: (open: boolean) => void;
}

export function AIInsightsCard({ onSendMessage, onOpenChat }: AIInsightsCardProps) {
  const { insights } = useAIAssistant();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (insights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 5000); // Rotação a cada 5 segundos

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
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'success': return <TrendingUp className="w-5 h-5 text-income" />;
      case 'tip': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      default: return <Sparkles className="w-5 h-5 text-primary" />;
    }
  };

  const handleAskAI = async (question: string) => {
    onOpenChat(true); // Abre o chat da IA
    await onSendMessage(question);
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1 gradient-primary shadow-md text-xs font-bold h-9"
            onClick={() => handleAskAI(insight.actionable || insight.message)}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-2" />
            Ver detalhes
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-[10px] font-bold uppercase tracking-wider h-9 hover:bg-primary/5"
            onClick={() => navigate('/reports')}
          >
            Ver análise completa <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}