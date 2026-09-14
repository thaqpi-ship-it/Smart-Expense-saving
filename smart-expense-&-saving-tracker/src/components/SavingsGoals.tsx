import React, { useState, useMemo } from 'react';
import {
  Target,
  PlusCircle,
  PiggyBank,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2,
  X,
  History,
  Search,
  Wallet,
  Clock,
  Coins,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { SavingsGoal, SavingsRecord } from '../types';
import { CategoryIcon, POPULAR_ICONS } from './CategoryIcon';
import { DatePicker } from './DatePicker';

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  records: SavingsRecord[];
  onSaveGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddRecord: (record: {
    goalId: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    date: string;
    notes?: string;
  }) => void;
  onDeleteRecord: (record: SavingsRecord, revertBalance?: boolean) => void;
  onDepositWithdraw?: (goalId: string, deltaAmount: number) => void;
}

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const SavingsGoals: React.FC<SavingsGoalsProps> = ({
  goals,
  records = [],
  onSaveGoal,
  onDeleteGoal,
  onAddRecord,
  onDeleteRecord,
}) => {
  // Main view mode: 'pots' (กระปุกเป้าหมาย) vs 'history' (ประวัติการหยอด/ถอน)
  const [viewMode, setViewMode] = useState<'pots' | 'history'>('pots');

  // Goals Map for quick lookup
  const goalsMap = useMemo(() => {
    const map = new Map<string, SavingsGoal>();
    goals.forEach((g) => map.set(g.id, g));
    return map;
  }, [goals]);

  // Modal: New / Edit Goal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Form states for New / Edit Goal
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('ShieldCheck');
  const [color, setColor] = useState('#10b981');
  const [notes, setNotes] = useState('');

  // Modal: Deposit / Withdraw with comprehensive fields (Date, Amount, Notes)
  const [activeTransferGoal, setActiveTransferGoal] = useState<SavingsGoal | null>(null);
  const [transferType, setTransferType] = useState<'deposit' | 'withdraw'>('deposit');
  const [transferDate, setTransferDate] = useState<string>(getTodayDateString());
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Modal: Dedicated Single Pot History Modal
  const [viewingHistoryGoal, setViewingHistoryGoal] = useState<SavingsGoal | null>(null);

  // History Tab Filter States
  const [historyGoalFilter, setHistoryGoalFilter] = useState<string>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historySort, setHistorySort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Open Deposit / Withdraw Modal
  const openTransferModal = (goal: SavingsGoal, type: 'deposit' | 'withdraw') => {
    setActiveTransferGoal(goal);
    setTransferType(type);
    setTransferDate(getTodayDateString());
    setTransferAmount('');
    setTransferNotes('');
  };

  const openNewGoalModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setIcon('PiggyBank');
    setColor('#10b981');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditGoalModal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setTargetDate(g.targetDate || '');
    setIcon(g.icon);
    setColor(g.color);
    setNotes(g.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;
    if (!title.trim() || isNaN(target) || target <= 0) return;

    onSaveGoal({
      id: editingGoal ? editingGoal.id : `goal-${Date.now()}`,
      title: title.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate: targetDate || undefined,
      icon,
      color,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransferGoal) return;
    const val = parseFloat(transferAmount);
    if (isNaN(val) || val <= 0) return;

    onAddRecord({
      goalId: activeTransferGoal.id,
      type: transferType,
      amount: val,
      date: transferDate || getTodayDateString(),
      notes: transferNotes.trim() || undefined,
    });

    setActiveTransferGoal(null);
    setTransferAmount('');
    setTransferNotes('');
  };

  // Calculations
  const totalSaved = useMemo(() => goals.reduce((acc, g) => acc + g.currentAmount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((acc, g) => acc + g.targetAmount, 0), [goals]);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Filtered Records for the History Tab
  const filteredRecords = useMemo(() => {
    return records
      .filter((rec) => {
        if (historyGoalFilter !== 'all' && rec.goalId !== historyGoalFilter) return false;
        if (historyTypeFilter !== 'all' && rec.type !== historyTypeFilter) return false;
        if (historySearch.trim()) {
          const q = historySearch.toLowerCase().trim();
          const goal = goalsMap.get(rec.goalId);
          const goalTitle = (goal?.title || '').toLowerCase();
          const notes = (rec.notes || '').toLowerCase();
          const amtStr = rec.amount.toString();
          if (!goalTitle.includes(q) && !notes.includes(q) && !amtStr.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (historySort === 'date-desc') {
          const dComp = b.date.localeCompare(a.date);
          return dComp !== 0 ? dComp : b.createdAt - a.createdAt;
        }
        if (historySort === 'date-asc') {
          const dComp = a.date.localeCompare(b.date);
          return dComp !== 0 ? dComp : a.createdAt - b.createdAt;
        }
        if (historySort === 'amount-desc') return b.amount - a.amount;
        if (historySort === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [records, historyGoalFilter, historyTypeFilter, historySearch, historySort, goalsMap]);

  // History Stats
  const historyStats = useMemo(() => {
    let depositSum = 0;
    let withdrawSum = 0;
    records.forEach((r) => {
      if (r.type === 'deposit') depositSum += r.amount;
      else withdrawSum += r.amount;
    });
    return {
      depositSum,
      withdrawSum,
      netSum: depositSum - withdrawSum,
      totalCount: records.length,
    };
  }, [records]);

  // Records grouped by Goal ID for quick counts
  const recordsByGoal = useMemo(() => {
    const map = new Map<string, SavingsRecord[]>();
    records.forEach((r) => {
      const list = map.get(r.goalId) || [];
      list.push(r);
      map.set(r.goalId, list);
    });
    return map;
  }, [records]);

  const colorPalette = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#14b8a6'];

  // Quick amount helper chips
  const quickDepositPresets = [500, 1000, 2000, 5000];
  const quickWithdrawPresets = [500, 1000, 2000, 5000];

  // Quick note suggestions
  const depositNoteSuggestions = ['เงินออมจากเงินเดือน', 'แบ่งเก็บรายได้ฟรีแลนซ์', 'เงินปันผล/ดอกเบี้ย', 'เงินทอน/เงินเหลือประจำวัน', 'โบนัสพิเศษ'];
  const withdrawNoteSuggestions = ['ใช้จ่ายตามเป้าหมาย', 'ถอนจ่ายค่ามัดจำ', 'เหตุฉุกเฉินจำเป็น', 'โอนกลับบัญชีหลัก'];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner Summary & Tab Switcher */}
      <div className="p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PiggyBank className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">กระปุกเป้าหมายการออม (Savings Goals)</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              แยกกระปุกออมเงินตามเป้าหมายในฝัน บันทึกยอดหยอด/ถอน และติดตามประวัติการออมย้อนหลังได้ทุกรายการ
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">เงินออมสะสมในกระปุก: </span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  ฿{totalSaved.toLocaleString()}
                </span>
              </div>
              <div className="hidden sm:inline text-slate-600">•</div>
              <div>
                <span className="text-slate-400">เป้าหมายรวมทั้งหมด: </span>
                <span className="font-semibold text-white">฿{totalTarget.toLocaleString()}</span>
              </div>
              <div className="hidden sm:inline text-slate-600">•</div>
              <div>
                <span className="text-slate-400">ความคืบหน้ารวม: </span>
                <span className="font-extrabold text-emerald-400">{overallProgress.toFixed(1)}%</span>
              </div>
              <div className="hidden sm:inline text-slate-600">•</div>
              <div>
                <span className="text-slate-400">ประวัติบันทึกทั้งหมด: </span>
                <span className="font-bold text-teal-300">{records.length} รายการ</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="create-goal-btn"
              onClick={openNewGoalModal}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>+ สร้างกระปุกออมใหม่</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs between Pots Overview and Full History Log */}
        <div className="flex items-center gap-2 border-t border-[#2f3645] pt-4">
          <button
            onClick={() => setViewMode('pots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'pots'
                ? 'bg-[#2b4236] text-emerald-300 border border-emerald-600/50 shadow-sm'
                : 'bg-[#181c22] text-slate-400 hover:text-slate-200 border border-[#2f3645]'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>กระปุกเป้าหมายทั้งหมด ({goals.length})</span>
          </button>
          <button
            id="view-all-savings-history-btn"
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              viewMode === 'history'
                ? 'bg-[#2b4236] text-emerald-300 border border-emerald-600/50 shadow-sm'
                : 'bg-[#181c22] text-slate-400 hover:text-slate-200 border border-[#2f3645]'
            }`}
          >
            <History className="w-4 h-4 text-teal-400" />
            <span>ประวัติการหยอด/ถอนทั้งหมด ({records.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: GOALS CARDS VIEW */}
      {viewMode === 'pots' && (
        <>
          {goals.length === 0 ? (
            <div className="p-12 text-center bg-[#21252d] border border-[#2f3645] rounded-2xl space-y-3">
              <PiggyBank className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">ยังไม่มีกระปุกเป้าหมายการออม</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                เริ่มต้นสร้างกระปุกออมเงิน เช่น เงินสำรองฉุกเฉิน ค่าตั๋วเครื่องบิน หรือซื้อของขวัญให้ตัวเอง
              </p>
              <button
                onClick={openNewGoalModal}
                className="mt-2 px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
              >
                + สร้างกระปุกแรกของคุณ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {goals.map((goal) => {
                const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                const isCompleted = goal.currentAmount >= goal.targetAmount;
                const goalRecords = recordsByGoal.get(goal.id) || [];
                const latestRecord = goalRecords[0]; // newest first

                return (
                  <div
                    key={goal.id}
                    className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between transition-all group ${
                      isCompleted
                        ? 'bg-[#1b2521] border-emerald-500/60 shadow-lg'
                        : 'bg-[#21252d] border-[#2f3645] hover:border-[#3d4659]'
                    }`}
                  >
                    <div>
                      {/* Card Header: Icon, Title & Action controls */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                            style={{ backgroundColor: goal.color }}
                          >
                            <CategoryIcon name={goal.icon} className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white leading-tight">
                              {goal.title}
                            </h3>
                            {goal.targetDate && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-emerald-400" />
                                <span>เป้าหมายวันที่: {goal.targetDate}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingHistoryGoal(goal)}
                            className="p-1.5 text-slate-400 hover:text-teal-300 rounded-lg hover:bg-[#2c3340] transition-colors relative"
                            title="ดูประวัติการหยอด/ถอนของกระปุกนี้"
                          >
                            <History className="w-3.5 h-3.5" />
                            {goalRecords.length > 0 && (
                              <span className="absolute -top-1 -right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-emerald-500/80 text-slate-950 font-black text-[9px] flex items-center justify-center">
                                {goalRecords.length}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => openEditGoalModal(goal)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#2c3340] transition-colors"
                            title="แก้ไขเป้าหมาย"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteGoal(goal.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                            title="ลบเป้าหมาย"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Amounts Display */}
                      <div className="my-3 p-3 rounded-xl bg-[#14181f] border border-[#282f3c]">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              เงินออมสะสม
                            </span>
                            <span className="text-2xl font-black text-white">
                              ฿{goal.currentAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              เป้าหมายที่ตั้งไว้
                            </span>
                            <span className="text-sm font-bold text-slate-300">
                              ฿{goal.targetAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-[#0c0e12] h-2.5 rounded-full mt-2.5 overflow-hidden p-0.5 border border-[#242b38]">
                          <div
                            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-400 to-teal-400"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs mt-2">
                          <span className="font-extrabold text-emerald-400">{percent.toFixed(1)}%</span>
                          <span className="text-[11px] text-slate-400">
                            {isCompleted ? (
                              <span className="text-emerald-300 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> บรรลุเป้าหมายแล้ว! 🎉
                              </span>
                            ) : (
                              `ขาดอีก ฿${remaining.toLocaleString()}`
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Motivation Quote */}
                      {goal.notes && (
                        <p className="text-xs text-slate-400 italic mb-2 line-clamp-2">
                          "{goal.notes}"
                        </p>
                      )}

                      {/* Latest Transaction Preview */}
                      {latestRecord && (
                        <div
                          onClick={() => setViewingHistoryGoal(goal)}
                          className="mb-3 px-2.5 py-1.5 rounded-lg bg-[#181d24] border border-[#2a3242] flex items-center justify-between text-[11px] text-slate-400 cursor-pointer hover:border-emerald-500/40 transition-colors"
                          title="คลิกเพื่อเปิดดูประวัติทั้งหมด"
                        >
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">
                              {latestRecord.date}: {latestRecord.notes || (latestRecord.type === 'deposit' ? 'หยอดเงิน' : 'ถอนเงิน')}
                            </span>
                          </div>
                          <span
                            className={`font-bold shrink-0 ${
                              latestRecord.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {latestRecord.type === 'deposit' ? '+' : '-'}฿{latestRecord.amount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Deposit / Withdraw Action Buttons */}
                    <div className="space-y-2 pt-3 border-t border-[#2f3645]">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => openTransferModal(goal, 'deposit')}
                          className="py-2 px-3 bg-[#22332a] hover:bg-[#2b4236] border border-emerald-600/50 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span>+ หยอดเงินออม</span>
                        </button>
                        <button
                          onClick={() => openTransferModal(goal, 'withdraw')}
                          className="py-2 px-3 bg-[#181c22] hover:bg-rose-950/40 border border-[#2f3645] hover:border-rose-800 text-slate-300 hover:text-rose-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>- ถอนเงินออก</span>
                        </button>
                      </div>

                      {/* Pot History Button */}
                      <button
                        onClick={() => setViewingHistoryGoal(goal)}
                        className="w-full py-1.5 text-[11px] text-slate-400 hover:text-emerald-400 flex items-center justify-center gap-1 transition-colors"
                      >
                        <History className="w-3 h-3" />
                        <span>ดูประวัติกระปุกนี้ ({goalRecords.length} รายการ)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: SAVINGS HISTORY TAB (ระบบบันทึกรายการประวัติการหยอด/ถอน) */}
      {viewMode === 'history' && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[#21252d] border border-[#2f3645]">
              <span className="text-[11px] text-slate-400 font-semibold block">ยอดหยอดสะสมรวม</span>
              <span className="text-lg font-black text-emerald-400">
                +฿{historyStats.depositSum.toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#21252d] border border-[#2f3645]">
              <span className="text-[11px] text-slate-400 font-semibold block">ยอดถอนสะสมรวม</span>
              <span className="text-lg font-black text-rose-400">
                -฿{historyStats.withdrawSum.toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#21252d] border border-[#2f3645]">
              <span className="text-[11px] text-slate-400 font-semibold block">เงินออมสุทธิ</span>
              <span className="text-lg font-black text-white">
                ฿{historyStats.netSum.toLocaleString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#21252d] border border-[#2f3645]">
              <span className="text-[11px] text-slate-400 font-semibold block">จำนวนรายการ</span>
              <span className="text-lg font-black text-teal-300">
                {historyStats.totalCount} รายการ
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาบันทึกช่วยจำ, ชื่อกระปุก, ยอดเงิน..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#14181f] border border-[#2f3645] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Filter by Goal */}
            <select
              value={historyGoalFilter}
              onChange={(e) => setHistoryGoalFilter(e.target.value)}
              className="bg-[#14181f] border border-[#2f3645] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:border-emerald-400"
            >
              <option value="all">ทุกกระปุกออมเงิน (All Pots)</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>

            {/* Filter by Type */}
            <select
              value={historyTypeFilter}
              onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
              className="bg-[#14181f] border border-[#2f3645] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:border-emerald-400"
            >
              <option value="all">ทุกประเภท (หยอด & ถอน)</option>
              <option value="deposit">🟢 เฉพาะหยอดเงิน (+ Deposit)</option>
              <option value="withdraw">🔴 เฉพาะถอนเงิน (- Withdraw)</option>
            </select>

            {/* Sort */}
            <select
              value={historySort}
              onChange={(e) => setHistorySort(e.target.value as any)}
              className="bg-[#14181f] border border-[#2f3645] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:border-emerald-400"
            >
              <option value="date-desc">วันที่: ล่าสุดก่อน</option>
              <option value="date-asc">วันที่: เก่าสุดก่อน</option>
              <option value="amount-desc">ยอดเงิน: มากไปน้อย</option>
              <option value="amount-asc">ยอดเงิน: น้อยไปมาก</option>
            </select>
          </div>

          {/* Records Table */}
          <div className="rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl overflow-hidden">
            {filteredRecords.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm space-y-2">
                <History className="w-10 h-10 text-slate-500 mx-auto" />
                <p>ไม่พบประวัติการหยอด/ถอนเงินตามเงื่อนไขที่เลือก</p>
                <button
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryGoalFilter('all');
                    setHistoryTypeFilter('all');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181c22] text-emerald-400 font-semibold border-b border-[#2f3645]">
                    <tr>
                      <th className="py-3.5 px-4">วันที่ทำรายการ</th>
                      <th className="py-3.5 px-4">กระปุกเป้าหมาย</th>
                      <th className="py-3.5 px-4">บันทึกช่วยจำ / รายละเอียด</th>
                      <th className="py-3.5 px-4 text-center">ประเภท</th>
                      <th className="py-3.5 px-4 text-right">จำนวนเงิน</th>
                      <th className="py-3.5 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a313f] text-slate-200">
                    {filteredRecords.map((rec) => {
                      const goal = goalsMap.get(rec.goalId);
                      const isDeposit = rec.type === 'deposit';

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-[#282e3a] transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{rec.date}</span>
                            </div>
                          </td>

                          {/* Goal */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px]"
                                style={{ backgroundColor: goal?.color || '#10b981' }}
                              >
                                <CategoryIcon name={goal?.icon || 'PiggyBank'} className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-semibold text-white">
                                {goal?.title || 'กระปุกที่ไม่ระบุ'}
                              </span>
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                            {rec.notes ? (
                              <span className="text-slate-200">{rec.notes}</span>
                            ) : (
                              <span className="text-slate-500 italic">
                                {isDeposit ? 'หยอดเงินเข้ากระปุก' : 'ถอนเงินออกจากกระปุก'}
                              </span>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isDeposit
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              {isDeposit ? (
                                <>
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>หยอดเงิน</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-3 h-3" />
                                  <span>ถอนเงิน</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                            <span className={isDeposit ? 'text-emerald-400' : 'text-rose-400'}>
                              {isDeposit ? '+' : '-'}฿{rec.amount.toLocaleString()}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => onDeleteRecord(rec, true)}
                              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 transition-colors"
                              title="ลบรายการประวัตินี้ (และปรับคืนยอดเงินในกระปุก)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: DEPOSIT / WITHDRAW MODAL WITH COMPLETE FIELDS (DATE, AMOUNT, NOTES) */}
      {activeTransferGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#21252d] border border-[#2f3645] rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    transferType === 'deposit'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {transferType === 'deposit' ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {transferType === 'deposit' ? 'หยอดเงินเข้ากระปุกออม' : 'ถอนเงินออกจากกระปุกออม'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    บันทึกจำนวนเงิน วันที่ และรายละเอียดเพื่อเก็บประวัติย้อนหลัง
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTransferGoal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#2c3340] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Pot Badge */}
            <div className="p-3 rounded-xl bg-[#14181f] border border-[#282f3c] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: activeTransferGoal.color }}
                >
                  <CategoryIcon name={activeTransferGoal.icon} className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">กระปุกเป้าหมาย</span>
                  <span className="text-sm font-bold text-white">{activeTransferGoal.title}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">ยอดออมปัจจุบัน</span>
                <span className="text-xs font-extrabold text-emerald-400">
                  ฿{activeTransferGoal.currentAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              {/* 1. Date Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-emerald-400">
                    วันที่ทำรายการ (Transaction Date) *
                  </label>
                </div>
                <DatePicker
                  id="transfer-date-input"
                  value={transferDate}
                  onChange={setTransferDate}
                  required
                  showShortcuts={true}
                />
              </div>

              {/* 2. Amount Field */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  จำนวนเงินที่ต้องการ{transferType === 'deposit' ? 'หยอด' : 'ถอน'} (บาท) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#14181f] border border-[#2f3645] rounded-xl text-xl font-bold text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">ลัด:</span>
                  {(transferType === 'deposit' ? quickDepositPresets : quickWithdrawPresets).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const currentVal = parseFloat(transferAmount) || 0;
                        setTransferAmount((currentVal + val).toString());
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#14181f] hover:bg-[#282f3d] border border-[#2f3645] text-[11px] font-semibold text-slate-300 transition-colors"
                    >
                      +{val.toLocaleString()}
                    </button>
                  ))}

                  {/* Target remaining preset or max balance preset */}
                  {transferType === 'deposit' && activeTransferGoal.targetAmount > activeTransferGoal.currentAmount && (
                    <button
                      type="button"
                      onClick={() =>
                        setTransferAmount(
                          Math.max(0, activeTransferGoal.targetAmount - activeTransferGoal.currentAmount).toString()
                        )
                      }
                      className="px-2 py-0.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-[11px] font-bold text-emerald-300"
                    >
                      หยอดให้เต็มเป้า (฿{(activeTransferGoal.targetAmount - activeTransferGoal.currentAmount).toLocaleString()})
                    </button>
                  )}
                  {transferType === 'withdraw' && activeTransferGoal.currentAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setTransferAmount(activeTransferGoal.currentAmount.toString())}
                      className="px-2 py-0.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-[11px] font-bold text-rose-300"
                    >
                      ถอนทั้งหมด (฿{activeTransferGoal.currentAmount.toLocaleString()})
                    </button>
                  )}
                </div>

                {/* Warning if withdraw > currentAmount */}
                {transferType === 'withdraw' &&
                  parseFloat(transferAmount) > activeTransferGoal.currentAmount && (
                    <div className="mt-2 text-[11px] text-rose-300 flex items-center gap-1.5 bg-rose-950/40 p-2 rounded-lg border border-rose-800/40">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>
                        ยอดที่ต้องการถอนมากกว่าเงินที่มีอยู่ในกระปุก (คงเหลือ ฿{activeTransferGoal.currentAmount.toLocaleString()})
                      </span>
                    </div>
                  )}

                {/* Calculation Preview */}
                {parseFloat(transferAmount) > 0 && (
                  <div className="mt-2.5 p-2 rounded-lg bg-[#14181f] text-[11px] text-slate-300 border border-[#2a3240] flex items-center justify-between">
                    <span>ยอดเงินใหม่ในกระปุก:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-slate-400 line-through">
                        ฿{activeTransferGoal.currentAmount.toLocaleString()}
                      </span>
                      <span>➔</span>
                      <span className="text-emerald-400 text-xs">
                        ฿
                        {Math.max(
                          0,
                          activeTransferGoal.currentAmount +
                            (transferType === 'deposit'
                              ? parseFloat(transferAmount)
                              : -parseFloat(transferAmount))
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Notes Field */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  บันทึกช่วยจำ / รายละเอียด (Notes)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    rows={2}
                    placeholder={
                      transferType === 'deposit'
                        ? 'เช่น หยอดเก็บจากเงินเดือน, งานฟรีแลนซ์, เงินเหลือประจำวัน...'
                        : 'เช่น ถอนจ่ายมัดจำ, นำไปใช้ตามเป้าหมาย...'
                    }
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#14181f] border border-[#2f3645] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Quick note suggestion chips */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(transferType === 'deposit' ? depositNoteSuggestions : withdrawNoteSuggestions).map(
                    (sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setTransferNotes(sug)}
                        className="px-2 py-0.5 rounded-md bg-[#14181f] hover:bg-[#282f3d] border border-[#2f3645] text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {sug}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2f3645]">
                <button
                  type="button"
                  onClick={() => setActiveTransferGoal(null)}
                  className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a] transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!parseFloat(transferAmount) || parseFloat(transferAmount) <= 0}
                  className={`px-5 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
                    transferType === 'deposit'
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 text-slate-950'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    ยืนยันการ{transferType === 'deposit' ? 'หยอดเงิน' : 'ถอนเงิน'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEDICATED POT HISTORY MODAL */}
      {viewingHistoryGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#21252d] border border-[#2f3645] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: viewingHistoryGoal.color }}
                >
                  <CategoryIcon name={viewingHistoryGoal.icon} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>ประวัติการออม: {viewingHistoryGoal.title}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    ยอดสะสม ฿{viewingHistoryGoal.currentAmount.toLocaleString()} / เป้าหมาย ฿{viewingHistoryGoal.targetAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingHistoryGoal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#2c3340] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions in Pot History */}
            <div className="flex items-center justify-between gap-2 p-3 bg-[#14181f] rounded-xl border border-[#282f3c] shrink-0">
              <div className="text-xs">
                <span className="text-slate-400">รายการทั้งหมด: </span>
                <span className="font-bold text-emerald-400">
                  {(recordsByGoal.get(viewingHistoryGoal.id) || []).length} รายการ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const g = viewingHistoryGoal;
                    setViewingHistoryGoal(null);
                    openTransferModal(g, 'deposit');
                  }}
                  className="px-3 py-1.5 bg-[#22332a] hover:bg-[#2b4236] border border-emerald-600/50 text-emerald-300 font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+ หยอดเงิน</span>
                </button>
                <button
                  onClick={() => {
                    const g = viewingHistoryGoal;
                    setViewingHistoryGoal(null);
                    openTransferModal(g, 'withdraw');
                  }}
                  className="px-3 py-1.5 bg-[#181c22] hover:bg-rose-950/40 border border-[#2f3645] hover:border-rose-800 text-slate-300 hover:text-rose-300 font-semibold text-xs rounded-lg flex items-center gap-1"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>- ถอนเงิน</span>
                </button>
              </div>
            </div>

            {/* Pot History List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {(recordsByGoal.get(viewingHistoryGoal.id) || []).length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  ยังไม่มีประวัติการหยอดหรือถอนเงินในกระปุกนี้
                </div>
              ) : (
                (recordsByGoal.get(viewingHistoryGoal.id) || []).map((rec) => {
                  const isDeposit = rec.type === 'deposit';
                  return (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl bg-[#181c22] border border-[#2a3242] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isDeposit
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isDeposit ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {isDeposit ? 'หยอดเงินเข้ากระปุก' : 'ถอนเงินออกจากกระปุก'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({rec.date})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {rec.notes || '- ไม่มีบันทึกช่วยจำ -'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-black text-sm whitespace-nowrap ${
                            isDeposit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}฿{rec.amount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => onDeleteRecord(rec, true)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-rose-950/30 transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-[#2f3645] flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setHistoryGoalFilter(viewingHistoryGoal.id);
                  setViewingHistoryGoal(null);
                  setViewMode('history');
                }}
                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>เปิดดูในตารางประวัติทั้งหมด</span>
                <span>➔</span>
              </button>
              <button
                onClick={() => setViewingHistoryGoal(null)}
                className="px-4 py-1.5 text-xs text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a]"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW / EDIT SAVINGS POT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#21252d] border border-[#2f3645] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingGoal ? 'แก้ไขกระปุกออมเงิน' : 'สร้างกระปุกออมเงินใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-[#282e3a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-emerald-400 mb-1">ชื่อกระปุก / เป้าหมายในฝัน *</label>
                <input
                  type="text"
                  placeholder="เช่น เงินสำรองฉุกเฉิน, ทริปเที่ยวญี่ปุ่น, ซื้อ MacBook ใหม่"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#14181f] border border-[#2f3645] rounded-xl text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-emerald-400 mb-1">เป้าหมายยอดเงิน (฿) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 50000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full p-2.5 bg-[#14181f] border border-[#2f3645] rounded-xl text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-400 mb-1">ยอดเงินเริ่มต้นในกระปุก (฿)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full p-2.5 bg-[#14181f] border border-[#2f3645] rounded-xl text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-400 mb-1">วันที่ต้องการให้สำเร็จ (ไม่บังคับ)</label>
                <DatePicker
                  id="goal-target-date-input"
                  value={targetDate}
                  onChange={setTargetDate}
                  placeholder="เลือกวันที่ต้องการให้สำเร็จ (YYYY-MM-DD)"
                  allowClear={true}
                  showShortcuts={false}
                />
              </div>

              {/* Color & Icon Picker */}
              <div>
                <label className="block font-semibold text-emerald-400 mb-1.5">โทนสีประจำกระปุก</label>
                <div className="flex items-center gap-2">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-400 mb-1.5">ไอคอนประจำกระปุก</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#14181f] rounded-xl border border-[#2f3645]">
                  {POPULAR_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-lg ${
                        icon === ic ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CategoryIcon name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-400 mb-1">บันทึกช่วยจำ / แรงบันดาลใจ</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ทยอยหยอดเดือนละ 5,000 บาท หลังเงินเดือนออก..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#14181f] border border-[#2f3645] rounded-xl text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a] transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingGoal ? 'บันทึกการแก้ไข' : 'สร้างกระปุก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
