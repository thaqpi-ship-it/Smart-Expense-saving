import { Category, FinancialRule, SavingsGoal, SavingsRecord, Transaction } from '../types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_FINANCIAL_RULE,
  DEFAULT_SAVINGS_GOALS,
  INITIAL_SAVINGS_RECORDS,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';

const STORAGE_KEYS = {
  TRANSACTIONS: 'smart_tracker_transactions_prod_v1',
  CATEGORIES: 'smart_tracker_categories_prod_v1',
  SAVINGS_GOALS: 'smart_tracker_savings_prod_v1',
  SAVINGS_RECORDS: 'smart_tracker_savings_records_prod_v1',
  FINANCIAL_RULE: 'smart_tracker_financial_rule_prod_v1',
  CURRENCY: 'smart_tracker_currency_prod_v1',
  FILTER_YEAR: 'smart_tracker_filter_year_v1',
  FILTER_MONTH: 'smart_tracker_filter_month_v1',
};

// --- Timezone-safe Date Utilities ---
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  if (!dateStr) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  }
  // YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed month
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { year: y, month: m, day: d };
    }
  }
  const fallback = new Date(dateStr);
  return { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() };
}

// --- IndexedDB Dual-Layer Backup Engine ---
const IDB_NAME = 'SmartTrackerBackupDB';
const IDB_STORE = 'app_state';
const IDB_VERSION = 1;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ key, value, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Non-blocking silently on failure
    console.debug('IDB backup save notice:', e);
  }
}

async function getFromIndexedDB(key: string): Promise<any | null> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// --- Transaction Persistence ---
export function loadTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      return INITIAL_TRANSACTIONS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      // Filter out stale mock test items safely without wiping genuine user transactions
      const cleaned = parsed.filter((t) => t.id !== 'tx-1' && t.id !== 'tx-savings-1');
      if (cleaned.length !== parsed.length) {
        saveTransactions(cleaned);
      }
      return cleaned;
    }
    return INITIAL_TRANSACTIONS;
  } catch (e) {
    console.error('Failed to load transactions:', e);
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    // Asynchronous dual backup into IndexedDB
    saveToIndexedDB('transactions', transactions);
  } catch (e) {
    console.error('Failed to save transactions:', e);
  }
}

// --- Categories Persistence ---
export function loadCategories(): Category[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Failed to load categories:', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    saveToIndexedDB('categories', categories);
  } catch (e) {
    console.error('Failed to save categories:', e);
  }
}

// --- Savings Goals Persistence ---
export function loadSavingsGoals(): SavingsGoal[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS);
    if (!data) {
      saveSavingsGoals(DEFAULT_SAVINGS_GOALS);
      return DEFAULT_SAVINGS_GOALS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SAVINGS_GOALS;
  } catch (e) {
    console.error('Failed to load savings goals:', e);
    return DEFAULT_SAVINGS_GOALS;
  }
}

export function saveSavingsGoals(goals: SavingsGoal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(goals));
    saveToIndexedDB('savings_goals', goals);
  } catch (e) {
    console.error('Failed to save savings goals:', e);
  }
}

// --- Savings Records Persistence ---
export function loadSavingsRecords(): SavingsRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_RECORDS);
    if (!data) {
      return INITIAL_SAVINGS_RECORDS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((r) => r.id !== 'rec-1' && r.id !== 'rec-9');
      if (cleaned.length !== parsed.length) {
        saveSavingsRecords(cleaned);
      }
      return cleaned;
    }
    return INITIAL_SAVINGS_RECORDS;
  } catch (e) {
    console.error('Failed to load savings records:', e);
    return INITIAL_SAVINGS_RECORDS;
  }
}

export function saveSavingsRecords(records: SavingsRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_RECORDS, JSON.stringify(records));
    saveToIndexedDB('savings_records', records);
  } catch (e) {
    console.error('Failed to save savings records:', e);
  }
}

// --- Financial Rule Persistence ---
export function loadFinancialRule(): FinancialRule {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FINANCIAL_RULE);
    if (!data) {
      saveFinancialRule(DEFAULT_FINANCIAL_RULE);
      return DEFAULT_FINANCIAL_RULE;
    }
    const parsed = JSON.parse(data);
    if (
      typeof parsed.savingsPercent === 'number' &&
      typeof parsed.needsPercent === 'number' &&
      typeof parsed.wantsPercent === 'number'
    ) {
      return parsed;
    }
    return DEFAULT_FINANCIAL_RULE;
  } catch (e) {
    console.error('Failed to load financial rule:', e);
    return DEFAULT_FINANCIAL_RULE;
  }
}

export function saveFinancialRule(rule: FinancialRule): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FINANCIAL_RULE, JSON.stringify(rule));
    saveToIndexedDB('financial_rule', rule);
  } catch (e) {
    console.error('Failed to save financial rule:', e);
  }
}

// --- Date Filter Persistence (Remembers Selected Month & Year across Sessions) ---
export function loadStoredDateFilter(): { year: number; month: number } | null {
  try {
    const yStr = localStorage.getItem(STORAGE_KEYS.FILTER_YEAR);
    const mStr = localStorage.getItem(STORAGE_KEYS.FILTER_MONTH);
    if (yStr !== null && mStr !== null) {
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      if (!isNaN(year) && !isNaN(month)) {
        return { year, month };
      }
    }
  } catch (e) {
    console.debug('Failed to load stored date filter:', e);
  }
  return null;
}

