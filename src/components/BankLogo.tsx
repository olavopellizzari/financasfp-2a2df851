"use client";

import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankLogoProps {
  logoUrl?: string;
  bankName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BankLogo({ logoUrl, bankName, className, size = 'md' }: BankLogoProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 24
  };

  if (!logoUrl || error) {
    return (
      <div 
        className={cn(
          "rounded-xl bg-muted flex items-center justify-center font-bold text-muted-foreground border shadow-sm shrink-0",
          sizeClasses[size],
          className
        )}
        title={bankName}
      >
        {bankName ? bankName.substring(0, 2).toUpperCase() : <Building2 size={iconSizes[size]} />}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl bg-white flex items-center justify-center overflow-hidden border shadow-sm shrink-0 p-1",
      sizeClasses[size],
      className
    )}>
      <img 
        src={logoUrl} 
        alt={bankName} 
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  );
}