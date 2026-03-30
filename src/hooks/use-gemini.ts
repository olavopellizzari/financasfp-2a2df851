"use client";

import { useState, useCallback } from 'react';
import { askGemini, extractJSON } from '@/lib/gemini';

interface UseGeminiOptions {
  jsonMode?: boolean;
  context?: string;
}

/**
 * Hook para interagir com a IA Gemini de forma reativa
 */
export function useGemini(options: UseGeminiOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const generate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const responseText = await askGemini(prompt, options.context);
      
      if (options.jsonMode) {
        const json = extractJSON(responseText);
        setData(json);
        return json;
      } else {
        setData(responseText);
        return responseText;
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(err.message || "Erro desconhecido na IA");
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  }, [options.context, options.jsonMode]);

  const reset = () => {
    setData(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    generate,
    reset,
    data,
    isLoading,
    error
  };
}