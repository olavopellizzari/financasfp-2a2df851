"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, MessageCircle, X, Send, User, Bot } from 'lucide-react';
import { useAIChat } from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function AIChatFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isTyping, sendMessage } = useAIChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Função de rolagem automática robusta
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Rola para o fim sempre que as mensagens mudam ou a IA está digitando
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Mantém o foco no input ao abrir e após interações
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    
    const text = inputValue;
    setInputValue('');
    sendMessage(text);
    
    // Garante que o foco volte para o input imediatamente para a próxima mensagem
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[90vw] sm:w-[400px] h-[500px] max-h-[70vh] shadow-2xl border-none flex flex-col overflow-hidden animate-scale-in rounded-[24px]">
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

          <CardContent className="flex-1 p-0 flex flex-col bg-muted/10 overflow-hidden">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
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
                  <div className="flex gap-3 mr-auto max-w-[85%]">
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
                {/* Elemento de referência para rolagem automática */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Campo de mensagem fixo no rodapé do card */}
            <div className="p-4 bg-white border-t shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
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
            </div>
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