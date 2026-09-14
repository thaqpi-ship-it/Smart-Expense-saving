import React, { useState, useEffect, useMemo } from 'react';
import { Category, FinancialRule, SavingsGoal, SavingsRecord, Transaction, TransactionType } from './types';
import {
  loadCategories,
  loadFinancialRule,
  loadSavingsGoals,
  loadSavingsRecords,
  loadTransactions,
  resetAllData,
  saveCategories,
  saveFinancialRule,
  saveSavingsGoals,
  saveSavingsRecords,
  saveTransactions,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsList } from './components/TransactionsList';
import { BudgetManager } from './components/BudgetManager';
import { SavingsGoals } from './components/SavingsGoals';
import { CategoriesManager } from './components/CategoriesManager';
import { ReportsExport } from './components/ReportsExport';
import { TransactionModal } from './components/TransactionModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { VoiceTextInputModal } from './components/VoiceTextInputModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FinancialRuleModal } from './components/FinancialRuleModal';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => loadSavingsGoals());
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>(() => loadSavingsRecords());
  const [financialRule, setFinancialRule] = useState<FinancialRule>(() => loadFinancialRule());

  // Date filtering state
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  // Default to September (month index 8)
  const [selectedMonth, setSelectedMonth] = useState<number>(8);

  // Active view tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Sidebar responsive states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);

  // Deletion modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Calculate current operating net balance (Statement Cash Balance)
  const currentNetBalance = useMemo(() => {
    let income = 0;
    let expense = 0;
    let savings = 0;
    transactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'savings') savings += tx.amount;
      else expense += tx.amount;
    });
    return income - expense - savings;
  }, [transactions]);

  // Total accumulated savings & investments
  const totalSavings = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'savings')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

  // Recent merchants history for smart auto-categorization
  const recentMerchants = useMemo(() => {
    const list: { merchant: string; categoryId: string; type: TransactionType }[] = [];
    const seen = new Set<string>();

    // Scan newest first
    const sorted = [...transactions].sort((a, b) => b.createdAt - a.createdAt);
    sorted.forEach((tx) => {
      if (tx.merchant && !seen.has(tx.merchant.toLowerCase().trim())) {
        seen.add(tx.merchant.toLowerCase().trim());
        list.push({
          merchant: tx.merchant,
          categoryId: tx.categoryId,
          type: tx.type,
        });
      }
    });

    return list;
  }, [transactions]);

  // Persistence handlers with Auto-Sync for Savings Goals
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    txId?: string
  ) => {
    let updatedGoals = [...savingsGoals];
    let updatedRecords = [...savingsRecords];

    if (txId) {
      // Edit existing transaction
      const existingTx = transactions.find((t) => t.id === txId);

      // If existing transaction was previously linked to a savings goal, revert that previous deposit
      if (existingTx && existingTx.type === 'savings' && existingTx.goalId) {
        updatedGoals = updatedGoals.map((g) =>
          g.id === existingTx.goalId
            ? { ...g, currentAmount: Math.max(0, g.currentAmount - existingTx.amount) }
            : g
        );
        updatedRecords = updatedRecords.filter(
          (r) => r.transactionId !== txId && r.id !== existingTx.savingsRecordId
        );
      }

      let newRecordId: string | undefined = undefined;

      // If newly updated transaction is savings and linked to a goal, create/apply new deposit
      if (txData.type === 'savings' && txData.goalId) {
        newRecordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newRecord: SavingsRecord = {
          id: newRecordId,
          goalId: txData.goalId,
          type: 'deposit',
          amount: txData.amount,
          date: txData.date,
          notes: txData.notes
            ? `${txData.notes} (Auto-Sync จาก Statement)`
            : 'โอนเงินออม (Auto-Sync จาก Statement)',
          transactionId: txId,
          createdAt: Date.now(),
        };
        updatedRecords = [newRecord, ...updatedRecords];
        updatedGoals = updatedGoals.map((g) =>
          g.id === txData.goalId
            ? { ...g, currentAmount: g.currentAmount + txData.amount }
            : g
        );
      }

      const updated = transactions.map((t) =>
        t.id === txId
          ? {
              ...t,
              ...txData,
              savingsRecordId: newRecordId !== undefined ? newRecordId : t.savingsRecordId,
            }
          : t
      );

      setTransactions(updated);
      saveTransactions(updated);
      setSavingsGoals(updatedGoals);
      saveSavingsGoals(updatedGoals);
      setSavingsRecords(updatedRecords);
      saveSavingsRecords(updatedRecords);
    } else {
      // Add new transaction
      const generatedTxId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      let newRecordId: string | undefined = undefined;

      // Auto-Sync: If transaction is 'savings' and target goalId is selected
      if (txData.type === 'savings' && txData.goalId) {
        newRecordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newRecord: SavingsRecord = {
          id: newRecordId,
          goalId: txData.goalId,
          type: 'deposit',
          amount: txData.amount,
          date: txData.date,
          notes: txData.notes
            ? `${txData.notes} (Auto-Sync จาก Statement)`
            : 'โอนเงินออม (Auto-Sync จาก Statement)',
          transactionId: generatedTxId,
          createdAt: Date.now(),
        };

        updatedRecords = [newRecord, ...updatedRecords];
        updatedGoals = updatedGoals.map((g) =>
          g.id === txData.goalId
            ? { ...g, currentAmount: g.currentAmount + txData.amount }
            : g
        );

        setSavingsGoals(updatedGoals);
        saveSavingsGoals(updatedGoals);
        setSavingsRecords(updatedRecords);
        saveSavingsRecords(updatedRecords);
      }

      const newTx: Transaction = {
        ...txData,
        id: generatedTxId,
        savingsRecordId: newRecordId,
        createdAt: Date.now(),
      };

      const updated = [newTx, ...transactions];
      setTransactions(updated);
      saveTransactions(updated);
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    const isLinkedSavings = tx.type === 'savings' && tx.goalId;
    const targetGoal = isLinkedSavings ? savingsGoals.find((g) => g.id === tx.goalId) : null;

    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบรายการ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "${tx.merchant || 'รายการนี้'}" (฿${tx.amount.toLocaleString()})? ${
        targetGoal
          ? `ระบบจะทำการปรับลดยอดเงินในกระปุก "${targetGoal.title}" คืนให้ ฿${tx.amount.toLocaleString()} อัตโนมัติ`
          : ''
      }`,
      onConfirm: () => {
        // If linked savings, revert goal balance and remove linked savings record
        if (isLinkedSavings) {
          const updatedGoals = savingsGoals.map((g) =>
            g.id === tx.goalId
              ? { ...g, currentAmount: Math.max(0, g.currentAmount - tx.amount) }
              : g
          );
          const updatedRecords = savingsRecords.filter(
            (r) => r.transactionId !== tx.id && r.id !== tx.savingsRecordId
          );
          setSavingsGoals(updatedGoals);
          saveSavingsGoals(updatedGoals);
          setSavingsRecords(updatedRecords);
          saveSavingsRecords(updatedRecords);
        }

        const updated = transactions.filter((t) => t.id !== tx.id);
        setTransactions(updated);
        saveTransactions(updated);
      },
    });
  };

  const handleUpdateCategoryBudget = (
    categoryId: string,
    newBudget: number,
    isHappiness?: boolean
  ) => {
    const updated = categories.map((c) =>
      c.id === categoryId
        ? {
            ...c,
            budgetMonthly: newBudget,
            isHappiness: isHappiness !== undefined ? isHappiness : c.isHappiness,
          }
        : c
    );
    setCategories(updated);
    saveCategories(updated);
  };

  const handleSaveCategory = (cat: Category) => {
    const exists = categories.some((c) => c.id === cat.id);
    const updated = exists
      ? categories.map((c) => (c.id === cat.id ? cat : c))
      : [...categories, cat];

    setCategories(updated);
    saveCategories(updated);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบหมวดหมู่',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat?.name || 'หมวดหมู่นี้'}"?`,
      onConfirm: () => {
        const updated = categories.filter((c) => c.id !== categoryId);
        setCategories(updated);
        saveCategories(updated);
      },
    });
  };

  const handleSaveGoal = (goal: SavingsGoal) => {
    const exists = savingsGoals.some((g) => g.id === goal.id);
    const updated = exists
      ? savingsGoals.map((g) => (g.id === goal.id ? goal : g))
      : [...savingsGoals, goal];

    setSavingsGoals(updated);
    saveSavingsGoals(updated);
  };

  const handleDeleteGoal = (goalId: string) => {
    const g = savingsGoals.find((item) => item.id === goalId);
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบกระปุกเป้าหมาย',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมายการออม "${g?.title || 'เป้าหมายนี้'}"? ประวัติการหยอด/ถอนทั้งหมดของกระปุกนี้จะถูกลบออกด้วย`,
      onConfirm: () => {
        const updated = savingsGoals.filter((item) => item.id !== goalId);
        const updatedRecords = savingsRecords.filter((r) => r.goalId !== goalId);
        setSavingsGoals(updated);
        saveSavingsGoals(updated);
        setSavingsRecords(updatedRecords);
        saveSavingsRecords(updatedRecords);
      },
    });
  };

  const handleAddSavingsRecord = (recordData: {
    goalId: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    date: string;
    notes?: string;
  }) => {
    const newRecord: SavingsRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      goalId: recordData.goalId,
      type: recordData.type,
      amount: recordData.amount,
      date: recordData.date,
      notes: recordData.notes?.trim() || undefined,
      createdAt: Date.now(),
    };

    const delta = recordData.type === 'deposit' ? recordData.amount : -recordData.amount;
    const updatedGoals = savingsGoals.map((g) => {
      if (g.id === recordData.goalId) {
        const nextAmt = Math.max(0, g.currentAmount + delta);
        return { ...g, currentAmount: nextAmt };
      }
      return g;
    });

    const updatedRecords = [newRecord, ...savingsRecords];
    setSavingsGoals(updatedGoals);
    saveSavingsGoals(updatedGoals);
    setSavingsRecords(updatedRecords);
    saveSavingsRecords(updatedRecords);
  };

  const handleDeleteSavingsRecord = (record: SavingsRecord, revertGoalBalance: boolean = true) => {
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบประวัติรายการออม',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการ${record.type === 'deposit' ? 'หยอดเงิน' : 'ถอนเงิน'} ฿${record.amount.toLocaleString()} ${record.notes ? `("${record.notes}")` : ''}? ${revertGoalBalance ? 'ยอดเงินในกระปุกจะถูกปรับคืนให้อัตโนมัติ' : ''}`,
      onConfirm: () => {
        if (revertGoalBalance) {
          const delta = record.type === 'deposit' ? -record.amount : record.amount;
          const updatedGoals = savingsGoals.map((g) => {
            if (g.id === record.goalId) {
              return { ...g, currentAmount: Math.max(0, g.currentAmount + delta) };
            }
            return g;
          });
          setSavingsGoals(updatedGoals);
          saveSavingsGoals(updatedGoals);
        }

        const updatedRecords = savingsRecords.filter((r) => r.id !== record.id);
        setSavingsRecords(updatedRecords);
        saveSavingsRecords(updatedRecords);
      },
    });
  };

  const handleDepositWithdrawGoal = (goalId: string, deltaAmount: number) => {
    handleAddSavingsRecord({
      goalId,
      type: deltaAmount >= 0 ? 'deposit' : 'withdraw',
      amount: Math.abs(deltaAmount),
      date: new Date().toISOString().split('T')[0],
      notes: deltaAmount >= 0 ? 'หยอดเงินเข้ากระปุก' : 'ถอนเงินออกจากกระปุก',
    });
  };

  const handleResetData = () => {
    setDeleteModalState({
      isOpen: true,
      title: 'รีเซ็ตข้อมูลตัวอย่างทั้งหมด',
      message: 'ต้องการกู้คืนข้อมูลรายการบันทึก งบประมาณ หมวดหมู่ และกระปุกออมเงินกลับสู่สถานะเริ่มต้นหรือไม่?',
      onConfirm: () => {
        const res = resetAllData();
        setTransactions(res.transactions);
        setCategories(res.categories);
        setSavingsGoals(res.goals);
        setSavingsRecords(res.savingsRecords);
        setFinancialRule(res.financialRule);
      },
    });
  };

  const handleSaveFinancialRule = (newRule: FinancialRule) => {
    setFinancialRule(newRule);
    saveFinancialRule(newRule);
  };

  return (
    <div className="min-h-screen bg-[#181b20] text-slate-100 flex selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQuickAdd={() => {
          setEditingTx(null);
          setIsTxModalOpen(true);
        }}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenRuleSettings={() => setIsRuleModalOpen(true)}
        onResetData={handleResetData}
        currentNetBalance={currentNetBalance}
        totalSavings={totalSavings}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          onOpenQuickAdd={() => {
            setEditingTx(null);
            setIsTxModalOpen(true);
          }}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenVoice={() => setIsVoiceOpen(true)}
          onOpenRuleSettings={() => setIsRuleModalOpen(true)}
          onResetData={handleResetData}
          currentNetBalance={currentNetBalance}
          onToggleSidebar={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsMobileSidebarOpen((prev) => !prev);
            } else {
              setIsSidebarCollapsed((prev) => !prev);
            }
          }}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            categories={categories}
            savingsGoals={savingsGoals}
            financialRule={financialRule}
            onOpenRuleSettings={() => setIsRuleModalOpen(true)}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={(y) => setSelectedYear(y)}
            onMonthChange={(m) => setSelectedMonth(m)}
            onOpenQuickAdd={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenVoice={() => setIsVoiceOpen(true)}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsList
            transactions={transactions}
            categories={categories}
            onAddTransaction={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTx(tx);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetManager
            categories={categories}
            transactions={transactions}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}

        {activeTab === 'goals' && (
          <SavingsGoals
            goals={savingsGoals}
            records={savingsRecords}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
            onAddRecord={handleAddSavingsRecord}
            onDeleteRecord={handleDeleteSavingsRecord}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesManager
            categories={categories}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsExport transactions={transactions} categories={categories} />
        )}
      </main>
      </div>

      {/* Quick Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTx}
        categories={categories}
        savingsGoals={savingsGoals}
        recentMerchants={recentMerchants}
      />

      {/* AI Slip / Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveExtracted={(tx) => handleSaveTransaction(tx)}
        categories={categories}
      />

      {/* AI Voice & Natural Text Modal */}
      <VoiceTextInputModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSaveExtracted={(tx) => handleSaveTransaction(tx)}
        categories={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        message={deleteModalState.message}
        onConfirm={deleteModalState.onConfirm}
        onClose={() => setDeleteModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Customizable Financial Rule (Golden Rule) Settings Modal */}
      <FinancialRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        currentRule={financialRule}
        onSaveRule={handleSaveFinancialRule}
        onResetToCleanState={() => {
          const res = resetAllData();
          setTransactions(res.transactions);
          setCategories(res.categories);
          setSavingsGoals(res.goals);
          setSavingsRecords(res.savingsRecords);
          setFinancialRule(res.financialRule);
        }}
      />
    </div>
  );
}
