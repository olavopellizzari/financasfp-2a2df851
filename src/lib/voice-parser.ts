import { TransactionType } from './db';

interface ParsedVoiceData {
  amount: number | null;
  description: string;
  type: TransactionType;
}

export function parseVoiceCommand(text: string): ParsedVoiceData {
  const normalized = text.toLowerCase();
  
  // 1. Identificar o Tipo
  let type: TransactionType = 'EXPENSE';
  const incomeKeywords = ['recebi', 'ganhei', 'salario', 'vendi', 'receita', 'pix de', 'entrada'];
  const transferKeywords = ['transferi', 'transferencia', 'mandei para'];
  
  if (incomeKeywords.some(k => normalized.includes(k))) {
    type = 'INCOME';
  } else if (transferKeywords.some(k => normalized.includes(k))) {
    type = 'TRANSFER';
  }

  // 2. Extrair Valor (busca números no texto)
  // Lida com "50", "50.00", "50,00", "R$ 50"
  const amountMatch = normalized.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

  // 3. Extrair Descrição
  // Remove palavras de comando e o valor para sobrar a descrição
  let description = normalized
    .replace(/r\$/g, '')
    .replace(/reais/g, '')
    .replace(/centavos/g, '')
    .replace(amount?.toString() || '', '')
    .replace(/gastei|recebi|ganhei|paguei|no|na|com|de|para/g, '')
    .trim();

  // Capitalizar primeira letra
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return {
    amount,
    description: description || 'Lançamento por Voz',
    type
  };
}