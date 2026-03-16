"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AICategoryBadge() {
  return (
    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] h-4 px-1.5 flex items-center gap-1 animate-pulse">
      <Sparkles className="w-2.5 h-2.5" />
      IA SUGERIU
    </Badge>
  );
}