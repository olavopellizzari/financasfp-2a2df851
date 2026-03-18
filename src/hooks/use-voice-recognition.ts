"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('not-supported');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    } catch (e) {
      console.error('Falha ao iniciar reconhecimento:', e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  };
}