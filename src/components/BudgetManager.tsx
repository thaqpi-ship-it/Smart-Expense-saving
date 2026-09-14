import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Sparkles,
  AlertTriangle,
  Check,
  Edit3,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface BudgetManagerProps {
  categories: Category[];
  transactions: Transaction[];
  onUpdateCategoryBudget: (categoryId: string, newBudget: number, isHappiness?: boolean) => void;
  selectedMonth: number;
  selectedYear: number;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  categories,
  transactions,
  onUpdateCategoryBudget,
  selectedMonth,
  selectedYear,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<string>('');
  const [tempHappiness, setTempHappiness] = useState<boolean>(false);

  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'expense');
  }, [categories]);

  // Current month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      if (selectedYear !== -1 && d.getFullYear() !== selectedYear) return false;
      const m = selectedMonth === -1 ? new Date().getMonth() : selectedMonth;
      return d.getMonth() === m;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Category spent calculations
  const categoryStats = useMemo(() => {
    return expenseCategories.map((cat) => {
      const spent = monthTransactions
        .filter((tx) => tx.categoryId === cat.id && tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0);

      const budget = cat.budgetMonthly || 0;
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
      const remaining = budget - spent;
      const isNearLimit = percent >= 80 && percent < 100;
      const isExceeded = percent >= 100;

      return {
        cat,
        spent,
        budget,
        percent,
        remaining,
        isNearLimit,
        isExceeded,
      };
    });
  }, [expenseCategories, monthTransactions]);

  const totalBudget = useMemo(() => {
    return expenseCategories.reduce((acc, c) => acc + (c.budgetMonthly || 0), 0);
  }, [expenseCategories]);

  const totalMonthSpent = useMemo(() => {
    return categoryStats.reduce((acc, s) => acc + s.spent, 0);
  }, [categoryStats]);

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setTempBudget((cat.budgetMonthly || 0).toString());
    setTempHappiness(!!cat.isHappiness);
  };

  const saveEdit = (catId: string) => {
    const val = parseFloat(tempBudget);
    onUpdateCategoryBudget(catId, isNaN(val) ? 0 : Math.max(0, val), tempHappiness);
    setEditingCatId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            งบประมาณรวมต่อเดือน (Monthly Budget)
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ฿{totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            นำไปคำนวณและรีเซ็ตให้อัตโนมัติทุกเดือน เพื่อควบคุมค่าใช้จ่าย
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            ยอดใช้จ่ายสะสมเดือนนี้ (Month Spent)
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ฿{totalMonthSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalBudget > 0
              ? `${((totalMonthSpent / totalBudget) * 100).toFixed(1)}% ของงบประมาณรวมทั้งเดือน`
              : 'ตั้งค่างบประมาณหมวดหมู่เพื่อเริ่มติดตาม'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            งบคงเหลือใช้ได้ (Remaining)
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              totalBudget - totalMonthSpent >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            ฿{(totalBudget - totalMonthSpent).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalBudget - totalMonthSpent >= 0 ? 'อยู่ในเกณฑ์ปลอดภัยตามแผน' : '⚠️ เกินงบประมาณที่กำหนด!'}
          </div>
        </div>
      </div>

      {/* Category Budget Cards */}
      <div className="p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2f3645]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              ตั้งค่างบประมาณรายหมวดหมู่ & แจ้งเตือนหมวดความสุข
            </h2>
            <p className="text-xs text-slate-400">
              กำหนดวงเงินเพื่อควบคุมค่าใช้จ่าย หมวดที่ตั้งเป็น "หมวดความสุข" จะมีระบบเฝ้าระวังความคุ้มค่าเป็นพิเศษ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryStats.map(({ cat, spent, budget, percent, remaining, isNearLimit, isExceeded }) => {
            const isEditing = editingCatId === cat.id;

            return (
              <div
                key={cat.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isExceeded
                    ? 'bg-[#261f22] border-red-500/50 shadow-lg'
                    : isNearLimit
                    ? 'bg-[#29241b] border-amber-500/50 shadow-md'
                    : 'bg-[#181c22] border-[#2f3645] hover:border-[#3d4659]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: `${cat.color}33`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{cat.name}</span>
                        {cat.isHappiness && (
                          <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 font-semibold">
                            <Sparkles className="w-2.5 h-2.5" /> หมวดความสุข
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        ใช้ไป: <span className="text-white font-bold">฿{spent.toLocaleString()}</span> /
                        งบ: ฿{budget.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Edit Toggle */}
                  <button
                    onClick={() => (isEditing ? saveEdit(cat.id) : startEdit(cat))}
                    className="p-1.5 rounded-lg bg-[#252c38] hover:bg-[#2f3747] text-emerald-400 transition-colors"
                    title={isEditing ? 'บันทึกงบประมาณ' : 'แก้ไขงบประมาณ'}
                  >
                    {isEditing ? <Check className="w-4 h-4 text-emerald-400" /> : <Edit3 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Inline Edit Form */}
                {isEditing ? (
                  <div className="p-3 bg-[#14181f] rounded-xl border border-[#2f3645] space-y-2 mb-3">
                    <div>
                      <label className="block text-[11px] text-emerald-400 font-semibold mb-1">
                        วงเงินงบประมาณรายเดือน (บาท)
                      </label>
                      <input
                        type="number"
                        value={tempBudget}
                        onChange={(e) => setTempBudget(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#181c22] border border-[#2f3645] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-400"
                        placeholder="เช่น 5000"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempHappiness}
                          onChange={(e) => setTempHappiness(e.target.checked)}
                          className="rounded border-[#2f3645] text-emerald-500 focus:ring-0"
                        />
                        <span>ระบุเป็นหมวดความสุข (Happiness Category)</span>
                      </label>
                      <button
                        onClick={() => saveEdit(cat.id)}
                        className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg shadow-sm"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Progress Bar & Status */
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          isExceeded
                            ? 'text-red-400'
                            : isNearLimit
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {isExceeded ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" /> เกินงบแล้ว ({percent.toFixed(0)}%)
                          </>
                        ) : isNearLimit ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" /> ใกล้แตะงบ ({percent.toFixed(0)}%)
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" /> ควบคุมได้ดี ({percent.toFixed(0)}%)
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {remaining >= 0 ? `เหลืออีก ฿${remaining.toLocaleString()}` : `เกินงบไป ฿${Math.abs(remaining).toLocaleString()}`}
                      </span>
                    </div>

                    <div className="w-full bg-[#14181f] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded
                            ? 'bg-red-500'
                            : isNearLimit
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
