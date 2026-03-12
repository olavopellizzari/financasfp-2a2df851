// Seed data for initial app setup
import { db, generateId, Category, Tag } from './db';

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  // --- RECEITAS ---
  { name: 'Salário', icon: '💰', color: '#22c55e', type: 'income', kind: 'receita', isSystem: true },
  { name: 'Pró-Labore', icon: '👔', color: '#16a34a', type: 'income', kind: 'receita', isSystem: true },
  { name: 'Dividendos', icon: '📈', color: '#3b82f6', type: 'income', kind: 'receita', isSystem: true },
  { name: 'Vendas', icon: '📦', color: '#f59e0b', type: 'income', kind: 'receita', isSystem: true },
  { name: 'Reembolsos', icon: '↩️', color: '#10b981', type: 'income', kind: 'receita', isSystem: true },
  { name: 'Presentes', icon: '🎁', color: '#ec4899', type: 'income', kind: 'receita', isSystem: true },
  { name: 'Outras Receitas', icon: '💵', color: '#94a3b8', type: 'income', kind: 'receita', isSystem: true },

  // --- DESPESAS ---
  // Moradia
  { name: 'Aluguel / Prestação', icon: '🏠', color: '#ef4444', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Condomínio', icon: '🏢', color: '#f87171', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Energia Elétrica', icon: '⚡', color: '#fbbf24', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Água / Saneamento', icon: '💧', color: '#60a5fa', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Internet / TV', icon: '🌐', color: '#818cf8', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Manutenção Casa', icon: '🔧', color: '#475569', type: 'expense', kind: 'despesa', isSystem: true },
  
  // Alimentação
  { name: 'Supermercado', icon: '🛒', color: '#f97316', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Restaurantes', icon: '🍽️', color: '#c2410c', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Delivery', icon: '🛵', color: '#ea580c', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Lanches / Café', icon: '☕', color: '#78350f', type: 'expense', kind: 'despesa', isSystem: true },
  
  // Transporte
  { name: 'Combustível', icon: '⛽', color: '#b91c1c', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Uber / 99', icon: '🚗', color: '#1f2937', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Manutenção Carro', icon: '🛠️', color: '#64748b', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Seguro / IPVA', icon: '🛡️', color: '#0ea5e9', type: 'expense', kind: 'despesa', isSystem: true },
  
  // Saúde
  { name: 'Farmácia', icon: '💊', color: '#ec4899', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Plano de Saúde', icon: '🏥', color: '#db2777', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Médicos / Dentistas', icon: '🩺', color: '#be185d', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Academia / Esportes', icon: '💪', color: '#4ade80', type: 'expense', kind: 'despesa', isSystem: true },
  
  // Lazer & Estilo de Vida
  { name: 'Streaming', icon: '📺', color: '#e11d48', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Viagens', icon: '✈️', color: '#06b6d4', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Cinema / Eventos', icon: '🍿', color: '#f43f5e', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Beleza / Higiene', icon: '💅', color: '#d946ef', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Vestuário', icon: '👕', color: '#6366f1', type: 'expense', kind: 'despesa', isSystem: true },
  
  // Educação & Outros
  { name: 'Cursos / Educação', icon: '🎓', color: '#3b82f6', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Livros', icon: '📖', color: '#1d4ed8', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Pets', icon: '🐾', color: '#b45309', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Presentes / Doações', icon: '🎁', color: '#f43f5e', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Tarifas Bancárias', icon: '💸', color: '#64748b', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Impostos', icon: '🏛️', color: '#475569', type: 'expense', kind: 'despesa', isSystem: true },
  { name: 'Outras Despesas', icon: '❓', color: '#94a3b8', type: 'expense', kind: 'despesa', isSystem: true },

  // --- SISTEMA ---
  { name: 'Transferência', icon: '🔄', color: '#6366f1', type: 'expense', kind: 'cartao', isSystem: true },
];

const DEFAULT_TAGS: Omit<Tag, 'id' | 'createdAt'>[] = [
  { name: 'Essencial', color: '#22c55e' },
  { name: 'Lazer', color: '#3b82f6' },
  { name: 'Investimento', color: '#8b5cf6' },
  { name: 'Urgente', color: '#ef4444' },
];

export async function seedDatabase(): Promise<void> {
  const existingCategories = await db.getAll<Category>('categories');
  if (existingCategories.length > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    await db.add('categories', { ...cat, id: generateId(), createdAt: new Date() });
  }

  for (const tag of DEFAULT_TAGS) {
    await db.add('tags', { ...tag, id: generateId(), createdAt: new Date() });
  }

  await db.put('settings', {
    id: 'app-settings',
    currentUserId: null,
    isLocked: false,
    lastBackupAt: null,
    autoBackupEnabled: true,
    theme: 'light',
    currency: 'BRL',
    locale: 'pt-BR',
  });
}

export async function reseedCategories(): Promise<void> {
  await db.clear('categories');
  for (const cat of DEFAULT_CATEGORIES) {
    await db.add('categories', { ...cat, id: generateId(), createdAt: new Date() });
  }
}

export async function resetDatabase(): Promise<void> {
  const storeNames = [
    'users', 'accounts', 'cards', 'categories', 'tags', 'merchants',
    'transactions', 'installmentGroups', 'invoices', 'cardCycleOverrides',
    'importBatches', 'budgets', 'goals', 'auditLogs', 'monthSnapshots',
    'settings', 'backups'
  ];

  for (const store of storeNames) {
    try { await db.clear(store); } catch (e) {}
  }

  await seedDatabase();
}