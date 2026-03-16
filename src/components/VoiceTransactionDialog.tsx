"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Sparkles, Volume2, AlertCircle } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { parseVoiceCommand } from '@/lib/voice-parser';
import { cn } from '@/lib/utils';

interface VoiceTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (data: any) => void;
}

export function VoiceTransactionDialog({ isOpen, onOpenChange, onResult }: VoiceTransactionDialogProps) {
  const { isListening, transcript, error, startListening, stopListening, isSupported } = useVoiceRecognition();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && isSupported) {
      startListening();
    }
  }, [isOpen, isSupported, startListening]);

  useEffect(() => {
    if (transcript) {
      setIsProcessing(true);
      const parsed = parseVoiceCommand(transcript);
      
      // Simula um pequeno delay de processamento da "IA"
      setTimeout(() => {
        onResult(parsed);
        setIsProcessing(false);
        onOpenChange(false);
      }, 1200);
    }
  }, [transcript, onResult, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-pulse" />
        
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold">Comando de Voz</DialogTitle>
          <DialogDescription className="text-base">
            Diga algo como: "Gastei 45 reais no almoço"
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-10 space-y-8">
          <div className="relative">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-150" />
              </>
            )}
            <Button 
              size="icon" 
              className={cn(
                "w-24 h-24 rounded-full shadow-xl transition-all duration-500 relative z-10",
                isListening ? "bg-primary scale-110" : "bg-muted hover:bg-muted/80"
              )}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? <Volume2 className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-muted-foreground" />}
            </Button>
          </div>

          <div className="min-h-[60px] text-center w-full px-4">
            {isListening ? (
              <p className="text-primary font-medium animate-pulse">Ouvindo você...</p>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Processando com IA...</p>
              </div>
            ) : transcript ? (
              <p className="text-lg font-semibold italic text-foreground">"{transcript}"</p>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <p className="text-xs font-medium">{error === 'not-allowed' ? 'Permissão de microfone negada.' : 'Erro ao capturar voz.'}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Clique no microfone para tentar novamente</p>
            )}
          </div>
        </div>

        {!isSupported && (
          <div className="p-4 bg-warning/10 rounded-2xl border border-warning/20 text-center">
            <p className="text-xs text-warning-foreground font-medium">Seu navegador não suporta comandos de voz nativos.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}