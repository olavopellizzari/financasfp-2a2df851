"use client";

import React, { useState } from 'react';
import { useAIAssistant, AIInsight } from '@/hooks/use-ai-assistant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, ChevronRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/hooks/use-ai-chat'; // Importação corrigida

export function AIInsightsCard() {
  const { insights } = useAIAssistant();
  const { sendMessage } = useAIChat();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (insights.length === 0) return null;

  const insight = insights[currentIndex];

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning': return <TrendingUp className="w-5 h-5 text-expense" />;
      case 'tip': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case 'info': return <AlertCircle className="w-5 h-5 text-primary" />;
      default: return <Sparkles className="w-5 h-5 text-primary" />;
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  const handleAskAI = async (question: string) => { // Tornando a função assíncrona
    await sendMessage(question);
  };

  return (
    <Card className="border-none shadow-sm bg-primary/5 overflow-hidden animate-fade-in mb-6">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row items-stretch">
          <div className="p-6 flex-1 flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-white shadow-sm shrink-0">
              {getIcon(insight.type)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Insight Dyad AI</span>
                <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-bold leading-tight">{insight.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {insight.message}
              </p>
            </div>
          </div>
          
          <div className="px-6 pb-6 sm:py-6 sm:border-l border-primary/10 flex flex-col justify-center gap-2 min-w-[180px]">
            <Button 
              variant="default" 
              size="sm" 
              className="w-full gradient-primary shadow-md text-xs font-bold h-9"
              onClick={() => handleAskAI(insight.actionable || insight.message)}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-2" />
              Ver detalhes
            </Button>
            {insights.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-[10px] font-bold uppercase tracking-wider h-8 hover:bg-primary/10"
                onClick={handleNext}
              >
                Próximo Insight ({currentIndex + 1}/{insights.length})
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}