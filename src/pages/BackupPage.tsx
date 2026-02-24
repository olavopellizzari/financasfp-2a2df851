import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Upload, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export function BackupPage() {
  const { user, users } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [cleanImport, setCleanImport] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setStatus(null);
    try {
      const tables = ['accounts', 'cards', 'transactions', 'categories', 'budgets', 'goals', 'debts'];
      const exportData: any = {};
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        exportData[table] = data;
      }
      const fullBackup = { version: 2, exportedAt: new Date().toISOString(), data: exportData };
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financas-nuvem-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Backup exportado com sucesso!' });
    } catch (error: any) {
      setStatus({ type: 'error', message: `Erro ao exportar: ${error.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

  const isValidUUID = (uuid: string) => {
    const s = "" + uuid;
    const match = s.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    return match !== null;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    setImportProgress(0);
    setStatus(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const data = backup.data || backup;

      if (!window.confirm(cleanImport 
        ? 'Isso apagará todos os dados atuais na nuvem antes de importar. Deseja continuar?' 
        : 'Os dados serão mesclados com os atuais. Isso pode duplicar saldos. Deseja continuar?')) {
        setIsImporting(false);
        return;
      }

      // 1. Limpeza prévia
      if (cleanImport) {
        const tablesToClear = ['transactions', 'cards', 'accounts', 'budgets', 'goals', 'debts'];
        for (const table of tablesToClear) {
          await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      // 2. Mapeamento de Usuários
      const userMap: Record<string, string> = {};
      if (data.users) {
        data.users.forEach((oldUser: any) => {
          const match = users.find(u => u.email.toLowerCase() === oldUser.email.toLowerCase());
          if (match) userMap[oldUser.id] = match.id;
        });
      }
      const getUserId = (oldId: string) => userMap[oldId] || user.id;

      const idMaps: Record<string, Record<string, string>> = {
        categories: {}, accounts: {}, cards: {}, installmentGroups: {}
      };

      const { data: existingCats } = await supabase.from('categories').select('id, name');
      const systemCatMap: Record<string, string> = {};
      existingCats?.forEach(c => { systemCatMap[c.name.toLowerCase()] = c.id; });

      const tables = [
        { name: 'categories', key: 'categories', schema: ['name', 'icon', 'color', 'type', 'is_system'] },
        { name: 'accounts', key: 'accounts', schema: ['user_id', 'name', 'type', 'balance', 'color', 'icon', 'is_archived', 'is_shared'] },
        { name: 'cards', key: 'cards', schema: ['user_id', 'name', 'last_digits', 'brand', 'limit', 'closing_day', 'due_day', 'color', 'is_archived', 'responsible_user_id', 'default_account_id'] },
        { name: 'transactions', key: 'transactions', schema: ['user_id', 'type', 'amount', 'description', 'purchase_date', 'effective_date', 'effective_month', 'mes_fatura', 'status', 'is_paid', 'account_id', 'card_id', 'category_id', 'notes', 'installment_group_id', 'installment_number', 'total_installments', 'is_recurring', 'recurrence_type', 'recurrence_count'] },
        { name: 'budgets', key: 'budgets', schema: ['user_id', 'month', 'income', 'expenses', 'savings_goal', 'cycle_end_day', 'category_limits'] },
        { name: 'goals', key: 'goals', schema: ['user_id', 'name', 'target_amount', 'current_amount', 'deadline', 'icon', 'color', 'is_completed'] },
        { name: 'debts', key: 'debts', schema: ['user_id', 'name', 'total_amount', 'paid_amount', 'interest_rate', 'start_date', 'due_date', 'monthly_payment', 'is_active', 'notes'] }
      ];

      let completed = 0;
      for (const table of tables) {
        const items = data[table.key] || [];
        if (items.length > 0) {
          const preparedItems = items.map((item: any) => {
            const newItem: any = {};
            Object.keys(item).forEach(key => { newItem[toSnakeCase(key)] = item[key]; });

            const newId = crypto.randomUUID();
            if (idMaps[table.name]) idMaps[table.name][item.id] = newId;
            
            if (table.name === 'categories' && item.isSystem) {
              const nameLower = item.name.toLowerCase();
              if (systemCatMap[nameLower]) {
                idMaps.categories[item.id] = systemCatMap[nameLower];
                return null;
              }
            }

            newItem.id = newId;
            newItem.user_id = getUserId(item.userId || item.user_id);

            const resolveToUUID = (oldId: any, map: Record<string, string>) => {
              if (!oldId || oldId === "") return null;
              const mapped = map[oldId];
              if (mapped && isValidUUID(mapped)) return mapped;
              if (isValidUUID(oldId)) return oldId;
              return null;
            };

            if (table.name === 'transactions') {
              newItem.category_id = resolveToUUID(item.categoryId || item.category_id, idMaps.categories) || systemCatMap[item.categoryName?.toLowerCase()] || null;
              newItem.account_id = resolveToUUID(item.accountId || item.account_id, idMaps.accounts);
              newItem.card_id = resolveToUUID(item.cardId || item.card_id, idMaps.cards);
              
              if (item.installmentGroupId || item.installment_group_id) {
                const oldGroupId = item.installmentGroupId || item.installment_group_id;
                if (!idMaps.installmentGroups[oldGroupId]) {
                  idMaps.installmentGroups[oldGroupId] = crypto.randomUUID();
                }
                newItem.installment_group_id = idMaps.installmentGroups[oldGroupId];
              } else {
                newItem.installment_group_id = null;
              }
            }

            if (table.name === 'cards') {
              newItem.responsible_user_id = getUserId(item.responsibleUserId || item.responsible_user_id);
              newItem.default_account_id = resolveToUUID(item.defaultAccountId || item.default_account_id, idMaps.accounts);
            }

            const filteredItem: any = { id: newItem.id };
            table.schema.forEach(field => { 
              const val = newItem[field];
              if (field.endsWith('_id')) {
                filteredItem[field] = (val && isValidUUID(val)) ? val : null;
              } else if (val !== undefined) {
                filteredItem[field] = val;
              }
            });
            return filteredItem;
          }).filter(Boolean);

          if (preparedItems.length > 0) {
            for (let i = 0; i < preparedItems.length; i += 50) {
              const { error } = await supabase.from(table.name).insert(preparedItems.slice(i, i + 50));
              if (error && table.name !== 'categories') {
                console.error(`Erro na tabela ${table.name}:`, error);
                throw error;
              }
            }
          }
        }
        completed++;
        setImportProgress((completed / tables.length) * 100);
      }

      setStatus({ type: 'success', message: 'Importação concluída!' });
      toast({ title: "Sucesso!", description: "Dados restaurados na nuvem." });
      setTimeout(() => window.location.href = '/', 1500);
    } catch (error: any) {
      setStatus({ type: 'error', message: `Erro: ${error.message}` });
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Backup & Nuvem</h1>
        <p className="text-muted-foreground">Gerencie a migração de dados para o Supabase</p>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="finance-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" /> Exportar Nuvem</CardTitle>
            <CardDescription>Baixe um arquivo JSON com seus dados atuais do Supabase.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isExporting} className="w-full gradient-primary">
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Baixar Backup JSON'}
            </Button>
          </CardContent>
        </Card>

        <Card className="finance-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Importar Backup</CardTitle>
            <CardDescription>Restaure dados de um arquivo JSON (Offline ou Nuvem).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" /> Limpeza Total
                </Label>
                <p className="text-[10px] text-muted-foreground">Apagar dados atuais antes de importar (Recomendado)</p>
              </div>
              <Switch checked={cleanImport} onCheckedChange={setCleanImport} />
            </div>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span>Processando...</span><span>{Math.round(importProgress)}%</span></div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            <label className="block">
              <input type="file" accept=".json" onChange={handleImport} disabled={isImporting} className="hidden" />
              <Button variant="outline" disabled={isImporting} className="w-full cursor-pointer" asChild>
                <span>{isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Selecionar Arquivo JSON'}</span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}