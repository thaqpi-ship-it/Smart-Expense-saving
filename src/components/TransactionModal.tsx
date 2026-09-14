import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, Store, FileText, Check, Sparkles, PiggyBank, Target, ArrowRight } from 'lucide-react';
import { Category, SavingsGoal, Transaction, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { DatePicker } from './DatePicker';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>, id?: string) => void;
  editingTransaction?: Transaction | null;
  categories: Category[];
  savingsGoals?: SavingsGoal[];
  recentMerchants?: { merchant: string; categoryId: string; type: TransactionType }[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  categories,
  savingsGoals = [],
  recentMerchants = [],
}) => {
  const [date, setDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [goalId, setGoalId] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setDate(editingTransaction.date);
        setAmount(editingTransaction.amount.toString());
        setCategoryId(editingTransaction.categoryId);
        setType(editingTransaction.type);
        setGoalId(editingTransaction.goalId || '');
        setMerchant(editingTransaction.merchant || '');
        setNotes(editingTransaction.notes || '');
        setShowAdvanced(true);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setAmount('');
        // Default to first expense category
        const defaultCat = categories.find((c) => c.type === 'expense');
        setCategoryId(defaultCat ? defaultCat.id : categories[0]?.id || '');
        setType('expense');
        setGoalId(savingsGoals[0]?.id || '');
        setMerchant('');
        setNotes('');
        setShowAdvanced(false);
      }
      setError('');
    }
  }, [isOpen, editingTransaction, categories, savingsGoals]);

  if (!isOpen) return null;

  // Filter categories by selected type
  const availableCategories = categories.filter((c) => c.type === type);

  // Auto-categorize based on merchant history
  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    if (!editingTransaction && val.trim().length > 1) {
      const match = recentMerchants.find(
        (m) => m.merchant.toLowerCase().trim() === val.toLowerCase().trim()
      );
      if (match) {
        setCategoryId(match.categoryId);
        setType(match.type);
      }
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const catForType = categories.find((c) => c.type === newType);
    if (catForType) {
      setCategoryId(catForType.id);
    }
    if (newType === 'savings' && !goalId && savingsGoals.length > 0) {
      setGoalId(savingsGoals[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('กรุณาระบุจำนวนเงินที่ถูกต้องและมากกว่า 0');
      return;
    }
    if (!date) {
      setError('กรุณาเลือกวันที่ทำรายการ');
      return;
    }
    if (!categoryId) {
      setError('กรุณาเลือกหมวดหมู่');
      return;
    }

    onSave(
      {
        date,
        amount: numAmount,
        categoryId,
        type,
        goalId: type === 'savings' && goalId ? goalId : undefined,
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      editingTransaction ? editingTransaction.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="transaction-modal"
        className="w-full max-w-lg bg-[#21252d] border border-[#2f3645] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3645] bg-[#1c2027]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                type === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {type === 'savings' ? <PiggyBank className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingTransaction ? 'แก้ไขรายการธุรกรรม' : 'บันทึกรายการ (Quick Add)'}
              </h2>
              <p className="text-xs text-emerald-400">
                {editingTransaction
                  ? 'แก้ไขข้อมูลธุรกรรมและบันทึกการเปลี่ยนแปลง'
                  : type === 'savings'
                  ? 'โอนเงินออมตรงกับ Statement • Auto-Sync เข้ากระปุกเป้าหมาย'
                  : 'บันทึกเสร็จใน 3 วินาที • วันที่, จำนวนเงิน และหมวดหมู่'}
              </p>
            </div>
          </div>
          <button
            id="close-tx-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#282e3a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Type Selector (Expense vs Income vs Savings) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#14181f] rounded-xl border border-[#2f3645]">
            <button
              id="type-expense-btn"
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'expense'
                  ? 'bg-red-950/70 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔴 รายจ่าย</span>
            </button>
            <button
              id="type-income-btn"
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'income'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🟢 รายรับ</span>
            </button>
            <button
              id="type-savings-btn"
              type="button"
              onClick={() => handleTypeChange('savings')}
              className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === 'savings'
                  ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔵 เงินออม/ลงทุน</span>
            </button>
          </div>

          {/* Core 3: Amount (Primary prominence) */}
          <div>
            <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              จำนวนเงิน (Amount) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-400">
                ฿
              </span>
              <input
                id="tx-amount-input"
                type="number"
                step="any"
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#14181f] border border-[#2f3645] rounded-xl text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                required
              />
            </div>
          </div>

          {/* Savings Goal Target Selector (Only shown when type === 'savings') */}
          {type === 'savings' && (
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>กระปุกออมสินเป้าหมาย (Auto-Sync)</span>
                </label>
                <span className="text-[10px] text-cyan-400/90 font-medium">
                  ⚡ เชื่อมโยงอัตโนมัติ
                </span>
              </div>

              {savingsGoals.length > 0 ? (
                <div className="space-y-2">
                  <select
                    id="savings-goal-select"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className="w-full p-2.5 bg-[#14181f] border border-cyan-600/50 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">-- ไม่ระบุกระปุก (ออม/ลงทุนทั่วไป) --</option>
                    {savingsGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} (สะสมแล้ว ฿{g.currentAmount.toLocaleString()} / เป้าหมาย ฿{g.targetAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>

                  <p className="text-[11px] text-cyan-200/80 leading-relaxed">
                    {goalId ? (
                      <>
                        เมื่อบันทึก ยอดเงินนี้จะถูกบวกเพิ่มเข้าสู่กระปุก{' '}
                        <strong className="text-cyan-300">
                          "{savingsGoals.find((g) => g.id === goalId)?.title}"
                        </strong>{' '}
                        โดยอัตโนมัติ และสร้างประวัติการหยอดเงินให้ทันที
                      </>
                    ) : (
                      'บันทึกเป็นเงินออมทั่วไปโดยไม่เชื่อมโยงกับกระปุกเฉพาะ'
                    )}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-1">
                  ยังไม่มีกระปุกออมสินในระบบ คุณสามารถสร้างกระปุกได้ที่แท็บ "เป้าหมายเงินออม"
                </div>
              )}
            </div>
          )}

          {/* Core 2: Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              หมวดหมู่ (Category) *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1.5 bg-[#14181f] rounded-xl border border-[#2f3645]">
              {availableCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    id={`cat-select-${cat.id}`}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-400 text-white shadow-md'
                        : 'border-[#2a313f] bg-[#181c22] text-slate-300 hover:border-[#3d4659] hover:text-white'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 text-white shadow-sm"
                      style={{ backgroundColor: `${cat.color}33`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight line-clamp-1 w-full">
                      {cat.name}
                    </span>
                    {cat.isHappiness && (
                      <span className="text-[9px] text-amber-300 flex items-center gap-0.5 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> สุข
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core 1: Date */}
          <div>
            <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              วันที่ทำรายการ (Date) *
            </label>
            <DatePicker
              id="tx-date-input"
              value={date}
              onChange={setDate}
              required
            />
          </div>

          {/* Toggle Optional / Advanced Details */}
          <div className="pt-1">
            <button
              id="toggle-advanced-btn"
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              <span>{showAdvanced ? '▼ ซ่อนรายละเอียดเพิ่มเติม' : '▶ เพิ่มชื่อร้านค้า/บัญชี และบันทึกช่วยจำ (ไม่บังคับ)'}</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-[#2f3645] animate-in fade-in">
              {/* Merchant / Store / Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {type === 'savings'
                    ? 'บัญชีปลายทาง / รายละเอียดโอน (Destination / Note)'
                    : 'ร้านค้า / ผู้รับเงิน (Merchant / Payee)'}
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="tx-merchant-input"
                    type="text"
                    placeholder={
                      type === 'savings'
                        ? 'เช่น บัญชีเงินฝากประจำ, กองทุนรวม SCB, บัญชีออมทรัพย์'
                        : 'เช่น สตาร์บัคส์, เซเว่น, Shopee, โลตัส, AIS'
                    }
                    value={merchant}
                    onChange={(e) => handleMerchantChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#14181f] border border-[#2f3645] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  บันทึกช่วยจำ (Notes / Memo)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    id="tx-notes-input"
                    rows={2}
                    placeholder={
                      type === 'savings'
                        ? 'เช่น เงินออมประจำเดือนตรงตาม Statement ธนาคาร...'
                        : 'เช่น ทานข้าวกับเพื่อนร่วมงาน, ซื้อของใช้เข้าบ้าน...'
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#14181f] border border-[#2f3645] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2f3645]">
            <button
              id="cancel-tx-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a] transition-colors"
            >
              ยกเลิก
            </button>
            <button
              id="save-tx-btn"
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4 text-slate-950" />
              <span>{editingTransaction ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
