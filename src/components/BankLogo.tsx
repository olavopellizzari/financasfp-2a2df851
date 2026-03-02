"use client";

import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);

  // Reset error state if logoUrl changes
  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [logoUrl]);

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm'
  };

  const iconSizes = {
    sm: 12,
    md: 18,
    lg: 22
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
      "rounded-xl bg-white flex items-center justify-center overflow-hidden border shadow-sm shrink-0 p-1.5 relative",
      sizeClasses[size],
      className
    )}>
      {loading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img 
        src={logoUrl} 
        alt={bankName} 
        className={cn(
          "w-full h-full object-contain transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}