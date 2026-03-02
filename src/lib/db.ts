// IndexedDB Wrapper with Schema Versioning and Migrations
export const DB_NAME = 'FinancasDB';
export const DB_VERSION = 3; 

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  is_admin: boolean;
  is_active: boolean;
  family_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  kind?: string;
  parentId?: string | null;
  isSystem?: boolean;
  createdAt?: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt?: Date;
}

export interface Card {
  id: string;
  user_id: string;
  household_id: string;
  responsible_user_id: string;
  default_account_id: string;
  name: string;
  last_digits: string;
  brand: string;
  limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  is_archived: boolean;
  created_at: Date;
}

export interface Account {
  id: string;
  household_id: string;
  user_id?: string;
  name: string;
  bank?: string; 
  account_type: 'corrente' | 'poupanca' | 'investimento' | 'carteira';
  opening_balance: number;
  opening_date: string;
  active: boolean;
  is_shared: boolean;
  exclude_from_totals?: boolean;
  created_at: Date;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CREDIT' | 'REFUND';
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  purchaseDate: string;
  effectiveDate: string;
  effectiveMonth: string;
  mesFatura: string | null;
  status: TransactionStatus;
  isPaid: boolean;
  userId: string;
  accountId: string | null;
  cardId: string | null;
  categoryId: string;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  notes: string;
  isRecurring: boolean;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
  dueDate?: Date;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  actorUserId: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'pay_invoice' | 'login' | 'logout' | 'export' | 'backup';
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  meta?: any;
}

export interface Budget {
  id: string;
  user_id: string;
  month: string;
  income: number;
  expenses?: number;
  savings_goal: number;
  cycle_end_day?: number;
  category_limits: Record<string, number>;
  created_at: Date;
  updatedAt?: Date;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  is_completed: boolean;
  created_at: Date;
}

export interface Invoice {
  id: string;
  card_id: string;
  month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'open' | 'closed' | 'paid' | 'partial';
  paid_from_account_id: string | null;
  paid_at: string | null;
}

export interface CycleSnapshot {
  id: string;
  month: string;
  day: number;
  userId: string;
  totalBalance: number;
  savingsGoal?: number;
  accountBalances?: Record<string, number>;
  createdAt: Date;
}

export interface Debt {
  id: string;
  user_id: string | null;
  household_id: string;
  name: string;
  total_amount: number;
  paid_amount: number;
  interest_rate: number;
  start_date: string;
  due_date: string;
  monthly_payment: number;
  installments_count?: number;
  frequency?: 'monthly' | 'semiannual' | 'annual';
  is_active: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
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
        
        const stores = [
          'cycleSnapshots', 
          'auditLogs', 
          'notifications', 
          'settings', 
          'tags', 
          'users', 
          'accounts', 
          'cards', 
          'categories', 
          'transactions', 
          'invoices', 
          'budgets', 
          'goals', 
          'debts'
        ];

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
    return this.dbPromise;
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

  async add<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    return this.put(storeName, data);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
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
}

export const db = new FinancasDB();

export function generateId(): string { 
  return crypto.randomUUID(); 
}

export function getCurrentMonth(): string { 
  const now = new Date(); 
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; 
}

export function formatCurrency(value: number, currency = 'BRL'): string { 
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value); 
}