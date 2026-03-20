"use client";

import React from 'react';
import { Transaction, Category, User, Account, Card, formatCurrency } from '@/lib/db';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2, Check, RotateCcw, Clock, CheckCircle2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, CreditCard, Undo2, Wallet, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  accounts: Account[];
  cards: Card[];
}

export function TransactionTable({
  transactions, selectedIds, onToggleSelect, onToggleSelectAll,
  onEdit, onDelete, onTogglePaid, getCategoryById, users, accounts, cards
}: TransactionTableProps) {
  
  const formatLocal = (date: string, formatStr: string) => {
    const d = parseISO(date);
    return isValid(d) ? format(d, formatStr, { locale: ptBR }) : '';
  };

  const getEntityName = (tx: Transaction) => {
    if (tx.cardId) {
      const card = cards.find(c => c.id === tx.cardId);
      return { name: card?.name || 'Cartão', icon: <CreditCard className="w-3 h-3" /> };
    }
    if (tx.accountId) {
      const account = accounts.find(a => a.id === tx.accountId);
      return { name: account?.name || 'Conta', icon: <Wallet className="w-3 h-3" /> };
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="p-4 w-10">
              <Checkbox 
                checked={selectedIds.size === transactions.length && transactions.length > 0} 
                onCheckedChange={onToggleSelectAll} 
              />
            </th>
            <th className="text-left p-4 font-semibold whitespace-nowrap min-w-[80px]">Data</th>
            <th className="text-left p-4 font-semibold whitespace-nowrap min-w-[200px]">Descrição</th>
            <th className="text-left p-4 font-semibold whitespace-nowrap min-w-[120px]">Categoria</th>
            <th className="text-left p-4 font-semibold whitespace-nowrap min-w-[120px]">Origem</th>
            <th className="text-right p-4 font-semibold whitespace-nowrap min-w-[100px]">Valor</th>
            <th className="text-center p-4 font-semibold whitespace-nowrap min-w-[100px]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transactions.map(tx => {
            const category = getCategoryById(tx.categoryId);
            const txUser = users.find(u => u.id === tx.userId);
            const typeInfo = TYPE_ICONS[tx.type] || TYPE_ICONS.EXPENSE;
            const Icon = typeInfo.icon;
            const entity = getEntityName(tx);
            const isInternational = tx.currency && tx.currency !== 'BRL';

            return (
              <tr key={tx.id} className={cn("hover:bg-muted/30 transition-colors group", selectedIds.has(tx.id) && "bg-primary/5")}>
                <td className="p-4"><Checkbox checked={selectedIds.has(tx.id)} onCheckedChange={() => onToggleSelect(tx.id)} /></td>
                <td className="p-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium">{formatLocal(tx.purchaseDate, 'dd/MM/yy')}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{formatLocal(tx.purchaseDate, 'EEEE')}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0"><Icon className={cn("w-4 h-4", typeInfo.color)} /></div>
                    <div className="flex flex-col min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate max-w-[200px]">{tx.description}</span>
                        {isInternational && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-primary/10 text-primary border-none">
                                  <Globe className="w-2 h-2 mr-1" /> {tx.currency}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Valor original: {tx.currency} {tx.originalAmount?.toFixed(2)}</p>
                                <p className="text-[10px] opacity-70">Câmbio: {tx.exchangeRate?.toFixed(4)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {tx.totalInstallments && tx.totalInstallments > 1 && (
                        <span className="text-[10px] text-primary font-bold mt-0.5">
                          Parcela {tx.installmentNumber}/{tx.totalInstallments}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap"><Badge variant="outline" className="font-normal">{category?.icon} {category?.name || 'Sem Categoria'}</Badge></td>
                <td className="p-4 whitespace-nowrap">
                  {entity && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {entity.icon}
                      <span className="text-xs font-medium">{entity.name}</span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-right font-semibold whitespace-nowrap">
                  <span className={cn(typeInfo.color)}>
                    {tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </span>
                </td>
                <td className="p-4 text-center whitespace-nowrap">
                  <button onClick={() => onTogglePaid(tx)} className={cn("flex items-center gap-1 mx-auto px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all", tx.isPaid ? "bg-income/10 text-income" : "bg-warning/10 text-warning border border-warning/20")}>
                    {tx.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {tx.isPaid ? "Pago" : "Pendente"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}