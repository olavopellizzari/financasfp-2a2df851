// Seed data for initial app setup
import { db, generateId, Category, Tag } from './db';

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  // --- RECEITAS (Diferenciadas) ---
  { name: 'Salário Mensal', icon: '💰', color: '#22c55e', type: 'income', parentId: null, isSystem: true },
  { name: 'Pró-Labore', icon: '👔', color: '#16a34a', type: 'income', parentId: null, isSystem: true },
  { name: 'Dividendos & JCP', icon: '📈', color: '#0ea5e9', type: 'income', parentId: null, isSystem: true },
  { name: 'Rendimentos de FIIs', icon: '🏢', color: '#0284c7', type: 'income', parentId: null, isSystem: true },
  { name: 'Vendas (E-commerce)', icon: '📦', color: '#f59e0b', type: 'income', parentId: null, isSystem: true },
  { name: 'Freelance Design/Dev', icon: '💻', color: '#8b5cf6', type: 'income', parentId: null, isSystem: true },
  { name: 'Restituição de Impostos', icon: '🏛️', color: '#4f46e5', type: 'income', parentId: null, isSystem: true },
  { name: 'Cashback & Recompensas', icon: '🪙', color: '#fbbf24', type: 'income', parentId: null, isSystem: true },
  { name: 'Aluguéis Recebidos', icon: '🔑', color: '#10b981', type: 'income', parentId: null, isSystem: true },
  { name: 'Prêmios e Sorteios', icon: '🏆', color: '#facc15', type: 'income', parentId: null, isSystem: true },

  // --- DESPESAS (Categorias Específicas) ---
  // Moradia & Contas
  { name: 'Aluguel / Hipoteca', icon: '🏠', color: '#ef4444', type: 'expense', parentId: null, isSystem: true },
  { name: 'Condomínio & Taxas', icon: '🏢', color: '#f87171', type: 'expense', parentId: null, isSystem: true },
  { name: 'Energia (Luz)', icon: '⚡', color: '#fbbf24', type: 'expense', parentId: null, isSystem: true },
  { name: 'Saneamento (Água)', icon: '💧', color: '#60a5fa', type: 'expense', parentId: null, isSystem: true },
  { name: 'Gás Encanado/Botijão', icon: '🔥', color: '#f97316', type: 'expense', parentId: null, isSystem: true },
  { name: 'Internet Fibra', icon: '🌐', color: '#818cf8', type: 'expense', parentId: null, isSystem: true },
  
  // Alimentação
  { name: 'Supermercado Mensal', icon: '🛒', color: '#f97316', type: 'expense', parentId: null, isSystem: true },
  { name: 'Restaurantes & Jantares', icon: '🍽️', color: '#c2410c', type: 'expense', parentId: null, isSystem: true },
  { name: 'Delivery (iFood/Rappi)', icon: '🛵', color: '#ea580c', type: 'expense', parentId: null, isSystem: true },
  { name: 'Cafés & Lanches', icon: '☕', color: '#78350f', type: 'expense', parentId: null, isSystem: true },
  
  // Transporte
  { name: 'Combustível (Gasolina)', icon: '⛽', color: '#b91c1c', type: 'expense', parentId: null, isSystem: true },
  { name: 'Apps (Uber/99)', icon: '🚗', color: '#1f2937', type: 'expense', parentId: null, isSystem: true },
  { name: 'Manutenção Mecânica', icon: '🔧', color: '#475569', type: 'expense', parentId: null, isSystem: true },
  { name: 'Seguro Automotivo', icon: '🛡️', color: '#0ea5e9', type: 'expense', parentId: null, isSystem: true },
  
  // Saúde & Bem-estar
  { name: 'Farmácia & Remédios', icon: '💊', color: '#ec4899', type: 'expense', parentId: null, isSystem: true },
  { name: 'Plano de Saúde/Odonto', icon: '🏥', color: '#db2777', type: 'expense', parentId: null, isSystem: true },
  { name: 'Academia & Crossfit', icon: '💪', color: '#4ade80', type: 'expense', parentId: null, isSystem: true },
  { name: 'Terapia & Psicologia', icon: '🧠', color: '#8b5cf6', type: 'expense', parentId: null, isSystem: true },
  
  // Lazer & Estilo de Vida
  { name: 'Streaming (Netflix/HBO)', icon: '📺', color: '#e11d48', type: 'expense', parentId: null, isSystem: true },
  { name: 'Jogos & Assinaturas PC', icon: '🎮', color: '#8b5cf6', type: 'expense', parentId: null, isSystem: true },
  { name: 'Viagens & Hospedagem', icon: '✈️', color: '#06b6d4', type: 'expense', parentId: null, isSystem: true },
  { name: 'Cinema & Eventos', icon: '🍿', color: '#f43f5e', type: 'expense', parentId: null, isSystem: true },
  { name: 'Beleza (Cabelo/Unha)', icon: '💅', color: '#d946ef', type: 'expense', parentId: null, isSystem: true },
  
  // Educação & Outros
  { name: 'Cursos & Mentorias', icon: '🎓', color: '#3b82f6', type: 'expense', parentId: null, isSystem: true },
  { name: 'Livros & Kindle', icon: '📖', color: '#1d4ed8', type: 'expense', parentId: null, isSystem: true },
  { name: 'Pets (Ração/Vet)', icon: '🐾', color: '#b45309', type: 'expense', parentId: null, isSystem: true },
  { name: 'Presentes & Doações', icon: '🎁', color: '#f43f5e', type: 'expense', parentId: null, isSystem: true },
  { name: 'Tarifas & Impostos', icon: '💸', color: '#64748b', type: 'expense', parentId: null, isSystem: true },
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