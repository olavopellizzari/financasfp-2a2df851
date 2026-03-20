"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string | number;
  onValueChange: (value: string) => void;
}

export function MoneyInput({ value, onValueChange, className, ...props }: MoneyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito
    const digits = e.target.value.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para ter 2 casas decimais
    const numericValue = parseInt(digits, 10) || 0;
    const formattedValue = (numericValue / 100).toFixed(2);
    
    onValueChange(formattedValue);
  };

  // Garante que o valor exibido sempre tenha 2 casas decimais
  const displayValue = typeof value === 'number' 
    ? value.toFixed(2) 
    : (parseFloat(value) || 0).toFixed(2);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">R$</span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue.replace('.', ',')}
        onChange={handleChange}
        className={cn("pl-10 font-bold", className)}
      />
    </div>
  );
}