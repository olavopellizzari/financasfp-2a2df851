"use client";

import React from 'react';
import { Transaction, Category, User, formatCurrency } from '@/lib/db';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2, Check, RotateCcw, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, CreditCard, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_ICONS: any = {
  INCOME: { icon: ArrowUpRight, color: 'text-income' },
  EXPENSE: { icon: ArrowDownRight, color: 'text-expense' },
  TRANSFER: { icon: ArrowLeftRight, color: 'text-primary' },
  CREDIT: { icon: CreditCard, color: 'text-credit' },
  REFUND: { icon: Undo2, color: 'text-income' },
};

interface TransactionTableProps {
  transactions: Transaction[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onTogglePaid: (tx: Transaction) => void;
  getCategoryById: (id: string) => Category | undefined;
  users: User[];
}

export function TransactionTable({
  transactions, selectedIds, onToggleSelect, onToggleSelectAll,
  onEdit, onDelete, onTogglePaid, getCategoryById, users
}: TransactionTableProps) {
  
  const formatLocal = (date: string, formatStr: string) => {
    const d = parseISO(date);
    return isValid(d) ? format(d, formatStr, { locale: ptBR }) : '';
  };

  return (
    <div className="table-container">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="p-4 w-10">
              <Checkbox 
                checked={selectedIds.size === transactions.length && transactions.length > 0} 
                onCheckedChange={onToggleSelectAll} 
              />
            </th>
            <th className="text-left p-4 font-semibold whitespace-nowrap">Data</th>
            <th className="text-left p-4 font-semibold whitespace-nowrap">Descrição</th>
            <th className="text-left p-4 font-semibold whitespace-nowrap">Categoria</th>
            <th className="text-left p-4 font-semibold whitespace-nowrap">Usuário</th>
            <th className="text-right p-4 font-semibold whitespace-nowrap">Valor</th>
            <th className="text-center p-4 font-semibold whitespace-nowrap">Status</th>
            <th className="text-right p-4 font-semibold whitespace-nowrap">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transactions.map(tx => {
            const category = getCategoryById(tx.categoryId);
            const txUser = users.find(u => u.id === tx.userId);
            const typeInfo = TYPE_ICONS[tx.type] || TYPE_ICONS.EXPENSE;
            const Icon = typeInfo.icon;

            return (
              <tr key={tx.id} className={cn("hover:bg-muted/30 transition-colors group", selectedIds.has(tx.id) && "bg-primary/5")}>
                <td className="p-4"><Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => onToggleSelect(tx.id)} /></td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium whitespace-nowrap">{formatLocal(tx.purchaseDate, 'dd/MM/yy')}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{formatLocal(tx.purchaseDate, 'EEEE')}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0"><Icon className={cn("w-4 h-4", typeInfo.color)} /></div>
                    <div className="flex flex-col min-w-[120px]">
                      <span className="font-semibold truncate max-w-[200px]">{tx.description}</span>
                      {tx.installmentGroupId && <Badge variant="secondary" className="w-fit text-[10px] h-4 px-1">Parcela {tx.installmentNumber}/{tx.totalInstallments}</Badge>}
                    </div>
                  </div>
                </td>
                <td className="p-4"><Badge variant="outline" className="font-normal whitespace-nowrap">{category?.icon} {category?.name || 'Sem Categoria'}</Badge></td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0" style={{ backgroundColor: txUser?.avatar_color || '#94a3b8' }}>
                      {txUser?.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-xs truncate max-w-[80px]">{txUser?.name || 'Sistema'}</span>
                  </div>
                </td>
                <td className="p-4 text-right font-semibold">
                  <span className={cn("whitespace-nowrap", typeInfo.color)}>
                    {tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => onTogglePaid(tx)} className={cn("flex items-center gap-1 mx-auto px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all", tx.isPaid ? "bg-income/10 text-income" : "bg-warning/10 text-warning border border-warning/20")}>
                    {tx.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {tx.isPaid ? "Pago" : "Pendente"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onTogglePaid(tx)} className="h-8 w-8">{tx.isPaid ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}</Button>
                    <Button size="icon" variant="ghost" onClick={() => onEdit(tx)} className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(tx)} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}