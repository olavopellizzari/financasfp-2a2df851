"use client";

import { useState, useCallback, useRef } from 'react';

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
    recognition.interimResults = false;
    // No mobile, o tempo de silêncio para encerrar é menor, então forçamos o fim manual
    
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
      // Limpa instâncias anteriores
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
      
      const recognition = initRecognition();
      if (!recognition) return;
      
      recognitionRef.current = recognition;
      setTranscript('');
      recognition.start();
      
      // Feedback tátil (vibração curta) se disponível
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (e) {
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