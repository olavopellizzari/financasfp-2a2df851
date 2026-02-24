// IndexedDB Wrapper with Schema Versioning and Migrations
export const DB_NAME = 'FinancasDB';
export const DB_VERSION = 2;

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  passwordHash: string;
  salt: string;
  isAdmin: boolean;
  isActive: boolean;
  familyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  userId: string;
  responsibleUserId: string;
  defaultAccountId: string;
  name: string;
  lastDigits: string;
  brand: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  isShared: boolean;
  sharedWithUserIds: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardCycleOverride {
  id: string;
  cardId: string;
  month: string; // yyyy-MM
  closingDay: number;
  dueDay: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'wallet';
  balance: number;
  currency: string;
  color: string;
  icon: string;
  isArchived: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CREDIT' | 'REFUND';
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  purchaseDate: Date;
  effectiveDate: Date;
  effectiveMonth: string;
  mesFatura: string | null;
  status: TransactionStatus;
  isPaid: boolean;
  userId: string;
  accountId: string | null;
  cardId: string | null;
  invoiceId: string | null;
  categoryId: string;
  merchantId: string | null;
  tagIds: string[];
  installmentGroupId: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  notes: string;
  importBatchId: string | null;
  isRecurring: boolean;
  recurrenceType: 'monthly' | 'annual' | null;
  recurrenceCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  month: string;
  income: number;
  expenses: number;
  savingsGoal: number;
  cycleEndDay: number;
  categoryLimits: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  icon: string;
  color: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  cardId: string;
  userId: string | null;
  month: string;
  closingDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: 'open' | 'closed' | 'paid' | 'partial';
  paidFromAccountId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  actorUserId: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'pay_invoice' | 'login' | 'logout' | 'export' | 'backup';
  entityType: string;
  entityId: string;
  before: any;
  after: any;
  meta: Record<string, any>;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  parentId: string | null;
  isSystem: boolean;
  createdAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CycleSnapshot {
  id: string;
  month: string;
  day: number;
  userId: string | null;
  totalBalance: number;
  savingsGoal: number;
  accountBalances: Record<string, number>;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'card_due' | 'debt_due' | 'recurring' | 'cycle_reminder' | 'general';
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  dueDate: Date | null;
  isRead: boolean;
  createdAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  interestRate: number;
  startDate: Date;
  dueDate: Date;
  monthlyPayment: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id: string;
  currentUserId: string | null;
  isLocked: boolean;
  lastBackupAt: Date | null;
  autoBackupEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  locale: string;
}

export interface ImportBatch {
  id: string;
  userId: string;
  source: 'csv' | 'ofx' | 'pdf';
  fileName: string;
  totalRecords: number;
  importedRecords: number;
  duplicatesSkipped: number;
  importedAt: Date;
}

class FinancasDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(this.db); };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.runMigrations(db);
      };
    });
    return this.dbPromise;
  }

  private runMigrations(db: IDBDatabase) {
    const stores = [
      { name: 'users', options: { keyPath: 'id' }, index: { name: 'email', key: 'email', options: { unique: true } } },
      { name: 'accounts', options: { keyPath: 'id' }, index: { name: 'userId', key: 'userId' } },
      { name: 'cards', options: { keyPath: 'id' }, index: { name: 'userId', key: 'userId' } },
      { name: 'categories', options: { keyPath: 'id' } },
      { name: 'tags', options: { keyPath: 'id' } },
      { name: 'merchants', options: { keyPath: 'id' } },
      { name: 'transactions', options: { keyPath: 'id' }, indexes: [
        { name: 'userId', key: 'userId' },
        { name: 'effectiveMonth', key: 'effectiveMonth' },
        { name: 'installmentGroupId', key: 'installmentGroupId' }
      ]},
      { name: 'invoices', options: { keyPath: 'id' } },
      { name: 'budgets', options: { keyPath: 'id' } },
      { name: 'goals', options: { keyPath: 'id' } },
      { name: 'auditLogs', options: { keyPath: 'id' } },
      { name: 'cycleSnapshots', options: { keyPath: 'id' } },
      { name: 'notifications', options: { keyPath: 'id' } },
      { name: 'debts', options: { keyPath: 'id' } },
      { name: 'settings', options: { keyPath: 'id' } },
      { name: 'importBatches', options: { keyPath: 'id' } },
      { name: 'cardCycleOverrides', options: { keyPath: 'id' } }
    ];

    stores.forEach(store => {
      if (!db.objectStoreNames.contains(store.name)) {
        const os = db.createObjectStore(store.name, store.options);
        if (store.index) {
          os.createIndex(store.index.name, store.index.key, store.index.options);
        }
        if (store.indexes) {
          store.indexes.forEach(idx => os.createIndex(idx.name, idx.key));
        }
      }
    });
  }

  async add<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).add(data);
      tx.oncomplete = () => resolve(data);
      tx.onerror = () => reject(tx.error);
    });
  }

  async put<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(data);
      tx.oncomplete = () => resolve(data);
      tx.onerror = () => reject(tx.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async exportAll(): Promise<Record<string, any[]>> {
    const stores = ['users', 'accounts', 'cards', 'categories', 'tags', 'transactions', 'invoices', 'budgets', 'goals', 'debts', 'settings', 'cardCycleOverrides'];
    const result: Record<string, any[]> = {};
    for (const store of stores) {
      result[store] = await this.getAll(store);
    }
    return result;
  }

  async importAll(data: Record<string, any[]>, clearFirst = true): Promise<void> {
    for (const [store, items] of Object.entries(data)) {
      if (clearFirst) await this.clear(store);
      for (const item of items) {
        await this.put(store, item);
      }
    }
  }
}

export const db = new FinancasDB();

export function generateId(): string { 
  // Usando UUID nativo para compatibilidade total com Supabase
  return crypto.randomUUID(); 
}

export function getCurrentMonth(): string { 
  const now = new Date(); 
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; 
}

export function formatCurrency(value: number, currency = 'BRL'): string { 
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value); 
}