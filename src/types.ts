export type TransactionType = 'expense' | 'income' | 'savings';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class or hex
  isHappiness?: boolean; // Categories like shopping, dining, travel for lifestyle leaks & alerts
  budgetMonthly?: number; // Monthly budget limit
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  categoryId: string;
  type: TransactionType;
  merchant?: string;
  notes?: string;
  goalId?: string; // Linked savings goal ID when type === 'savings'
  savingsRecordId?: string; // Linked record in SavingsRecords for auto-sync
  createdAt: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  icon: string;
  color: string;
  notes?: string;
}

export interface SavingsRecord {
  id: string;
  goalId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  transactionId?: string; // Linked transaction ID if auto-synced from a transaction
  createdAt: number;
}

export interface FilterState {
  year: number; // e.g. 2026, or -1 for all
  month: number; // 0-11, or -1 for all
  categoryId: string; // 'all' or specific id
  type: 'all' | 'expense' | 'income' | 'savings';
  searchQuery: string;
}

export interface AIReceiptData {
  amount: number;
  date: string;
  merchantName?: string;
  category?: string;
  type?: TransactionType;
  notes?: string;
}

export interface FinancialRule {
  needsPercent: number; // e.g. 50 (รายจ่ายจำเป็น)
  wantsPercent: number; // e.g. 30 (รายจ่ายเพื่อความสุข/ไลฟ์สไตล์)
  savingsPercent: number; // e.g. 20 (เงินออม & ลงทุน)
  name?: string; // ชื่อชุดกฎ เช่น 'มาตรฐานสมดุล 50/30/20'
}
