import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, History, User, FileText, Eye, RefreshCw } from 'lucide-react';
import { db, AuditLog, User as UserType } from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
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
      const [logsData, usersData] = await Promise.all([
        db.getAll<AuditLog>('auditLogs'),
        db.getAll<UserType>('users')
      ]);
      setLogs(logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setUsers(usersData);
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
      JSON.stringify(log.after || log.before).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesUser = userFilter === 'all' || log.actorUserId === userFilter;

    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    const styles: Record<string, { bg: string; text: string }> = {
      create: { bg: 'bg-finance-income/20', text: 'text-finance-income' },
      update: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
      delete: { bg: 'bg-finance-expense/20', text: 'text-finance-expense' },
      import: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
      pay_invoice: { bg: 'bg-finance-warning/20', text: 'text-finance-warning' },
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
      <Badge className={`${style.bg} ${style.text}`}>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoria</h1>
          <p className="text-muted-foreground">Histórico completo de alterações</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
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
                    {action === 'create' ? 'Criar' :
                     action === 'update' ? 'Atualizar' :
                     action === 'delete' ? 'Excluir' :
                     action === 'import' ? 'Importar' :
                     action === 'pay_invoice' ? 'Pagar Fatura' :
                     action === 'login' ? 'Login' :
                     action === 'logout' ? 'Logout' :
                     action === 'export' ? 'Exportar' :
                     action === 'backup' ? 'Backup' : action}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-finance-income/20">
                <FileText className="h-5 w-5 text-finance-income" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criações</p>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'create').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atualizações</p>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'update').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-finance-expense/20">
                <FileText className="h-5 w-5 text-finance-expense" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Exclusões</p>
                <p className="text-2xl font-bold">{logs.filter(l => l.action === 'delete').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Registros ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredLogs.map(log => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => handleViewDetails(log)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      {getActionBadge(log.action)}
                      <Badge variant="outline" className="text-xs">
                        {getEntityLabel(log.entityType)}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">
                        {log.action === 'create' && log.after?.name && log.after.name}
                        {log.action === 'update' && log.after?.name && log.after.name}
                        {log.action === 'delete' && log.before?.name && log.before.name}
                        {!log.after?.name && !log.before?.name && log.entityId.substring(0, 12)}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{getUserName(log.actorUserId)}</span>
                        <span>•</span>
                        <span>{format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Registro
              {selectedLog && getActionBadge(selectedLog.action)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">{format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuário</p>
                    <p className="font-medium">{getUserName(selectedLog.actorUserId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">{getEntityLabel(selectedLog.entityType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID da Entidade</p>
                    <p className="font-mono text-sm">{selectedLog.entityId}</p>
                  </div>
                </div>

                {selectedLog.before && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Antes</p>
                    <pre className="p-3 bg-muted rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.after && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Depois</p>
                    <pre className="p-3 bg-muted rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                )}

                {Object.keys(selectedLog.meta || {}).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Metadados</p>
                    <pre className="p-3 bg-muted rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.meta, null, 2)}
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
