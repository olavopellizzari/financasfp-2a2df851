import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, History, User, FileText, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { db, AuditLog } from '@/lib/db';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AuditPage() {
  const { users } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const logsData = await db.getAll<AuditLog>('auditLogs');
      setLogs(logsData.sort((a, b) => {
        const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      }));
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.after || log.before || {}).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesUser = userFilter === 'all' || log.actorUserId === userFilter;

    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    const styles: Record<string, { bg: string; text: string }> = {
      create: { bg: 'bg-income/20', text: 'text-income' },
      update: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
      delete: { bg: 'bg-expense/20', text: 'text-expense' },
      import: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
      pay_invoice: { bg: 'bg-warning/20', text: 'text-warning' },
      login: { bg: 'bg-cyan-500/20', text: 'text-cyan-500' },
      logout: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
      export: { bg: 'bg-indigo-500/20', text: 'text-indigo-500' },
      backup: { bg: 'bg-teal-500/20', text: 'text-teal-500' }
    };

    const labels: Record<string, string> = {
      create: 'Criar',
      update: 'Atualizar',
      delete: 'Excluir',
      import: 'Importar',
      pay_invoice: 'Pagar Fatura',
      login: 'Login',
      logout: 'Logout',
      export: 'Exportar',
      backup: 'Backup'
    };

    const style = styles[action] || { bg: 'bg-muted', text: 'text-foreground' };

    return (
      <Badge className={`${style.bg} ${style.text} border-none`}>
        {labels[action] || action}
      </Badge>
    );
  };

  const getEntityLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      account: 'Conta',
      card: 'Cartão',
      transaction: 'Transação',
      category: 'Categoria',
      tag: 'Tag',
      invoice: 'Fatura',
      budget: 'Orçamento',
      goal: 'Meta',
      user: 'Usuário',
      merchant: 'Estabelecimento'
    };
    return labels[entityType] || entityType;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || userId;
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const actions = ['create', 'update', 'delete', 'import', 'pay_invoice', 'login', 'logout', 'export', 'backup'];
  const entityTypes = [...new Set(logs.map(l => l.entityType))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <p className="text-muted-foreground">Histórico completo e imutável de alterações no sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="finance-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos dados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>{getEntityLabel(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="finance-card"><CardContent className="pt-6 flex items-center gap-3"><div className="p-3 rounded-xl bg-primary/10"><History className="h-5 w-5 text-primary" /></div><div><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Logs</p><p className="text-2xl font-bold">{logs.length}</p></div></CardContent></Card>
        <Card className="finance-card"><CardContent className="pt-6 flex items-center gap-3"><div className="p-3 rounded-xl bg-income/10"><FileText className="h-5 w-5 text-income" /></div><div><p className="text-[10px] font-bold text-muted-foreground uppercase">Criações</p><p className="text-2xl font-bold">{logs.filter(l => l.action === 'create').length}</p></div></CardContent></Card>
        <Card className="finance-card"><CardContent className="pt-6 flex items-center gap-3"><div className="p-3 rounded-xl bg-blue-500/10"><FileText className="h-5 w-5 text-blue-500" /></div><div><p className="text-[10px] font-bold text-muted-foreground uppercase">Edições</p><p className="text-2xl font-bold">{logs.filter(l => l.action === 'update').length}</p></div></CardContent></Card>
        <Card className="finance-card"><CardContent className="pt-6 flex items-center gap-3"><div className="p-3 rounded-xl bg-expense/10"><FileText className="h-5 w-5 text-expense" /></div><div><p className="text-[10px] font-bold text-muted-foreground uppercase">Exclusões</p><p className="text-2xl font-bold">{logs.filter(l => l.action === 'delete').length}</p></div></CardContent></Card>
      </div>

      <Card className="finance-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Registros Recentes ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nenhum registro encontrado.</div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map(log => {
                const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
                return (
                  <div 
                    key={log.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => handleViewDetails(log)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getActionBadge(log.action)}
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">
                          {getEntityLabel(log.entityType)}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {log.after?.description || log.after?.name || log.before?.description || log.before?.name || `ID: ${log.entityId.substring(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase">
                          <User className="h-3 w-3" />
                          <span>{getUserName(log.actorUserId)}</span>
                          <span>•</span>
                          <span>{isValid(logDate) ? format(logDate, "dd/MM/yy 'às' HH:mm", { locale: ptBR }) : 'Data inválida'}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Registro
              {selectedLog && getActionBadge(selectedLog.action)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Data/Hora</p>
                    <p className="text-sm font-semibold">
                      {isValid(new Date(selectedLog.timestamp)) ? format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) : '---'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Usuário</p>
                    <p className="text-sm font-semibold">{getUserName(selectedLog.actorUserId)}</p>
                  </div>
                </div>

                {selectedLog.before && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Dados Anteriores</p>
                    <pre className="p-4 bg-muted rounded-xl overflow-x-auto text-[11px] font-mono">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.after && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-primary uppercase">Novos Dados / Alterações</p>
                    <pre className="p-4 bg-primary/5 border border-primary/10 rounded-xl overflow-x-auto text-[11px] font-mono">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}