export function saveStoredDateFilter(year: number, month: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTER_YEAR, year.toString());
    localStorage.setItem(STORAGE_KEYS.FILTER_MONTH, month.toString());
  } catch (e) {
    console.debug('Failed to save date filter:', e);
  }
}

// --- Automatic Recovery from IndexedDB (If LocalStorage Was Purged by Browser or iFrame) ---
export async function attemptRestoreFromIndexedDB(): Promise<{
  transactions?: Transaction[];
  categories?: Category[];
  goals?: SavingsGoal[];
  savingsRecords?: SavingsRecord[];
  financialRule?: FinancialRule;
} | null> {
  try {
    const txs = await getFromIndexedDB('transactions');
    const cats = await getFromIndexedDB('categories');
    const goals = await getFromIndexedDB('savings_goals');
    const recs = await getFromIndexedDB('savings_records');
    const rule = await getFromIndexedDB('financial_rule');

    if ((Array.isArray(txs) && txs.length > 0) || (Array.isArray(goals) && goals.length > 0)) {
      if (Array.isArray(txs) && txs.length > 0) saveTransactions(txs);
      if (Array.isArray(cats) && cats.length > 0) saveCategories(cats);
      if (Array.isArray(goals) && goals.length > 0) saveSavingsGoals(goals);
      if (Array.isArray(recs) && recs.length > 0) saveSavingsRecords(recs);
      if (rule) saveFinancialRule(rule);

      return {
        transactions: Array.isArray(txs) ? txs : undefined,
        categories: Array.isArray(cats) ? cats : undefined,
        goals: Array.isArray(goals) ? goals : undefined,
        savingsRecords: Array.isArray(recs) ? recs : undefined,
        financialRule: rule || undefined,
      };
    }
  } catch (e) {
    console.debug('IDB recovery attempt error:', e);
  }
  return null;
}

// --- Full Database Export & Import (JSON Backup File) ---
export interface AppBackupData {
  version: string;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  savingsRecords: SavingsRecord[];
  financialRule: FinancialRule;
}

export function exportBackupJSON(): string {
  const data: AppBackupData = {
    version: '2.5',
    exportedAt: new Date().toISOString(),
    transactions: loadTransactions(),
    categories: loadCategories(),
    savingsGoals: loadSavingsGoals(),
    savingsRecords: loadSavingsRecords(),
    financialRule: loadFinancialRule(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupJSON(jsonString: string): {
  success: boolean;
  data?: {
    transactions: Transaction[];
    categories: Category[];
    savingsGoals: SavingsGoal[];
    savingsRecords: SavingsRecord[];
    financialRule: FinancialRule;
  };
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง (Invalid JSON)' };
    }

    const txs: Transaction[] = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const cats: Category[] = Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES;
    const goals: SavingsGoal[] = Array.isArray(parsed.savingsGoals) && parsed.savingsGoals.length > 0 ? parsed.savingsGoals : DEFAULT_SAVINGS_GOALS;
    const records: SavingsRecord[] = Array.isArray(parsed.savingsRecords) ? parsed.savingsRecords : [];
    const rule: FinancialRule = parsed.financialRule && typeof parsed.financialRule.savingsPercent === 'number'
      ? parsed.financialRule
      : DEFAULT_FINANCIAL_RULE;

    saveTransactions(txs);
    saveCategories(cats);
    saveSavingsGoals(goals);
    saveSavingsRecords(records);
    saveFinancialRule(rule);

    return {
      success: true,
      data: {
        transactions: txs,
        categories: cats,
        savingsGoals: goals,
        savingsRecords: records,
        financialRule: rule,
      },
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'ไม่สามารถอ่านไฟล์ JSON ได้' };
  }
}

// --- Reset Data ---
export function resetAllData(): {
  transactions: Transaction[];
  categories: Category[];
  goals: SavingsGoal[];
  savingsRecords: SavingsRecord[];
  financialRule: FinancialRule;
} {
  saveTransactions(INITIAL_TRANSACTIONS);
  saveCategories(DEFAULT_CATEGORIES);
  saveSavingsGoals(DEFAULT_SAVINGS_GOALS);
  saveSavingsRecords(INITIAL_SAVINGS_RECORDS);
  saveFinancialRule(DEFAULT_FINANCIAL_RULE);

  // Clear legacy keys
  try {
    localStorage.removeItem('smart_tracker_transactions_th_v2');
    localStorage.removeItem('smart_tracker_savings_records_th_v2');
    localStorage.removeItem('smart_tracker_savings_th_v2');
  } catch {}

  return {
    transactions: INITIAL_TRANSACTIONS,
    categories: DEFAULT_CATEGORIES,
    goals: DEFAULT_SAVINGS_GOALS,
    savingsRecords: INITIAL_SAVINGS_RECORDS,
    financialRule: DEFAULT_FINANCIAL_RULE,
  };
}

export function formatCurrency(amount: number, currency = '฿'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
