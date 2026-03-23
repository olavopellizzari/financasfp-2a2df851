"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('not-supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'pt-BR';
    recognition.interimResults = true; // Melhora o feedback visual no mobile
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
    };

    recognition.onerror = (event: any) => {
      // 'aborted' acontece quando paramos manualmente, não é um erro real
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error("Erro reconhecimento de voz:", event.error);
        setError(event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    try {
      // Limpa instâncias anteriores para evitar conflitos no mobile
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
      
      const recognition = initRecognition();
      if (!recognition) return;
      
      recognitionRef.current = recognition;
      setTranscript('');
      
      // No mobile, o start() deve ser chamado imediatamente no evento de toque
      recognition.start();
      
      // Feedback tátil (vibração curta) se disponível
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (e) {
      console.error("Falha ao iniciar reconhecimento:", e);
      setError('start-failed');
      setIsListening(false);
    }
  }, [initRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 30]);
        }
      } catch (e) {
        recognitionRef.current.abort();
      }
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  };
}