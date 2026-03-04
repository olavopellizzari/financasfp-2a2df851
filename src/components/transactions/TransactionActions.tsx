"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/lib/db';
import { Pencil, Trash2, Check, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionActionsProps {
  selectedTransactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (txIds: string[]) => void;
  onTogglePaid: (tx: Transaction) => void;
  onClearSelection: () => void;
}

export function TransactionActions({
  selectedTransactions,
  onEdit,
  onDelete,
  onTogglePaid,
  onClearSelection,
}: TransactionActionsProps) {
  const selectedCount = selectedTransactions.length;
  const isSingleSelection = selectedCount === 1;
  const firstSelectedTx = isSingleSelection ? selectedTransactions[0] : null;

  const handleEditClick = () => {
    if (firstSelectedTx) {
      onEdit(firstSelectedTx);
    }
  };

  const handleDeleteClick = () => {
    if (selectedCount > 0) {
      onDelete(selectedTransactions.map(tx => tx.id));
    }
  };

  const handleTogglePaidClick = () => {
    if (firstSelectedTx) {
      onTogglePaid(firstSelectedTx);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full shadow-lg p-2 flex items-center gap-2 transition-all duration-300 z-50",
      selectedCount > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
    )}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onClearSelection} 
        className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="h-5 w-5" />
      </Button>
      <span className="text-sm font-medium text-foreground">
        {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
      </span>
      
      {isSingleSelection && (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleEditClick} 
            className="h-9 w-9 rounded-full text-primary hover:bg-primary/10"
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleTogglePaidClick} 
            className="h-9 w-9 rounded-full text-income hover:bg-income/10"
          >
            {firstSelectedTx?.isPaid ? <RotateCcw className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          </Button>
        </>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleDeleteClick} 
        className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}