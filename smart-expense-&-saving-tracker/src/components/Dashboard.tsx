import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  PiggyBank,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Camera,
  Mic,
  Calendar,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Target,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Category, FinancialRule, SavingsGoal, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  financialRule?: FinancialRule;
  onOpenRuleSettings?: () => void;
  selectedYear: number;
  selectedMonth: number; // 0-11 or -1 for all
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onOpenQuickAdd: () => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onNavigateTab: (tab: string) => void;
}

type DashboardTab = 'overview' | 'income' | 'expense' | 'savings';
type ChartPeriod = 'months' | 'weeks';

const MONTH_NAMES = [
  'มกราคม (ม.ค.)',
  'กุมภาพันธ์ (ก.พ.)',
  'มีนาคม (มี.ค.)',
  'เมษายน (เม.ย.)',
  'พฤษภาคม (พ.ค.)',
  'มิถุนายน (มิ.ย.)',
  'กรกฎาคม (ก.ค.)',
  'สิงหาคม (ส.ค.)',
  'กันยายน (ก.ย.)',
  'ตุลาคม (ต.ค.)',
  'พฤศจิกายน (พ.ย.)',
  'ธันวาคม (ธ.ค.)',
];

const SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  categories,
  savingsGoals,
  financialRule,
  onOpenRuleSettings,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  onOpenQuickAdd,
  onOpenScanner,
  onOpenVoice,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateTab,
}) => {
  // Interactive Dashboard active view tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('months');

  // Active Financial Rule (Dynamic)
  const activeRule = useMemo<FinancialRule>(() => {
    return (
      financialRule || {
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
        name: 'มาตรฐานสมดุล (50/30/20)',
      }
    );
  }, [financialRule]);

  const categoriesMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Filter transactions by selected year and month
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      const y = d.getFullYear();
      const m = d.getMonth();

      if (selectedYear !== -1 && y !== selectedYear) return false;
      if (selectedMonth !== -1 && m !== selectedMonth) return false;
      return true;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Core Financial KPIs
  const {
    totalIncome,
    totalExpense,
    totalSavings,
    remainingCash,
    totalNetSavings,
    expenseToIncomeRatio,
    savingsToIncomeRatio,
  } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let sav = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        inc += tx.amount;
      } else if (tx.type === 'savings') {
        sav += tx.amount;
      } else {
        exp += tx.amount;
      }
    });

    const rem = inc - exp - sav;
    const netSav = sav + Math.max(0, rem);
    const expRatio = inc > 0 ? (exp / inc) * 100 : exp > 0 ? 100 : 0;
    const savRatio = inc > 0 ? (netSav / inc) * 100 : 0;

    return {
      totalIncome: inc,
      totalExpense: exp,
      totalSavings: sav,
      remainingCash: rem,
      totalNetSavings: netSav,
      expenseToIncomeRatio: expRatio,
      savingsToIncomeRatio: savRatio,
    };
  }, [filteredTransactions]);

  // Grouped Bar Chart Data (Monthly 6-month comparison or Weekly comparison)
  const groupedBarData = useMemo(() => {
    if (chartPeriod === 'months') {
      // Last 6 months calculation
      const currentYear = selectedYear !== -1 ? selectedYear : new Date().getFullYear();
      const refMonth = selectedMonth !== -1 ? selectedMonth : new Date().getMonth();
      const monthsList: { year: number; month: number; label: string }[] = [];

      for (let i = 5; i >= 0; i--) {
        let m = refMonth - i;
        let y = currentYear;
        while (m < 0) {
          m += 12;
          y -= 1;
        }
        monthsList.push({
          year: y,
          month: m,
          label: `${SHORT_MONTHS[m]} ${y + 543}`,
        });
      }

      return monthsList.map(({ year, month, label }) => {
        let inc = 0;
        let exp = 0;
        let sav = 0;

        transactions.forEach((tx) => {
          const d = new Date(tx.date);
          if (d.getFullYear() === year && d.getMonth() === month) {
            if (tx.type === 'income') inc += tx.amount;
            else if (tx.type === 'savings') sav += tx.amount;
            else exp += tx.amount;
          }
        });

        return {
          name: label,
          income: inc,
          expense: exp,
          savings: sav,
          net: inc - exp - sav,
        };
      });
    } else {
      // Weekly breakdown for the currently selected month
      const targetMonth = selectedMonth === -1 ? new Date().getMonth() : selectedMonth;
      const targetYear = selectedYear === -1 ? new Date().getFullYear() : selectedYear;

      const weeks = [
        { name: 'สัปดาห์ 1 (1-7)', start: 1, end: 7, income: 0, expense: 0, savings: 0 },
        { name: 'สัปดาห์ 2 (8-14)', start: 8, end: 14, income: 0, expense: 0, savings: 0 },
        { name: 'สัปดาห์ 3 (15-21)', start: 15, end: 21, income: 0, expense: 0, savings: 0 },
        { name: 'สัปดาห์ 4 (22-สิ้นเดือน)', start: 22, end: 31, income: 0, expense: 0, savings: 0 },
      ];

      transactions.forEach((tx) => {
        const d = new Date(tx.date);
        if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
          const day = d.getDate();
          const targetWeek = weeks.find((w) => day >= w.start && day <= w.end) || weeks[3];
          if (tx.type === 'income') targetWeek.income += tx.amount;
          else if (tx.type === 'savings') targetWeek.savings += tx.amount;
          else targetWeek.expense += tx.amount;
        }
      });

      return weeks.map((w) => ({
        name: w.name,
        income: w.income,
        expense: w.expense,
        savings: w.savings,
        net: w.income - w.expense - w.savings,
      }));
    }
  }, [transactions, selectedYear, selectedMonth, chartPeriod]);

  // Donut Chart Data: Comparing Cashflow distribution
  const donutData = useMemo(() => {
    const list = [
      {
        name: 'รายจ่ายจริง (Actual Expense)',
        value: totalExpense,
        color: '#f43f5e',
        percentage: totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0,
      },
      {
        name: 'เงินออม & ลงทุน (Savings)',
        value: totalSavings,
        color: '#06b6d4',
        percentage: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0,
      },
      {
        name: 'สภาพคล่องคงเหลือ (Surplus)',
        value: Math.max(0, remainingCash),
        color: '#10b981',
        percentage: totalIncome > 0 ? (Math.max(0, remainingCash) / totalIncome) * 100 : 0,
      },
    ];
    return list.filter((item) => item.value > 0);
  }, [totalIncome, totalExpense, totalSavings, remainingCash]);

  // Radar Chart Data: 5-Axis Financial Health Scorecard (คำนวณตามเกณฑ์ activeRule แบบไดนามิก)
  const radarData = useMemo(() => {
    const targetSavings = Math.max(1, activeRule.savingsPercent || 20);
    const targetNeeds = Math.max(1, activeRule.needsPercent || 50);
    const targetWants = Math.max(1, activeRule.wantsPercent || 30);

    // 1. วินัยการออม & ลงทุน: คำนวณเทียบกับเป้าหมายที่ผู้ใช้ตั้งไว้ (เช่น 10%, 15%, 20%, 25%, 30%)
    const savingsScore = totalIncome > 0
      ? Math.min(100, Math.round((savingsToIncomeRatio / targetSavings) * 100))
      : totalSavings > 0 ? 80 : 40;

    // 2. การคุมรายจ่ายจำเป็น: เพดานตามสัดส่วน Needs ที่ตั้งไว้
    const expenseScore = totalIncome > 0
      ? Math.max(10, Math.min(100, Math.round(100 - Math.max(0, (totalExpense / totalIncome) * 100 - targetNeeds) * 1.5)))
      : totalExpense === 0 ? 70 : 40;

    // 3. ความมั่นคงของรายได้: การมีรายรับสม่ำเสมอ
    const incomeTxCount = filteredTransactions.filter((tx) => tx.type === 'income').length;
    const incomeScore = incomeTxCount > 0 ? Math.min(100, 60 + incomeTxCount * 15) : 30;

    // 4. สภาพคล่องฉุกเฉิน: กระแสเงินสดคงเหลือสุทธิ
    const liquidityScore = remainingCash >= 0 ? Math.min(100, 70 + Math.round((remainingCash / (totalIncome || 1)) * 30)) : 25;

    // 5. สมดุลความสุข (Joy): ประเมินเทียบกับสัดส่วน Wants ที่ผู้ใช้กำหนด
    const happinessSpending = filteredTransactions
      .filter((tx) => {
        if (tx.type !== 'expense') return false;
        const cat = categoriesMap.get(tx.categoryId);
        return cat?.isHappiness;
      })
      .reduce((acc, tx) => acc + tx.amount, 0);

    const happinessRatio = totalIncome > 0 ? (happinessSpending / totalIncome) * 100 : 0;
    const happinessScore = happinessRatio <= targetWants
      ? 95
      : Math.max(30, Math.round(95 - ((happinessRatio - targetWants) / targetWants) * 60));

    return [
      { subject: `วินัยการออม (เป้า ${targetSavings}%)`, score: savingsScore, fullMark: 100 },
      { subject: `คุมจ่ายจำเป็น (เป้า ${targetNeeds}%)`, score: expenseScore, fullMark: 100 },
      { subject: 'ความมั่นคงรายได้', score: incomeScore, fullMark: 100 },
      { subject: 'สภาพคล่องฉุกเฉิน', score: liquidityScore, fullMark: 100 },
      { subject: `สมดุลความสุข (เป้า ${targetWants}%)`, score: happinessScore, fullMark: 100 },
    ];
  }, [savingsToIncomeRatio, totalIncome, totalExpense, totalSavings, filteredTransactions, remainingCash, categoriesMap, activeRule]);

  // Overall Financial Health Average Score
  const overallHealthScore = useMemo(() => {
    const avg = radarData.reduce((acc, d) => acc + d.score, 0) / radarData.length;
    return Math.round(avg);
  }, [radarData]);

  // Category breakdown for expenses
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => ({
        category: categoriesMap.get(catId),
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categoriesMap, totalExpense]);

  // Category breakdown for income
  const categoryIncomes = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === 'income')
      .forEach((tx) => {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
      });

    return Array.from(map.entries())
      .map(([catId, amount]) => ({
        category: categoriesMap.get(catId),
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categoriesMap, totalIncome]);

  // Savings distribution across goals
  const savingsDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === 'savings')
      .forEach((tx) => {
        const goalKey = tx.goalId || 'general';
        map.set(goalKey, (map.get(goalKey) || 0) + tx.amount);
      });

    return Array.from(map.entries()).map(([goalId, amount]) => {
      const goal = savingsGoals.find((g) => g.id === goalId);
      return {
        goalName: goal ? goal.name : 'เงินออมทั่วไป / พอร์ตลงทุน',
        goalTarget: goal?.targetAmount,
        goalCurrent: goal?.currentAmount,
        amount,
        percentage: totalSavings > 0 ? (amount / totalSavings) * 100 : 0,
      };
    });
  }, [filteredTransactions, savingsGoals, totalSavings]);

  // Filtered transactions for the selected active tab
  const tabTransactions = useMemo(() => {
    if (activeTab === 'income') {
      return filteredTransactions.filter((tx) => tx.type === 'income');
    }
    if (activeTab === 'expense') {
      return filteredTransactions.filter((tx) => tx.type === 'expense');
    }
    if (activeTab === 'savings') {
      return filteredTransactions.filter((tx) => tx.type === 'savings');
    }
    return filteredTransactions;
  }, [filteredTransactions, activeTab]);

  // Custom Recharts Grouped Bar Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const inc = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
      const exp = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
      const sav = payload.find((p: any) => p.dataKey === 'savings')?.value || 0;
      const net = inc - exp - sav;

      return (
        <div className="bg-[#1b2028] border border-[#2f3849] p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-white border-b border-[#2e3747] pb-1">
            {label}
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>รายรับ:</span>
            <span className="font-mono font-bold">+฿{inc.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-rose-400">
            <span>รายจ่ายจริง:</span>
            <span className="font-mono font-bold">-฿{exp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-cyan-400">
            <span>เงินออม/ลงทุน:</span>
            <span className="font-mono font-bold">฿{sav.toLocaleString()}</span>
          </div>
          <div className="pt-1.5 border-t border-[#2e3747] flex justify-between items-center font-bold">
            <span className="text-slate-300">กระแสเงินสดคงเหลือ:</span>
            <span className={net >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
              {net >= 0 ? '+' : ''}฿{net.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* 1. Header Toolbar: Period selector & Quick Action shortcuts */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-white tracking-tight">
              Interactive Analytics Dashboard
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              Multi-View
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            แสดงผลเปรียบเทียบระหว่าง รายรับ, รายจ่ายจริง (หักเงินออมแล้ว), และกองทุน/เงินออม แบบครบวงจร
          </p>
        </div>

        {/* Month & Year Filter Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <select
            id="dashboard-year-select"
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="px-3 py-2 bg-[#171a20] border border-[#2e3544] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            <option value={-1}>ทุกปี</option>
            <option value={2026}>2026 (พ.ศ. 2569)</option>
            <option value={2025}>2025 (พ.ศ. 2568)</option>
            <option value={2024}>2024 (พ.ศ. 2567)</option>
          </select>

          {/* Month selector */}
          <select
            id="dashboard-month-select"
            value={selectedMonth}
            onChange={(e) => onMonthChange(parseInt(e.target.value))}
            className="px-3 py-2 bg-[#171a20] border border-[#2e3544] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            <option value={-1}>ทุกเดือนในรอบปี</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs (ระบบปุ่มแท็บคลิกแยกดูแต่ละประเภท) */}
      <div className="p-1.5 bg-[#181c22] rounded-2xl border border-[#2b3341] flex items-center gap-1.5 overflow-x-auto shadow-inner scrollbar-thin">
        <button
          id="dash-tab-overview"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-[#242b37] to-[#1e2430] text-emerald-300 border border-emerald-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-[#202632]'
          }`}
        >
          <Layers className={`w-4 h-4 ${activeTab === 'overview' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>🌟 ภาพรวมกระแสเงินสด</span>
        </button>

        <button
          id="dash-tab-income"
          onClick={() => setActiveTab('income')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'income'
              ? 'bg-gradient-to-r from-emerald-950/70 to-emerald-900/40 text-emerald-300 border border-emerald-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-[#202632]'
          }`}
        >
          <TrendingUp className={`w-4 h-4 ${activeTab === 'income' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>🟢 วิเคราะห์รายรับ</span>
        </button>

        <button
          id="dash-tab-expense"
          onClick={() => setActiveTab('expense')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'expense'
              ? 'bg-gradient-to-r from-rose-950/70 to-rose-900/40 text-rose-300 border border-rose-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-[#202632]'
          }`}
        >
          <TrendingDown className={`w-4 h-4 ${activeTab === 'expense' ? 'text-rose-400' : 'text-slate-400'}`} />
          <span>🔴 รายจ่ายจริง (หักเงินออม)</span>
        </button>

        <button
          id="dash-tab-savings"
          onClick={() => setActiveTab('savings')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'savings'
              ? 'bg-gradient-to-r from-cyan-950/70 to-cyan-900/40 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-[#202632]'
          }`}
        >
          <PiggyBank className={`w-4 h-4 ${activeTab === 'savings' ? 'text-cyan-400' : 'text-slate-400'}`} />
          <span>🔵 กองทุน & เงินออม</span>
        </button>
      </div>

      {/* 3. Top Metric Cards (Card เมตริกด้านบนตามเรฟเฟอเรนซ์หน้าแดชบอร์ด) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Income */}
        <div
          id="metric-card-income"
          className={`p-4 rounded-2xl bg-[#21252d] border transition-all relative overflow-hidden shadow-lg ${
            activeTab === 'income' || activeTab === 'overview'
              ? 'border-emerald-500/40 bg-gradient-to-b from-[#21252d] to-emerald-950/20'
              : 'border-[#2c3442]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              รายรับทั้งหมด
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-white tracking-tight font-mono">
              ฿{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-300">
              <span>จำนวนธุรกรรม:</span>
              <span className="font-bold text-emerald-400">
                {filteredTransactions.filter((t) => t.type === 'income').length} รายการ
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Actual Expense (Explicitly Excluding Savings) */}
        <div
          id="metric-card-expense"
          className={`p-4 rounded-2xl bg-[#21252d] border transition-all relative overflow-hidden shadow-lg ${
            activeTab === 'expense' || activeTab === 'overview'
              ? 'border-rose-500/40 bg-gradient-to-b from-[#21252d] to-rose-950/20'
              : 'border-[#2c3442]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">
                รายจ่ายจริง
              </span>
              <span className="text-[9px] text-rose-400/80 font-medium">
                (แยกหักเงินออมแล้ว)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white tracking-tight font-mono">
              ฿{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-300">
              <span>อัตราต่อรายได้:</span>
              <span className={`font-bold ${expenseToIncomeRatio > 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {expenseToIncomeRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Savings & Investment Transfers */}
        <div
          id="metric-card-savings"
          className={`p-4 rounded-2xl bg-[#21252d] border transition-all relative overflow-hidden shadow-lg ${
            activeTab === 'savings' || activeTab === 'overview'
              ? 'border-cyan-500/40 bg-gradient-to-b from-[#21252d] to-cyan-950/20'
              : 'border-[#2c3442]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
                กองทุน & เงินออม
              </span>
              <span className="text-[9px] text-cyan-400/80 font-medium">
                (โอนเข้ากระปุก/ลงทุน)
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-white tracking-tight font-mono">
              ฿{totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-300">
              <span>โอนเข้าเป้าหมาย:</span>
              <span className="font-bold text-cyan-400">
                {filteredTransactions.filter((t) => t.type === 'savings').length} ครั้ง
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Statement Net Surplus */}
        <div
          id="metric-card-surplus"
          className="p-4 rounded-2xl bg-[#21252d] border border-[#2c3442] shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              สภาพคล่องคงเหลือ
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl font-black tracking-tight font-mono ${
              remainingCash >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              ฿{remainingCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-300">
              <span>สถานะกระแสเงินสด:</span>
              <span className={`font-bold ${remainingCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {remainingCash >= 0 ? 'เป็นบวก (Surplus)' : 'ติดลบ (Deficit)'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Net Savings & Investment Rate (คำนวณเทียบเป้าหมายกฎทอง) */}
        <div
          id="metric-card-savings-rate"
          className="p-4 rounded-2xl bg-[#21252d] border border-teal-500/30 bg-gradient-to-b from-[#21252d] to-teal-950/20 shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                สัดส่วนเงินออมสุทธิ
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                เป้า {activeRule.savingsPercent}%
              </span>
            </div>
            {onOpenRuleSettings ? (
              <button
                id="edit-rule-kpi-btn"
                type="button"
                onClick={onOpenRuleSettings}
                className="w-7 h-7 rounded-lg bg-teal-500/20 hover:bg-teal-500/35 text-teal-300 border border-teal-500/40 flex items-center justify-center transition-colors"
                title="คลิกเพื่อปรับเกณฑ์เป้าหมายเงินออม (Customizable Financial Rule)"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-black text-white tracking-tight font-mono">
                {savingsToIncomeRatio.toFixed(1)}%
              </div>
              <span
                className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                  savingsToIncomeRatio >= activeRule.savingsPercent
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {savingsToIncomeRatio >= activeRule.savingsPercent
                  ? '✓ ถึงเกณฑ์เป้าหมาย'
                  : `ขาด ${(activeRule.savingsPercent - savingsToIncomeRatio).toFixed(1)}%`}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-teal-300/80">
              <span>เงินออมสุทธิรวม:</span>
              <span className="font-bold text-emerald-300 font-mono">
                ฿{totalNetSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Primary Visualization: Grouped Bar Chart (กราฟแท่งเปรียบเทียบแบบกลุ่ม) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2f3645] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                กราฟแท่งเปรียบเทียบแบบกลุ่ม (Grouped Bar Chart)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              เปรียบเทียบมิติกระแสเงินสด: รายรับ (เขียว) vs รายจ่ายจริงหักเงินออม (แดง) vs กองทุนและเงินออม (ฟ้า)
            </p>
          </div>

          {/* Grouped Bar Period Switcher */}
          <div className="flex items-center gap-1.5 bg-[#171b22] p-1 rounded-xl border border-[#2d3646] self-start sm:self-auto">
            <button
              id="chart-period-months"
              onClick={() => setChartPeriod('months')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                chartPeriod === 'months'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ย้อนหลัง 6 เดือน
            </button>
            <button
              id="chart-period-weeks"
              onClick={() => setChartPeriod('weeks')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                chartPeriod === 'weeks'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              แยกตามสัปดาห์ในเดือนนี้
            </button>
          </div>
        </div>

        {/* Grouped Bar Chart Container */}
        <div className="w-full h-[320px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupedBarData}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              barGap={4}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2b3341" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#2e3747' }}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#2e3747' }}
                tickLine={false}
                tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <RechartsLegend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-xs text-slate-300 font-semibold mx-1.5">{value}</span>
                )}
              />
              <Bar
                dataKey="income"
                name="รายรับ (Income)"
                fill="#10b981"
                radius={[5, 5, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expense"
                name="รายจ่ายจริง (Actual Expense)"
                fill="#f43f5e"
                radius={[5, 5, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="savings"
                name="เงินออม & ลงทุน (Savings)"
                fill="#06b6d4"
                radius={[5, 5, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Secondary Visualizations: Donut Chart & Radar Chart (กราฟสัดส่วน) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Donut Chart (Cash Flow Distribution) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#2f3645] pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-teal-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  สัดส่วนกระแสเงินสด (Donut Chart)
                </h3>
                <p className="text-xs text-slate-300">
                  สัดส่วนรายจ่ายจริง vs เงินออม&ลงทุน vs สภาพคล่องคงเหลือ
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30">
              100% Inflow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 py-2">
            <div className="h-[220px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1b2028" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, 'จำนวนเงิน']}
                    contentStyle={{
                      backgroundColor: '#1b2028',
                      borderColor: '#2f3849',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Donut Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400">รายรับรวม</span>
                <span className="text-sm font-black text-white font-mono">
                  ฿{(totalIncome / 1000).toFixed(1)}k
                </span>
              </div>
            </div>

            {/* Donut Legend & Percent Breakdown */}
            <div className="space-y-2.5">
              {donutData.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#171b22] border border-[#2b3341] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">
                      ฿{item.value.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono font-semibold">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customizable Golden Rule Display Card */}
          <div className="p-3 rounded-xl bg-[#171b22]/90 border border-[#2a313e] text-[11px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                กฎทองของคุณ ({activeRule.needsPercent}/{activeRule.wantsPercent}/{activeRule.savingsPercent}):
              </span>
              <span className="text-slate-300 font-mono">
                เป้าหมายออม {activeRule.savingsPercent}% | ปัจจุบันทำได้{' '}
                <strong
                  className={
                    savingsToIncomeRatio >= activeRule.savingsPercent
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }
                >
                  {savingsToIncomeRatio.toFixed(1)}%
                </strong>
              </span>
            </div>
            {onOpenRuleSettings && (
              <button
                id="edit-rule-donut-card-btn"
                type="button"
                onClick={onOpenRuleSettings}
                className="px-2.5 py-1 rounded-lg bg-[#202735] hover:bg-[#2a3447] text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>ปรับเกณฑ์เป้าหมาย</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Radar Chart (Financial Health 5-Axis Scorecard) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#2f3645] pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    ดัชนีสุขภาพการเงิน 5 มิติ (Radar Chart)
                  </h3>
                  {onOpenRuleSettings && (
                    <button
                      id="radar-rule-settings-icon-btn"
                      type="button"
                      onClick={onOpenRuleSettings}
                      className="p-1 rounded-lg hover:bg-[#293242] text-slate-400 hover:text-emerald-300 transition-colors"
                      title="ปรับเปลี่ยนเกณฑ์เป้าหมายประเมิน (Financial Rule)"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  ประเมินสมดุลวินัยการออม, การคุมรายจ่าย, ความมั่นคง และสภาพคล่องตามเกณฑ์ {activeRule.needsPercent}/{activeRule.wantsPercent}/{activeRule.savingsPercent}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-3 py-1 rounded-xl border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-black text-white font-mono">
                {overallHealthScore}/100
              </span>
            </div>
          </div>

          <div className="h-[250px] w-full flex items-center justify-center py-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#2c3545" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#94a3b8"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                />
                <Radar
                  name="คะแนนสุขภาพการเงิน"
                  dataKey="score"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <RechartsTooltip
                  formatter={(val: any) => [`${val} คะแนน (เต็ม 100)`, 'ดัชนี']}
                  contentStyle={{
                    backgroundColor: '#1b2028',
                    borderColor: '#2f3849',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
            <div className="p-2 rounded-xl bg-[#171b22] border border-[#2b3341]">
              <span className="text-slate-400 block text-[10px]">สถานะวินัยการเงิน</span>
              <span className="font-bold text-emerald-400">
                {overallHealthScore >= 80 ? 'ดีเยี่ยม (Excellent)' : overallHealthScore >= 60 ? 'มั่นคง (Good)' : 'ควรปรับปรุง'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#171b22] border border-[#2b3341]">
              <span className="text-slate-400 block text-[10px]">ความเสี่ยงกระแสเงินสด</span>
              <span className="font-bold text-teal-300">
                {remainingCash >= 0 ? 'ความเสี่ยงต่ำ' : 'ระวังขาดสภาพคล่อง'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Dynamic Tab-Specific Drilldowns (ขึ้นอยู่กับแท็บที่เลือก) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-[#2f3645] pb-3">
          <div className="flex items-center gap-2">
            {activeTab === 'overview' && <Layers className="w-5 h-5 text-emerald-400" />}
            {activeTab === 'income' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
            {activeTab === 'expense' && <TrendingDown className="w-5 h-5 text-rose-400" />}
            {activeTab === 'savings' && <PiggyBank className="w-5 h-5 text-cyan-400" />}
            <h3 className="text-base font-bold text-white">
              {activeTab === 'overview' && 'เจาะลึกรายการและหมวดหมู่สำคัญ (Active Summary)'}
              {activeTab === 'income' && 'เจาะลึกแหล่งรายรับและการเติบโต (Income Breakdown)'}
              {activeTab === 'expense' && 'เจาะลึกรายจ่ายจริงตามหมวดหมู่ (Pure Expense Breakdown)'}
              {activeTab === 'savings' && 'เจาะลึกการจัดสรรเงินออมและกองทุนเป้าหมาย (Wealth Allocation)'}
            </h3>
          </div>

          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>ดูทั้งหมดในหน้ารายการ</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab: Overview (Top Category Expenses + Top Savings Progress) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Expenses */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>หมวดหมู่รายจ่ายจริงสูงสุด (Top Expenses)</span>
                <span className="text-[10px] text-rose-400">ไม่รวมเงินออม</span>
              </div>
              <div className="space-y-2">
                {categoryExpenses.slice(0, 4).map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#171b22] border border-[#2b3341] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: item.category ? `${item.category.color}22` : '#2d3748',
                          color: item.category?.color || '#cbd5e1',
                        }}
                      >
                        <CategoryIcon name={item.category?.icon || 'ShoppingBag'} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {item.category?.name || 'ทั่วไป'}
                        </span>
                        <div className="w-24 sm:w-32 bg-[#252d3d] h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">
                        ฿{item.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.percentage.toFixed(1)}% ของรายจ่าย
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Goals Snapshot */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>กระปุกออมเงินและกองทุน (Savings Goals)</span>
                <button
                  onClick={() => onNavigateTab('goals')}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  จัดการกระปุก
                </button>
              </div>
              <div className="space-y-2">
                {savingsGoals.slice(0, 4).map((goal) => {
                  const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  return (
                    <div
                      key={goal.id}
                      className="p-3 rounded-xl bg-[#171b22] border border-[#2b3341] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
                        >
                          <CategoryIcon name={goal.icon} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {goal.name}
                          </span>
                          <div className="w-24 sm:w-32 bg-[#252d3d] h-1.5 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percent}%`, backgroundColor: goal.color }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-cyan-400 font-mono">
                          ฿{goal.currentAmount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {percent}% ของ ฿{goal.targetAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Income Drilldown */}
        {activeTab === 'income' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-emerald-400">สัดส่วนรายรับตามหมวดหมู่</h4>
              {categoryIncomes.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#171b22] border border-[#2b3341] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: item.category ? `${item.category.color}22` : '#2d3748',
                        color: item.category?.color || '#cbd5e1',
                      }}
                    >
                      <CategoryIcon name={item.category?.icon || 'Coins'} className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {item.category?.name || 'รายรับอื่นๆ'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        สัดส่วน {item.percentage.toFixed(1)}% ของรายรับรวม
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      +฿{item.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300">รายการรายรับล่าสุด</h4>
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                {tabTransactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-[#171b22] border border-[#262e3d] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{tx.merchant || 'รายรับ'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.date}</div>
                    </div>
                    <div className="font-bold text-emerald-400 font-mono">
                      +฿{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Actual Expense Drilldown */}
        {activeTab === 'expense' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-rose-400">
                หมวดหมู่รายจ่ายจริงทั้งหมด (Pure Expense)
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {categoryExpenses.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#171b22] border border-[#2b3341] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{
                          backgroundColor: item.category ? `${item.category.color}22` : '#2d3748',
                          color: item.category?.color || '#cbd5e1',
                        }}
                      >
                        <CategoryIcon name={item.category?.icon || 'ShoppingBag'} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {item.category?.name || 'ทั่วไป'}
                          {item.category?.isHappiness && (
                            <span className="text-[9px] text-amber-300 bg-amber-400/20 px-1.5 rounded-full border border-amber-400/30">
                              หมวดความสุข
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.percentage.toFixed(1)}% ของรายจ่ายจริง
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-400 font-mono">
                      -฿{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300">รายการรายจ่ายจริงล่าสุด</h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                {tabTransactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-[#171b22] border border-[#262e3d] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{tx.merchant || 'ค่าใช้จ่าย'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.date}</div>
                    </div>
                    <div className="font-bold text-rose-400 font-mono">
                      -฿{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Savings & Investment Drilldown */}
        {activeTab === 'savings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-cyan-400">
                การกระจายเงินออมสู่กระปุกเป้าหมาย & กองทุน
              </h4>
              <div className="space-y-2">
                {savingsDistribution.map((dist, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#171b22] border border-[#2b3341] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {dist.goalName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        สัดส่วน {dist.percentage.toFixed(1)}% ของเงินออมทั้งหมด
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-cyan-400 font-mono">
                        ฿{dist.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300">ประวัติการโอนออมเงินล่าสุด</h4>
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                {tabTransactions.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    ยังไม่มีรายการบันทึกเงินออมในรอบนี้
                  </div>
                ) : (
                  tabTransactions.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-[#171b22] border border-[#262e3d] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{tx.merchant || 'โอนออมเงิน'}</span>
                          <span className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1.5 rounded-full border border-cyan-500/30">
                            เข้ากองทุน
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{tx.date}</div>
                      </div>
                      <div className="font-bold text-cyan-400 font-mono">
                        ฿{tx.amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
