import { useState, useRef, useMemo, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, User as UserIcon, Calendar, FileSpreadsheet, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { db, generateId, TransactionType, Account } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  userName: string;
  type: TransactionType;
  matchedUserId?: string;
  targetAccountId?: string;
  suggestedCategoryId?: string;
  installments?: {
    current: number;
    total: number;
  };
}

const MONTH_MAP: Record<string, number> = {
  'janeiro': 0, 'fevereiro': 1, 'marco': 2, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
  'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

// Mapeamento de palavras-chave para nomes de categorias (normalizados)
const CATEGORY_KEYWORDS: Record<string, string> = {
  'ifood': 'delivery', 'uber eats': 'delivery', 'rappi': 'delivery',
  'koch': 'supermercado', 'giassi': 'supermercado', 'angeloni': 'supermercado', 'bistek': 'supermercado',
  'fort': 'supermercado', 'mercado': 'supermercado', 'supermercado': 'supermercado',
  'uber': 'uber / 99', '99app': 'uber / 99', 'posto': 'combustivel', 'gasolina': 'combustivel',
  'shell': 'combustivel', 'ipiranga': 'combustivel', 'farmacia': 'farmacia', 'droga': 'farmacia',
  'panvel': 'farmacia', 'raia': 'farmacia', 'netflix': 'streaming', 'spotify': 'streaming',
  'academia': 'academia / esportes', 'restaurante': 'restaurantes', 'padaria': 'lanches / cafe', 'açougue': 'supermercado',
  'pix': 'outras despesas', 'aluguel': 'aluguel / prestacao', 'condominio': 'condominio', 'energia': 'energia eletrica',
  'agua': 'agua / saneamento', 'internet': 'internet / tv', 'manutencao casa': 'manutencao casa',
  'manutencao carro': 'manutencao carro', 'seguro': 'seguro / ipva', 'plano de saude': 'plano de saude',
  'medico': 'medicos / dentistas', 'cinema': 'cinema / eventos', 'beleza': 'beleza / higiene',
  'vestuario': 'vestuario', 'curso': 'cursos / educacao', 'livro': 'livros', 'pet': 'pets',
  'presente': 'presentes / doacoes', 'doacao': 'presentes / doacoes', 'tarifa bancaria': 'tarifas bancarias',
  'imposto': 'impostos', 'salario': 'salario', 'pro-labore': 'pro-labore', 'dividendos': 'dividendos',
  'vendas': 'vendas', 'reembolso': 'reembolsos', 'outras receitas': 'outras receitas'
};

export function ImportPage() {
  const { categories, refresh, allCards, allAccounts, calculateMesFatura, createTransaction } = useFinance();
  const { currentUser, users } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importType, setImportType] = useState<'card' | 'account'>('card');
  const [globalTargetId, setGlobalTargetId] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [headerMonth, setHeaderMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const normalize = (str: string) => str?.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

  const findUserAccount = (userId: string): string => {
    const userAccounts = allAccounts.filter(a => a.user_id === userId && a.active !== false);
    const checking = userAccounts.find(a => a.account_type === 'corrente');
    return checking ? checking.id : (userAccounts[0]?.id || '');
  };

  // Mapeamento de categorias para busca rápida
  const normalizedCategoryMap = useMemo(() => {
    const map = new Map<string, { id: string; type: string; kind?: string }>();
    categories.forEach(cat => {
      map.set(normalize(cat.name), { id: cat.id, type: cat.type, kind: cat.kind });
    });
    return map;
  }, [categories]);

  const suggestCategory = useCallback((description: string, transactionType: TransactionType): string => {
    console.log("--- Sugestão de categoria ---");
    console.log("Descrição original:", description);
    console.log("Tipo de transação:", transactionType);
    const desc = normalize(description);
    console.log("Descrição normalizada:", desc);
    
    // Filtrar categorias relevantes (receita/despesa)
    const relevantCategoryNames = new Set<string>();
    if (transactionType === 'INCOME' || transactionType === 'REFUND') {
      normalizedCategoryMap.forEach((cat, name) => {
        if (cat.type === 'income' || cat.kind === 'receita') relevantCategoryNames.add(name);
      });
    } else {
      normalizedCategoryMap.forEach((cat, name) => {
        if (cat.type === 'expense' || cat.kind === 'despesa') relevantCategoryNames.add(name);
      });
    }
    console.log("Nomes de categorias relevantes:", Array.from(relevantCategoryNames));

    // Tentar encontrar categoria por palavra-chave
    for (const [keyword, catNameNormalized] of Object.entries(CATEGORY_KEYWORDS)) {
      if (desc.includes(keyword)) {
        console.log(`Palavra-chave '${keyword}' encontrada na descrição.`);
        if (relevantCategoryNames.has(catNameNormalized)) {
          const catId = normalizedCategoryMap.get(catNameNormalized)?.id;
          console.log(`Categoria sugerida: '${catNameNormalized}' (ID: ${catId})`);
          return catId || '';
        } else {
          console.log(`Categoria '${catNameNormalized}' não é relevante para o tipo de transação.`);
        }
      }
    }
    
    // Fallback para categoria genérica se nenhuma for encontrada
    const defaultCatName = (transactionType === 'INCOME' || transactionType === 'REFUND') ? 'outras receitas' : 'outras despesas';
    console.log("Tentando categoria padrão:", defaultCatName);
    if (relevantCategoryNames.has(defaultCatName)) {
      const catId = normalizedCategoryMap.get(defaultCatName)?.id;
      console.log(`Usando categoria padrão: '${defaultCatName}' (ID: ${catId})`);
      return catId || '';
    }

    console.log("Nenhuma categoria sugerida.");
    return ''; // Retorna vazio se não encontrar nenhuma
  }, [normalizedCategoryMap]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      if (rows.length === 0) throw new Error("Arquivo vazio");

      const firstCell = normalize(rows[0][0]);
      let detectedMonth = '';
      for (const monthName of Object.keys(MONTH_MAP)) {
        if (firstCell.includes(monthName)) {
          const year = new Date().getFullYear();
          const monthIndex = MONTH_MAP[monthName];
          detectedMonth = format(new Date(year, monthIndex, 1), 'yyyy-MM');
          break;
        }
      }

      if (!detectedMonth) detectedMonth = format(new Date(), 'yyyy-MM');
      setHeaderMonth(detectedMonth);

      const result: ParsedTransaction[] = [];
      for (let i = 2; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 4) continue;

        let date: Date;
        if (typeof cols[0] === 'number') {
          date = new Date((cols[0] - 25569) * 86400 * 1000 + (12 * 3600 * 1000));
        } else {
          const dateParts = cols[0].toString().split('/');
          if (dateParts.length === 3) {
            date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]), 12, 0, 0);
          } else {
            date = new Date(cols[0]);
            date.setHours(12, 0, 0, 0);
          }
        }

        if (!date || isNaN(date.getTime())) continue;

        const description = cols[1]?.toString() || "";
        const userName = cols[2]?.toString() || "";
        const rawValue = cols[3];
        let rawAmount = 0;

        if (typeof rawValue === 'number') rawAmount = rawValue;
        else {
          const strValue = rawValue?.toString() || "0";
          const cleanValue = strValue.replace('R$', '').trim();
          rawAmount = cleanValue.includes(',') ? parseFloat(cleanValue.replace(/\./g, '').replace(',', '.')) : parseFloat(cleanValue);
        }

        const isRefund = rawAmount < 0;
        const amount = Math.abs(rawAmount);
        const installmentStr = cols[4]?.toString() || '';

        if (isNaN(amount) || amount === 0) continue;

        let installments;
        if (installmentStr.includes('/')) {
          const [curr, total] = installmentStr.split('/').map(Number);
          if (!isNaN(curr) && !isNaN(total)) installments = { current: curr, total };
        }

        const matchedUserId = users.find(u => normalize(u.name).includes(normalize(userName)) || normalize(userName).includes(normalize(u.name)))?.id || currentUser?.id;
        let targetAccountId = '';
        if (importType === 'account' && matchedUserId) targetAccountId = findUserAccount(matchedUserId);

        const transactionType: TransactionType = isRefund ? 'REFUND' : (importType === 'card' ? 'CREDIT' : 'EXPENSE');
        const suggestedCategoryId = suggestCategory(description, transactionType);
        
        result.push({
          date, description, amount, userName,
          type: transactionType,
          matchedUserId, targetAccountId, suggestedCategoryId, installments
        });
      }

      setParsedData(result);
      toast({ title: 'Arquivo processado!', description: `${result.length} itens encontrados.` });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao processar arquivo', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (importType === 'card' && !globalTargetId) {
      toast({ title: 'Erro', description: 'Selecione o cartão de destino', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      for (const item of parsedData) {
        const groupId = item.installments ? generateId() : null;
        const startInstallment = item.installments?.current || 1;
        const totalInstallments = item.installments?.total || 1;
        
        const finalAccountId = importType === 'account' ? (item.targetAccountId || findUserAccount(currentUser?.id || '')) : null;
        const finalCardId = importType === 'card' ? globalTargetId : null;

        for (let i = 0; i <= (totalInstallments - startInstallment); i++) {
          const currentInstallmentNum = startInstallment + i;
          const dateForIteration = addMonths(item.date, i);
          
          let effectiveMonthStr = format(dateForIteration, 'yyyy-MM');
          let currentMesFatura = null;

          if (importType === 'card' && finalCardId) {
            currentMesFatura = calculateMesFatura(dateForIteration, finalCardId);
            effectiveMonthStr = currentMesFatura;
          }

          await createTransaction({
            type: item.type,
            amount: item.amount,
            description: item.description,
            purchaseDate: dateForIteration,
            effectiveDate: dateForIteration,
            effectiveMonth: effectiveMonthStr,
            mes_fatura: currentMesFatura,
            status: 'confirmed',
            isPaid: false,
            userId: item.matchedUserId || currentUser?.id || '',
            accountId: finalAccountId,
            cardId: finalCardId,
            categoryId: item.suggestedCategoryId || '', // Usar a categoria sugerida
            installmentGroupId: groupId,
            installmentNumber: currentInstallmentNum,
            totalInstallments: totalInstallments,
            notes: `Importado: ${item.userName}`,
            isRecurring: false
          });
        }
      }

      toast({ title: 'Importação concluída!' });
      setParsedData([]);
      setHeaderMonth('');
      setFileName('');
      await refresh();
    } catch (error) {
      toast({ title: 'Erro ao importar', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Lançamentos</h1>
        <p className="text-muted-foreground">Importe gastos do cartão ou débito via Excel (.xlsx) ou CSV</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <Tabs value={importType} onValueChange={(v: any) => { setImportType(v); setGlobalTargetId(''); setParsedData([]); }}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="card" className="gap-2"><CreditCard className="h-4 w-4" /> Cartão de Crédito</TabsTrigger>
              <TabsTrigger value="account" className="gap-2"><Wallet className="h-4 w-4" /> Conta (Débito/Carnê)</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {importType === 'card' ? (
              <div className="space-y-2">
                <Label>Cartão de Destino</Label>
                <Select value={globalTargetId} onValueChange={setGlobalTargetId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                  <SelectContent>
                    {allCards.filter(c => !c.is_archived).map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg border border-dashed flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full"><Wallet className="h-5 w-5 text-primary" /></div>
                <div className="text-sm"><p className="font-bold">Seleção Automática</p><p className="text-muted-foreground">Lançamentos na <strong>Conta Corrente</strong> de cada usuário.</p></div>
              </div>
            )}
            <div className="flex items-end">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-10"><FileSpreadsheet className="mr-2 h-4 w-4" /> {fileName || 'Selecionar Excel ou CSV'}</Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
            </div>
          </div>

          {headerMonth && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Mês de Lançamento: <strong className="capitalize">{format(parse(headerMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: ptBR })}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Prévia ({parsedData.length} itens)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {parsedData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2"><span className="font-bold">{item.description}</span></div>
                    <div className="text-xs text-muted-foreground">{format(item.date, 'dd/MM/yyyy')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="h-5 text-[10px]">{users.find(u => u.id === item.matchedUserId)?.name || item.userName}</Badge>
                    <Badge variant="secondary" className="h-5 text-[10px]">{categories.find(c => c.id === item.suggestedCategoryId)?.name || 'Sem Categoria'}</Badge>
                    <span className={cn("font-bold", item.type === 'REFUND' ? "text-income" : "text-expense")}>R$ {item.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleImport} className="w-full mt-4 gradient-primary" disabled={isLoading}>Confirmar Importação</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}