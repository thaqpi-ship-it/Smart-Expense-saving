import { Category, FinancialRule, SavingsGoal, SavingsRecord, Transaction } from '../types';

export const DEFAULT_FINANCIAL_RULE: FinancialRule = {
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20,
  name: 'มาตรฐานสมดุล (50/30/20)',
};

export const FINANCIAL_RULE_PRESETS: FinancialRule[] = [
  { name: 'มาตรฐานสมดุล (50/30/20)', needsPercent: 50, wantsPercent: 30, savingsPercent: 20 },
  { name: 'สายประหยัดเน้นออม (50/20/30)', needsPercent: 50, wantsPercent: 20, savingsPercent: 30 },
  { name: 'เป้าหมายออม 25% (50/25/25)', needsPercent: 50, wantsPercent: 25, savingsPercent: 25 },
  { name: 'สร้างตัววัยเริ่มทำงาน (60/25/15)', needsPercent: 60, wantsPercent: 25, savingsPercent: 15 },
  { name: 'มินิมอลรัดกุม (70/20/10)', needsPercent: 70, wantsPercent: 20, savingsPercent: 10 },
  { name: 'FIRE อิสรภาพการเงิน (45/15/40)', needsPercent: 45, wantsPercent: 15, savingsPercent: 40 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // หมวดหมู่รายจ่าย (Expense categories)
  { id: 'cat-food', name: 'อาหาร & เครื่องดื่ม', type: 'expense', icon: 'Utensils', color: '#10b981', isHappiness: true, budgetMonthly: 12000 },
  { id: 'cat-shopping', name: 'ช้อปปิ้ง & แฟชั่น', type: 'expense', icon: 'ShoppingBag', color: '#f59e0b', isHappiness: true, budgetMonthly: 6000 },
  { id: 'cat-entertainment', name: 'ความบันเทิง & สังสรรค์', type: 'expense', icon: 'Gamepad2', color: '#ec4899', isHappiness: true, budgetMonthly: 3500 },
  { id: 'cat-travel', name: 'ท่องเที่ยว & วันหยุด', type: 'expense', icon: 'Plane', color: '#8b5cf6', isHappiness: true, budgetMonthly: 8000 },
  { id: 'cat-transport', name: 'เดินทาง & ค่าน้ำมัน', type: 'expense', icon: 'Car', color: '#06b6d4', isHappiness: false, budgetMonthly: 4500 },
  { id: 'cat-bills', name: 'ค่าน้ำ ค่าไฟ & ค่าเน็ต', type: 'expense', icon: 'Receipt', color: '#64748b', isHappiness: false, budgetMonthly: 5000 },
  { id: 'cat-groceries', name: 'ของสด & ของใช้ในบ้าน', type: 'expense', icon: 'Store', color: '#14b8a6', isHappiness: false, budgetMonthly: 7000 },
  { id: 'cat-health', name: 'สุขภาพ & ยารักษาโรค', type: 'expense', icon: 'HeartPulse', color: '#ef4444', isHappiness: false, budgetMonthly: 3000 },
  { id: 'cat-other-exp', name: 'รายจ่ายอื่นๆ', type: 'expense', icon: 'HelpCircle', color: '#94a3b8', isHappiness: false, budgetMonthly: 2000 },

  // หมวดหมู่รายรับ (Income categories)
  { id: 'cat-salary', name: 'เงินเดือนประจำ', type: 'income', icon: 'Briefcase', color: '#10b981' },
  { id: 'cat-freelance', name: 'ฟรีแลนซ์ & งานเสริม', type: 'income', icon: 'Laptop', color: '#3b82f6' },
  { id: 'cat-invest', name: 'เงินปันผล & การลงทุน', type: 'income', icon: 'TrendingUp', color: '#eab308' },
  { id: 'cat-bonus', name: 'โบนัส & เงินรางวัล', type: 'income', icon: 'Gift', color: '#a855f7' },
  { id: 'cat-other-inc', name: 'รายได้อื่นๆ', type: 'income', icon: 'Coins', color: '#06b6d4' },

  // หมวดหมู่เงินออม/ลงทุน (Savings categories)
  { id: 'cat-savings-emergency', name: 'เงินออมสำรองฉุกเฉิน', type: 'savings', icon: 'ShieldCheck', color: '#10b981' },
  { id: 'cat-savings-goals', name: 'เงินออมตามเป้าหมาย (กระปุก)', type: 'savings', icon: 'PiggyBank', color: '#06b6d4' },
  { id: 'cat-savings-invest', name: 'ลงทุนหุ้น & กองทุน DCA', type: 'savings', icon: 'TrendingUp', color: '#3b82f6' },
  { id: 'cat-savings-pension', name: 'ออมเกษียณ & RMF/SSF', type: 'savings', icon: 'Landmark', color: '#8b5cf6' },
  { id: 'cat-savings-other', name: 'เงินออม/ลงทุนอื่นๆ', type: 'savings', icon: 'Wallet', color: '#14b8a6' },
];

export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'เงินสำรองฉุกเฉิน 6 เดือน',
    targetAmount: 150000,
    currentAmount: 0,
    targetDate: '2026-12-31',
    icon: 'ShieldCheck',
    color: '#10b981',
    notes: 'เงินทุนสำรองค่าใช้จ่ายเพื่อความอุ่นใจของครอบครัว',
  },
  {
    id: 'goal-2',
    title: 'ทริปเที่ยวโตเกียว 🇯🇵',
    targetAmount: 65000,
    currentAmount: 0,
    targetDate: '2026-11-15',
    icon: 'Plane',
    color: '#8b5cf6',
    notes: 'ตั๋วเครื่องบิน ที่พักชินจูกุ และงบกินเที่ยว',
  },
  {
    id: 'goal-3',
    title: 'อัปเกรดคอมทำงานใหม่ 💻',
    targetAmount: 85000,
    currentAmount: 0,
    targetDate: '2026-10-30',
    icon: 'Laptop',
    color: '#3b82f6',
    notes: 'เวิร์กสเตชันเพิ่มผลผลิตงานออกแบบ',
  },
];

// พร้อมสำหรับการนำไป Deploy จริง: เริ่มต้นด้วยรายการว่าง ยอดเงิน ฿0.00
export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_SAVINGS_RECORDS: SavingsRecord[] = [];
