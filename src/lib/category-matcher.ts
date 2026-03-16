import { Category, TransactionType } from '@/lib/db';

// Mapeamento de palavras-chave para nomes de categorias (normalizados)
const CATEGORY_KEYWORDS: Record<string, string> = {
  // Alimentação
  'ifood': 'restaurantes', 'uber eats': 'restaurantes', 'rappi': 'restaurantes', 'delivery': 'restaurantes',
  'koch': 'supermercado', 'giassi': 'supermercado', 'angeloni': 'supermercado', 'bistek': 'supermercado',
  'fort': 'supermercado', 'mercado': 'supermercado', 'supermercado': 'supermercado', 'açougue': 'supermercado',
  'restaurante': 'restaurantes', 'padaria': 'lanches / cafe', 'cafe': 'lanches / cafe', 'lanchonete': 'lanches / cafe',
  'bar': 'restaurantes', 'pizzaria': 'restaurantes',

  // Transporte
  'uber': 'uber / 99', '99app': 'uber / 99', 'taxi': 'uber / 99', 'onibus': 'transporte publico', 'metro': 'transporte publico',
  'posto': 'combustivel', 'gasolina': 'combustivel', 'etanol': 'combustivel', 'diesel': 'combustivel',
  'shell': 'combustivel', 'ipiranga': 'combustivel', 'br': 'combustivel', 'petrobras': 'combustivel',
  'manutencao carro': 'manutencao carro', 'oficina': 'manutencao carro', 'mecanico': 'manutencao carro',
  'seguro carro': 'seguro / ipva', 'ipva': 'seguro / ipva', 'dpvat': 'seguro / ipva',

  // Saúde
  'farmacia': 'farmacia', 'droga': 'farmacia', 'panvel': 'farmacia', 'raia': 'farmacia',
  'plano de saude': 'plano de saude', 'unimed': 'plano de saude', 'sulamerica': 'plano de saude',
  'medico': 'medicos / dentistas', 'dentista': 'medicos / dentistas', 'consulta': 'medicos / dentistas',
  'exame': 'medicos / dentistas', 'academia': 'academia / esportes', 'crossfit': 'academia / esportes',
  'natacao': 'academia / esportes', 'esporte': 'academia / esportes',

  // Moradia
  'aluguel': 'aluguel / prestacao', 'prestacao imovel': 'aluguel / prestacao', 'financiamento imovel': 'aluguel / prestacao',
  'condominio': 'condominio', 'energia': 'energia eletrica', 'luz': 'energia eletrica',
  'agua': 'agua / saneamento', 'saneamento': 'agua / saneamento', 'internet': 'internet / tv', 'net': 'internet / tv',
  'claro': 'internet / tv', 'vivo': 'internet / tv', 'tim': 'internet / tv', 'manutencao casa': 'manutencao casa',
  'reforma': 'manutencao casa', 'material construcao': 'manutencao casa',

  // Lazer & Estilo de Vida
  'netflix': 'streaming', 'spotify': 'streaming', 'amazon prime': 'streaming', 'disney+': 'streaming',
  'viagem': 'viagens', 'passagem aerea': 'viagens', 'hotel': 'viagens', 'airbnb': 'viagens',
  'cinema': 'cinema / eventos', 'teatro': 'cinema / eventos', 'show': 'cinema / eventos', 'evento': 'cinema / eventos',
  'beleza': 'beleza / higiene', 'cabeleireiro': 'beleza / higiene', 'estetica': 'beleza / higiene',
  'roupa': 'vestuario', 'sapato': 'vestuario', 'acessorios': 'vestuario',

  // Educação & Outros
  'curso': 'cursos / educacao', 'faculdade': 'cursos / educacao', 'livro': 'livros', 'papelaria': 'livros',
  'petshop': 'pets', 'veterinario': 'pets', 'racoes': 'pets',
  'presente': 'presentes / doacoes', 'doacao': 'presentes / doacoes',
  'tarifa bancaria': 'tarifas bancarias', 'juros': 'tarifas bancarias', 'multa': 'tarifas bancarias',
  'imposto': 'impostos', 'irpf': 'impostos', 'iptu': 'impostos',
  'pix': 'outras despesas', // PIX pode ser qualquer coisa, mas como fallback
  'transferencia': 'transferencia', // Categoria especial para transferências

  // Receitas
  'salario': 'salario', 'pagamento': 'salario', 'pro-labore': 'pro-labore',
  'dividendos': 'dividendos', 'juros recebidos': 'dividendos',
  'venda': 'vendas', 'comissao': 'vendas',
  'reembolso': 'reembolsos',
  'presente recebido': 'presentes',
};

function normalizeString(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function matchCategory(description: string, categories: Category[], transactionType: TransactionType): string | undefined {
  if (!description || !categories) {
    return undefined;
  }

  const lowerCaseDescription = normalizeString(description);
  
  // Criar um mapa de categorias normalizadas para busca eficiente
  const normalizedCategoryMap = new Map<string, Category>();
  categories.forEach(cat => {
    normalizedCategoryMap.set(normalizeString(cat.name), cat);
  });

  // Tentar encontrar categoria por palavra-chave
  for (const [keyword, normalizedCategoryName] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lowerCaseDescription.includes(keyword)) {
      const matchedCategory = normalizedCategoryMap.get(normalizedCategoryName);
      if (matchedCategory) {
        // Verificar se o tipo da categoria corresponde ao tipo da transação
        const isIncomeCategory = matchedCategory.type === 'income' || matchedCategory.kind === 'receita';
        const isExpenseCategory = matchedCategory.type === 'expense' || matchedCategory.kind === 'despesa';

        if ((transactionType === 'INCOME' && isIncomeCategory) ||
            (transactionType === 'EXPENSE' && isExpenseCategory) ||
            (transactionType === 'CREDIT' && isExpenseCategory) ||
            (transactionType === 'REFUND' && isIncomeCategory) ||
            (transactionType === 'TRANSFER' && (isIncomeCategory || isExpenseCategory))) { // Transferências podem ser ambas
          return matchedCategory.id;
        }
      }
    }
  }

  // Fallback para categorias genéricas se nenhuma for encontrada ou o tipo não corresponder
  let defaultCategoryName: string;
  if (transactionType === 'INCOME') {
    defaultCategoryName = 'outras receitas';
  } else if (transactionType === 'REFUND') {
    defaultCategoryName = 'reembolsos';
  } else if (transactionType === 'TRANSFER') {
    defaultCategoryName = 'transferencia';
  } else { // EXPENSE ou CREDIT
    defaultCategoryName = 'outras despesas';
  }

  const defaultCategory = normalizedCategoryMap.get(normalizeString(defaultCategoryName));
  if (defaultCategory) {
    return defaultCategory.id;
  }

  return undefined;
}