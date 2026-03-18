"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, Sparkles, Volume2, AlertCircle } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { parseVoiceCommand } from '@/lib/voice-parser';
import { cn } from '@/lib/utils';

interface VoiceTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (data: any) => void;
}

export function VoiceTransactionDialog({ isOpen, onOpenChange, onResult }: VoiceTransactionDialogProps) {
  const { isListening, transcript, error, startListening, stopListening, resetTranscript, isSupported } = useVoiceRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const hasProcessedRef = useRef(false);

  // Resetar a flag de processamento quando o diálogo abrir
  useEffect(() => {
    if (isOpen) {
      hasProcessedRef.current = false;
      setIsProcessing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (transcript && !isListening && !hasProcessedRef.current) {
      hasProcessedRef.current = true;
      setIsProcessing(true);
      
      const parsed = parseVoiceCommand(transcript);
      
      // Pequeno delay para o usuário ver o que foi transcrito antes de fechar
      const timer = setTimeout(() => {
        onResult(parsed);
        setIsProcessing(false);
        resetTranscript(); // Limpa o texto para evitar re-processamento
        onOpenChange(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [transcript, isListening, onResult, onOpenChange, resetTranscript]);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSupported || isProcessing) return;
    e.preventDefault();
    hasProcessedRef.current = false;
    startListening();
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    }
  };

  const getErrorMessage = (err: string) => {
    switch (err) {
      case 'not-allowed': return 'Acesso ao microfone negado. Verifique as permissões do navegador.';
      case 'no-speech': return 'Nenhuma voz detectada. Tente falar mais alto e claro.';
      case 'network': return 'Erro de rede. O reconhecimento de voz precisa de internet.';
      case 'audio-capture': return 'Microfone não encontrado ou ocupado por outro app.';
      case 'not-supported': return 'Seu navegador não suporta comandos de voz.';
      default: return `Erro: ${err}. Tente novamente ou use o teclado.`;
    }
  };

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
            Segure o botão para falar seu gasto
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
                "w-24 h-24 rounded-full shadow-xl transition-all duration-300 relative z-10 select-none touch-none",
                isListening ? "bg-primary scale-110 shadow-primary/40" : "bg-muted hover:bg-muted/80"
              )}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
            >
              {isListening ? <Volume2 className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-muted-foreground" />}
            </Button>
          </div>

          <div className="min-h-[80px] text-center w-full px-4 flex flex-col items-center justify-center">
            {isListening ? (
              <div className="space-y-2">
                <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">Gravando...</p>
                <p className="text-sm text-muted-foreground">Solte para finalizar</p>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Processando com IA...</p>
              </div>
            ) : transcript ? (
              <p className="text-lg font-semibold italic text-foreground">"{transcript}"</p>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 text-destructive bg-destructive/5 p-4 rounded-2xl border border-destructive/10">
                <AlertCircle className="w-5 h-5" />
                <p className="text-xs font-medium leading-relaxed">{getErrorMessage(error)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">Pressione e segure para falar</p>
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