import React, { useState, useEffect, useMemo } from 'react';
import {
  Category,
  FinancialRule,
  SavingsGoal,
  SavingsRecord,
  Transaction,
  TransactionType,
} from './types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_FINANCIAL_RULE,
  DEFAULT_SAVINGS_GOALS,
} from './data/initialData';
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
  loadStoredDateFilter,
  saveStoredDateFilter,
  parseDateParts,
  attemptRestoreFromIndexedDB,
} from './utils/storage';
import { db, auth } from './firebase.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
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
import { BackupRestoreModal } from './components/BackupRestoreModal';

// Clean object keys to remove undefined fields which are not accepted by Firestore setDoc
function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => loadSavingsGoals());
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>(() => loadSavingsRecords());
  const [financialRule, setFinancialRule] = useState<FinancialRule>(() => loadFinancialRule());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Date filtering state with memory and smart initial auto-detection
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = loadStoredDateFilter();
    if (saved) return saved.year;
    const initialTxs = loadTransactions();
    if (initialTxs.length > 0) {
      const sorted = [...initialTxs].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt;
      });
      if (sorted[0]?.date) {
        return parseDateParts(sorted[0].date).year;
      }
    }
    return new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = loadStoredDateFilter();
    if (saved) return saved.month;
    const initialTxs = loadTransactions();
    if (initialTxs.length > 0) {
      const sorted = [...initialTxs].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt;
      });
      if (sorted[0]?.date) {
        return parseDateParts(sorted[0].date).month;
      }
    }
    return new Date().getMonth();
  });

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
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

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

  // Real-time Firebase Firestore Sync Listeners
  useEffect(() => {
    // Try test connection to Firestore server
    try {
      getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
    } catch {
      // Offline or network probe
    }

    // Try signing in anonymously if available and not yet signed in
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }

    // 1. Transactions Listener
    const unsubTxs = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        setIsCloudConnected(true);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Transaction);
          list.sort((a, b) => {
            return (
              new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
            );
          });
          setTransactions(list);
          saveTransactions(list); // Keep offline backup updated
        } else {
          // If Firestore collection has 0 items, check if we have local transactions to migrate
          const localTxs = loadTransactions();
          if (localTxs.length > 0) {
            localTxs.forEach((tx) => {
              setDoc(doc(db, 'transactions', tx.id), cleanForFirestore(tx)).catch((err) =>
                handleFirestoreError(err, OperationType.WRITE, `transactions/${tx.id}`)
              );
            });
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    // 2. Categories Listener
    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setIsCloudConnected(true);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Category);
          setCategories(list);
          saveCategories(list);
        } else {
          // Firestore categories empty: seed default categories
          const initial = loadCategories().length > 0 ? loadCategories() : DEFAULT_CATEGORIES;
          initial.forEach((cat) => {
            setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat)).catch((err) =>
              handleFirestoreError(err, OperationType.WRITE, `categories/${cat.id}`)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    // 3. Savings Goals Listener
    const unsubGoals = onSnapshot(
      collection(db, 'savingsGoals'),
      (snapshot) => {
        setIsCloudConnected(true);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as SavingsGoal);
          setSavingsGoals(list);
          saveSavingsGoals(list);
        } else {
          // Firestore goals empty: seed default goals
          const initial = loadSavingsGoals().length > 0 ? loadSavingsGoals() : DEFAULT_SAVINGS_GOALS;
          initial.forEach((g) => {
            setDoc(doc(db, 'savingsGoals', g.id), cleanForFirestore(g)).catch((err) =>
              handleFirestoreError(err, OperationType.WRITE, `savingsGoals/${g.id}`)
            );
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'savingsGoals')
    );

    // 4. Savings Records Listener
    const unsubRecords = onSnapshot(
      collection(db, 'savingsRecords'),
      (snapshot) => {
        setIsCloudConnected(true);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as SavingsRecord);
          list.sort((a, b) => b.createdAt - a.createdAt);
          setSavingsRecords(list);
          saveSavingsRecords(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'savingsRecords')
    );

    // 5. Financial Rule Listener
    const unsubRule = onSnapshot(
      doc(db, 'settings', 'financialRule'),
      (docSnap) => {
        setIsCloudConnected(true);
        if (docSnap.exists()) {
          const rule = docSnap.data() as FinancialRule;
          setFinancialRule(rule);
          saveFinancialRule(rule);
        } else {
          const defaultRule = loadFinancialRule() || DEFAULT_FINANCIAL_RULE;
          setDoc(doc(db, 'settings', 'financialRule'), cleanForFirestore(defaultRule)).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, 'settings/financialRule')
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/financialRule')
    );

    // IndexedDB recovery fallback in case user is offline on first mount
    if (transactions.length === 0) {
      attemptRestoreFromIndexedDB().then((restored) => {
        if (restored && restored.transactions && restored.transactions.length > 0) {
          setTransactions(restored.transactions);
          if (restored.categories) setCategories(restored.categories);
          if (restored.goals) setSavingsGoals(restored.goals);
          if (restored.savingsRecords) setSavingsRecords(restored.savingsRecords);
          if (restored.financialRule) setFinancialRule(restored.financialRule);

          const newest = restored.transactions[0];
          if (newest) {
            const { year, month } = parseDateParts(newest.date);
            setSelectedYear(year);
            setSelectedMonth(month);
            saveStoredDateFilter(year, month);
          }
        }
      });
    }

    return () => {
      unsubTxs();
      unsubCats();
      unsubGoals();
      unsubRecords();
      unsubRule();
    };
  }, []);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    saveStoredDateFilter(year, selectedMonth);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    saveStoredDateFilter(selectedYear, month);
  };

  const handleDataRestored = (data: {
    transactions: Transaction[];
    categories: Category[];
    savingsGoals: SavingsGoal[];
    savingsRecords: SavingsRecord[];
    financialRule: FinancialRule;
  }) => {
    setTransactions(data.transactions);
    setCategories(data.categories);
    setSavingsGoals(data.savingsGoals);
    setSavingsRecords(data.savingsRecords);
    setFinancialRule(data.financialRule);

    saveTransactions(data.transactions);
    saveCategories(data.categories);
    saveSavingsGoals(data.savingsGoals);
    saveSavingsRecords(data.savingsRecords);
    saveFinancialRule(data.financialRule);

    // Sync all restored data to Firestore
    try {
      data.transactions.forEach((tx) => {
        setDoc(doc(db, 'transactions', tx.id), cleanForFirestore(tx)).catch(() => {});
      });
      data.categories.forEach((c) => {
        setDoc(doc(db, 'categories', c.id), cleanForFirestore(c)).catch(() => {});
      });
      data.savingsGoals.forEach((g) => {
        setDoc(doc(db, 'savingsGoals', g.id), cleanForFirestore(g)).catch(() => {});
      });
      data.savingsRecords.forEach((r) => {
        setDoc(doc(db, 'savingsRecords', r.id), cleanForFirestore(r)).catch(() => {});
      });
      setDoc(doc(db, 'settings', 'financialRule'), cleanForFirestore(data.financialRule)).catch(() => {});
    } catch (e) {
      console.error('Error syncing restored data to Firestore:', e);
    }

    if (data.transactions.length > 0) {
      const sorted = [...data.transactions].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt;
      });
      if (sorted[0]?.date) {
        const { year, month } = parseDateParts(sorted[0].date);
        setSelectedYear(year);
        setSelectedMonth(month);
        saveStoredDateFilter(year, month);
      }
    }
  };

  // Persistence handlers connected to Firebase Firestore (db)
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    txId?: string
  ) => {
    let updatedGoals = [...savingsGoals];
    let updatedRecords = [...savingsRecords];

    const { year: txYear, month: txMonth } = parseDateParts(txData.date);
    if (selectedYear !== -1 && selectedYear !== txYear) {
      setSelectedYear(txYear);
      saveStoredDateFilter(txYear, selectedMonth === -1 ? -1 : txMonth);
    }
    if (selectedMonth !== -1 && selectedMonth !== txMonth) {
      setSelectedMonth(txMonth);
      saveStoredDateFilter(txYear, txMonth);
    }

    if (txId) {
      // Edit existing transaction
      const existingTx = transactions.find((t) => t.id === txId);

      // Revert previous goal deposit if existing transaction was savings
      if (existingTx && existingTx.type === 'savings' && existingTx.goalId) {
        updatedGoals = updatedGoals.map((g) =>
          g.id === existingTx.goalId
            ? { ...g, currentAmount: Math.max(0, g.currentAmount - existingTx.amount) }
            : g
        );
        updatedRecords = updatedRecords.filter(
          (r) => r.transactionId !== txId && r.id !== existingTx.savingsRecordId
        );

        // Update in Firestore
        const prevGoal = updatedGoals.find((g) => g.id === existingTx.goalId);
        if (prevGoal) {
          setDoc(doc(db, 'savingsGoals', prevGoal.id), cleanForFirestore(prevGoal)).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${prevGoal.id}`)
          );
        }
        if (existingTx.savingsRecordId) {
          deleteDoc(doc(db, 'savingsRecords', existingTx.savingsRecordId)).catch((err) =>
            handleFirestoreError(err, OperationType.DELETE, `savingsRecords/${existingTx.savingsRecordId}`)
          );
        }
      }

      let newRecordId: string | undefined = undefined;

      // If new data is savings with a goal, create new deposit
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

        // Save new savings record & updated goal in Firestore
        setDoc(doc(db, 'savingsRecords', newRecord.id), cleanForFirestore(newRecord)).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `savingsRecords/${newRecord.id}`)
        );
        const targetGoal = updatedGoals.find((g) => g.id === txData.goalId);
        if (targetGoal) {
          setDoc(doc(db, 'savingsGoals', targetGoal.id), cleanForFirestore(targetGoal)).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${targetGoal.id}`)
          );
        }
      }

      const updatedTx: Transaction = {
        ...(existingTx || ({} as Transaction)),
        ...txData,
        id: txId,
        savingsRecordId: newRecordId !== undefined ? newRecordId : existingTx?.savingsRecordId,
        createdAt: existingTx?.createdAt || Date.now(),
      };

      const updatedList = transactions.map((t) => (t.id === txId ? updatedTx : t));

      // Save to Firestore
      setDoc(doc(db, 'transactions', txId), cleanForFirestore(updatedTx)).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `transactions/${txId}`)
      );

      // Local state and backup
      setTransactions(updatedList);
      saveTransactions(updatedList);
      setSavingsGoals(updatedGoals);
      saveSavingsGoals(updatedGoals);
      setSavingsRecords(updatedRecords);
      saveSavingsRecords(updatedRecords);
    } else {
      // Add new transaction
      const generatedTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let newRecordId: string | undefined = undefined;

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

        // Save new savings record & updated goal in Firestore
        setDoc(doc(db, 'savingsRecords', newRecord.id), cleanForFirestore(newRecord)).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `savingsRecords/${newRecord.id}`)
        );
        const targetGoal = updatedGoals.find((g) => g.id === txData.goalId);
        if (targetGoal) {
          setDoc(doc(db, 'savingsGoals', targetGoal.id), cleanForFirestore(targetGoal)).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${targetGoal.id}`)
          );
        }

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

      const updatedList = [newTx, ...transactions];

      // Save to Firestore
      setDoc(doc(db, 'transactions', generatedTxId), cleanForFirestore(newTx)).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `transactions/${generatedTxId}`)
      );

      // Local state and backup
      setTransactions(updatedList);
      saveTransactions(updatedList);
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
        // Delete from Firestore
        deleteDoc(doc(db, 'transactions', tx.id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `transactions/${tx.id}`)
        );

        if (isLinkedSavings) {
          const updatedGoals = savingsGoals.map((g) =>
            g.id === tx.goalId
              ? { ...g, currentAmount: Math.max(0, g.currentAmount - tx.amount) }
              : g
          );
          const updatedRecords = savingsRecords.filter(
            (r) => r.transactionId !== tx.id && r.id !== tx.savingsRecordId
          );

          // Update goal and delete record in Firestore
          const goalToUpdate = updatedGoals.find((g) => g.id === tx.goalId);
          if (goalToUpdate) {
            setDoc(doc(db, 'savingsGoals', goalToUpdate.id), cleanForFirestore(goalToUpdate)).catch((err) =>
              handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${goalToUpdate.id}`)
            );
          }
          if (tx.savingsRecordId) {
            deleteDoc(doc(db, 'savingsRecords', tx.savingsRecordId)).catch((err) =>
              handleFirestoreError(err, OperationType.DELETE, `savingsRecords/${tx.savingsRecordId}`)
            );
          }

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
    let updatedCat: Category | null = null;
    const updated = categories.map((c) => {
      if (c.id === categoryId) {
        updatedCat = {
          ...c,
          budgetMonthly: newBudget,
          isHappiness: isHappiness !== undefined ? isHappiness : c.isHappiness,
        };
        return updatedCat;
      }
      return c;
    });

    if (updatedCat) {
      setDoc(doc(db, 'categories', categoryId), cleanForFirestore(updatedCat)).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `categories/${categoryId}`)
      );
    }

    setCategories(updated);
    saveCategories(updated);
  };

  const handleSaveCategory = (cat: Category) => {
    const exists = categories.some((c) => c.id === cat.id);
    const updated = exists
      ? categories.map((c) => (c.id === cat.id ? cat : c))
      : [...categories, cat];

    setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat)).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `categories/${cat.id}`)
    );

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
        deleteDoc(doc(db, 'categories', categoryId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`)
        );

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

    setDoc(doc(db, 'savingsGoals', goal.id), cleanForFirestore(goal)).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `savingsGoals/${goal.id}`)
    );

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
        deleteDoc(doc(db, 'savingsGoals', goalId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `savingsGoals/${goalId}`)
        );

        // Delete associated records from Firestore
        const recordsToDelete = savingsRecords.filter((r) => r.goalId === goalId);
        recordsToDelete.forEach((r) => {
          deleteDoc(doc(db, 'savingsRecords', r.id)).catch(() => {});
        });

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
    let targetGoalToSave: SavingsGoal | null = null;
    const updatedGoals = savingsGoals.map((g) => {
      if (g.id === recordData.goalId) {
        const nextAmt = Math.max(0, g.currentAmount + delta);
        targetGoalToSave = { ...g, currentAmount: nextAmt };
        return targetGoalToSave;
      }
      return g;
    });

    // Save in Firestore
    setDoc(doc(db, 'savingsRecords', newRecord.id), cleanForFirestore(newRecord)).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `savingsRecords/${newRecord.id}`)
    );
    if (targetGoalToSave) {
      setDoc(doc(db, 'savingsGoals', recordData.goalId), cleanForFirestore(targetGoalToSave)).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${recordData.goalId}`)
      );
    }

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
        deleteDoc(doc(db, 'savingsRecords', record.id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `savingsRecords/${record.id}`)
        );

        if (revertGoalBalance) {
          const delta = record.type === 'deposit' ? -record.amount : record.amount;
          let goalToUpdate: SavingsGoal | null = null;
          const updatedGoals = savingsGoals.map((g) => {
            if (g.id === record.goalId) {
              goalToUpdate = { ...g, currentAmount: Math.max(0, g.currentAmount + delta) };
              return goalToUpdate;
            }
            return g;
          });

          if (goalToUpdate) {
            setDoc(doc(db, 'savingsGoals', record.goalId), cleanForFirestore(goalToUpdate)).catch((err) =>
              handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${record.goalId}`)
            );
          }

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
      message: 'ต้องการกู้คืนข้อมูลรายการบันทึก งบประมาณ หมวดหมู่ และกระปุกออมเงินกลับสู่สถานะเริ่มต้นหรือไม่? ข้อมูลบน Firebase Firestore จะถูกอัปเดตด้วย',
      onConfirm: () => {
        const res = resetAllData();
        setTransactions(res.transactions);
        setCategories(res.categories);
        setSavingsGoals(res.goals);
        setSavingsRecords(res.savingsRecords);
        setFinancialRule(res.financialRule);

        // Clear existing transactions & savings records in Firestore
        transactions.forEach((tx) => {
          deleteDoc(doc(db, 'transactions', tx.id)).catch(() => {});
        });
        savingsRecords.forEach((r) => {
          deleteDoc(doc(db, 'savingsRecords', r.id)).catch(() => {});
        });

        // Set default categories, goals, and rule in Firestore
        res.categories.forEach((cat) => {
          setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat)).catch(() => {});
        });
        res.goals.forEach((g) => {
          setDoc(doc(db, 'savingsGoals', g.id), cleanForFirestore(g)).catch(() => {});
        });
        setDoc(doc(db, 'settings', 'financialRule'), cleanForFirestore(res.financialRule)).catch(() => {});
      },
    });
  };

  const handleSaveFinancialRule = (newRule: FinancialRule) => {
    setFinancialRule(newRule);
    saveFinancialRule(newRule);

    setDoc(doc(db, 'settings', 'financialRule'), cleanForFirestore(newRule)).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, 'settings/financialRule')
    );
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
        onOpenBackup={() => setIsBackupModalOpen(true)}
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
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onResetData={handleResetData}
          currentNetBalance={currentNetBalance}
          isCloudConnected={isCloudConnected}
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
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
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
            <ReportsExport
              transactions={transactions}
              categories={categories}
              onOpenBackup={() => setIsBackupModalOpen(true)}
            />
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

      {/* Backup & Restore Data Modal (Dual-Layer Sync + JSON Export/Import) */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        transactions={transactions}
        categories={categories}
        savingsGoals={savingsGoals}
        savingsRecords={savingsRecords}
        financialRule={financialRule}
        onDataRestored={handleDataRestored}
      />
    </div>
  );
}
