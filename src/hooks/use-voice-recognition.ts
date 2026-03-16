import { useState, useEffect, useCallback } from 'react';

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
  }

  const startListening = useCallback(() => {
    if (!recognition) {
      setError('Reconhecimento de voz não suportado neste navegador.');
      return;
    }
    setError(null);
    setTranscript('');
    setIsListening(true);
    recognition.start();
  }, [recognition]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    recognition?.stop();
  }, [recognition]);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0].transcript;
      setTranscript(result);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, [recognition]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported: !!recognition
  };
}