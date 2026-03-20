"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/use-gamification';
import { Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LevelProgressProps {
  showTitle?: boolean;
  className?: string;
}

export function LevelProgress({ showTitle = true, className }: LevelProgressProps) {
  const { level, levelTitle, progress, currentLevelXp } = useGamification();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center shadow-sm">
            <Star className="w-3.5 h-3.5 text-white fill-current" />
          </div>
          <span className="text-xs font-black uppercase tracking-tighter">Nível {level}</span>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground">{currentLevelXp} / 500 XP</span>
      </div>
      
      <Progress value={progress} className="h-1.5 bg-muted" />
      
      {showTitle && (
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest text-center animate-pulse">
          {levelTitle}
        </p>
      )}
    </div>
  );
}