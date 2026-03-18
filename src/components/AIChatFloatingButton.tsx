"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, MessageCircle, X, Send, Loader2, User, Bot } from 'lucide-react';
import { useAIChat } from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function AIChatFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isTyping, sendMessage } = useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Função robusta para rolar até o fim
  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // Rola sempre que as mensagens mudam ou a IA começa/termina de digitar
  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para garantir que o DOM foi atualizado com a nova mensagem
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isTyping, isOpen]);

  // Focar no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    
    const text = inputValue;
    setInputValue('');
    sendMessage(text);
    
    // Mantém o foco para a próxima mensagem imediatamente
    inputRef.current?.focus();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[350px] sm:w-[400px] h-[500px] shadow-2xl border-none flex flex-col overflow-hidden animate-scale-in rounded-[24px]">
          <CardHeader className="gradient-primary text-white p-4 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Dyad AI</CardTitle>
                <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Assistente Financeiro</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col bg-muted/10">
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              <div className="space-y-4 pb-2">
                {messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex gap-3 max-w-[85%] animate-slide-up", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      msg.role === 'user' ? "bg-primary text-white" : "bg-white text-primary border"
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white text-foreground border rounded-tl-none"
                    )}>
                      {msg.content}
                      <p className={cn("text-[9px] mt-1 opacity-50", msg.role === 'user' ? "text-right" : "text-left")}>
                        {format(msg.timestamp, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3 mr-auto max-w-[85%] animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-white text-primary border flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2 shrink-0">
              <Input 
                ref={inputRef}
                placeholder="Escreva sua mensagem..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="rounded-xl border-muted focus-visible:ring-primary h-11"
                autoComplete="off"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-xl gradient-primary shrink-0 h-11 w-11 shadow-md" 
                disabled={!inputValue.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl gradient-primary transition-all duration-300 hover:scale-110",
          isOpen ? "rotate-90" : ""
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </div>
  );
}