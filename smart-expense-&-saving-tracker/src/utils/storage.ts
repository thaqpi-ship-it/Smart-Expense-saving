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
};

export function loadTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      saveTransactions(INITIAL_TRANSACTIONS);
      return INITIAL_TRANSACTIONS;
    }
    const parsed = JSON.parse(data);
    // ตรวจสอบว่าไม่มี mock transaction ค้างอยู่
    if (Array.isArray(parsed) && parsed.some((t) => t.id === 'tx-1' || t.id === 'tx-savings-1')) {
      saveTransactions(INITIAL_TRANSACTIONS);
      return INITIAL_TRANSACTIONS;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load transactions:', e);
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions:', e);
  }
}

export function loadCategories(): Category[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load categories:', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories:', e);
  }
}

export function loadSavingsGoals(): SavingsGoal[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS);
    if (!data) {
      saveSavingsGoals(DEFAULT_SAVINGS_GOALS);
      return DEFAULT_SAVINGS_GOALS;
    }
    const parsed = JSON.parse(data);
    // หากมีข้อมูลเก่าที่มี currentAmount ค้างจากชุดทดสอบ ให้คลีนกลับเป็น 0 สำหรับเป้าหมายเริ่มต้น
    if (Array.isArray(parsed) && parsed.some((g) => g.id === 'goal-1' && g.currentAmount > 0 && loadTransactions().length === 0)) {
      const resetGoals = parsed.map((g) => ({ ...g, currentAmount: 0 }));
      saveSavingsGoals(resetGoals);
      return resetGoals;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load savings goals:', e);
    return DEFAULT_SAVINGS_GOALS;
  }
}

export function saveSavingsGoals(goals: SavingsGoal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(goals));
  } catch (e) {
    console.error('Failed to save savings goals:', e);
  }
}

export function loadSavingsRecords(): SavingsRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_RECORDS);
    if (!data) {
      saveSavingsRecords(INITIAL_SAVINGS_RECORDS);
      return INITIAL_SAVINGS_RECORDS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.some((r) => r.id === 'rec-1' || r.id === 'rec-9')) {
      saveSavingsRecords(INITIAL_SAVINGS_RECORDS);
      return INITIAL_SAVINGS_RECORDS;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load savings records:', e);
    return INITIAL_SAVINGS_RECORDS;
  }
}

export function saveSavingsRecords(records: SavingsRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save savings records:', e);
  }
}

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
  } catch (e) {
    console.error('Failed to save financial rule:', e);
  }
}

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

  // ล้างคีย์เวอร์ชันเก่าหากมี
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
