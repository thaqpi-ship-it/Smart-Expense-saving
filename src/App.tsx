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
  loadStoredDateFilter,
  saveStoredDateFilter,
  parseDateParts,
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
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
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
import { AuthScreen } from './components/AuthScreen';
import { Wallet } from 'lucide-react';

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
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // User-Specific Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(DEFAULT_SAVINGS_GOALS);
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>([]);
  const [financialRule, setFinancialRule] = useState<FinancialRule>(DEFAULT_FINANCIAL_RULE);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Date filtering state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = loadStoredDateFilter();
    if (saved) return saved.year;
    return new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = loadStoredDateFilter();
    if (saved) return saved.month;
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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firebase Firestore Sync Listeners - Strictly Isolated per User (users/{userId}/...)
  useEffect(() => {
    if (!user) {
      setIsCloudConnected(false);
      return;
    }

    const uid = user.uid;

    // Optional connection probe
    try {
      getDocFromServer(doc(db, 'users', uid)).catch(() => {});
    } catch {
      // ignore
    }

    // 1. Transactions Listener for current user
    const unsubTxs = onSnapshot(
      collection(db, 'users', uid, 'transactions'),
      (snapshot) => {
        setIsCloudConnected(true);
        const list = snapshot.docs.map((d) => d.data() as Transaction);
        list.sort((a, b) => {
          return (
            new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
          );
        });
        setTransactions(list);

        // Auto adjust date filter to newest transaction if initial year/month is current
        if (list.length > 0 && selectedYear === -1) {
          const { year, month } = parseDateParts(list[0].date);
          setSelectedYear(year);
          setSelectedMonth(month);
          saveStoredDateFilter(year, month);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`)
    );

    // 2. Categories Listener for current user
    const unsubCats = onSnapshot(
      collection(db, 'users', uid, 'categories'),
      (snapshot) => {
        setIsCloudConnected(true);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Category);
          setCategories(list);
        } else {
          // Initialize default categories scoped to this new user
          const batch = writeBatch(db);
          DEFAULT_CATEGORIES.forEach((cat) => {
            const catRef = doc(db, 'users', uid, 'categories', cat.id);
            batch.set(catRef, cleanForFirestore({ ...cat, userId: uid }));
          });
          batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}/categories`)
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/categories`)
    );

    // 3. Savings Goals Listener for current user
    const unsubGoals = onSnapshot(
      collection(db, 'users', uid, 'savingsGoals'),
      (snapshot) => {
        setIsCloudConnected(true);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as SavingsGoal);
          setSavingsGoals(list);
        } else {
          // Initialize default goals scoped to this new user
          const batch = writeBatch(db);
          DEFAULT_SAVINGS_GOALS.forEach((g) => {
            const goalRef = doc(db, 'users', uid, 'savingsGoals', g.id);
            batch.set(goalRef, cleanForFirestore({ ...g, userId: uid }));
          });
          batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}/savingsGoals`)
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsGoals`)
    );

    // 4. Savings Records Listener for current user
    const unsubRecords = onSnapshot(
      collection(db, 'users', uid, 'savingsRecords'),
      (snapshot) => {
        setIsCloudConnected(true);
        const list = snapshot.docs.map((d) => d.data() as SavingsRecord);
        list.sort((a, b) => b.createdAt - a.createdAt);
        setSavingsRecords(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsRecords`)
    );

    // 5. Financial Rule Listener for current user
    const unsubRule = onSnapshot(
      doc(db, 'users', uid, 'settings', 'financialRule'),
      (docSnap) => {
        setIsCloudConnected(true);
        if (docSnap.exists()) {
          const rule = docSnap.data() as FinancialRule;
          setFinancialRule(rule);
        } else {
          const defaultRule = { ...DEFAULT_FINANCIAL_RULE, userId: uid };
          setDoc(
            doc(db, 'users', uid, 'settings', 'financialRule'),
            cleanForFirestore(defaultRule)
          ).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/financialRule`)
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/settings/financialRule`)
    );

    return () => {
      unsubTxs();
      unsubCats();
      unsubGoals();
      unsubRecords();
      unsubRule();
    };
  }, [user]);

  // Calculate current operating net balance
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTransactions([]);
      setCategories(DEFAULT_CATEGORIES);
      setSavingsGoals(DEFAULT_SAVINGS_GOALS);
      setSavingsRecords([]);
      setFinancialRule(DEFAULT_FINANCIAL_RULE);
      setIsCloudConnected(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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
    if (!user) return;
    const uid = user.uid;

    setTransactions(data.transactions);
    setCategories(data.categories);
    setSavingsGoals(data.savingsGoals);
    setSavingsRecords(data.savingsRecords);
    setFinancialRule(data.financialRule);

    // Sync all restored data directly to this user's private Firestore subcollections
    try {
      data.transactions.forEach((tx) => {
        setDoc(
          doc(db, 'users', uid, 'transactions', tx.id),
          cleanForFirestore({ ...tx, userId: uid })
        ).catch(() => {});
      });
      data.categories.forEach((c) => {
        setDoc(
          doc(db, 'users', uid, 'categories', c.id),
          cleanForFirestore({ ...c, userId: uid })
        ).catch(() => {});
      });
      data.savingsGoals.forEach((g) => {
        setDoc(
          doc(db, 'users', uid, 'savingsGoals', g.id),
          cleanForFirestore({ ...g, userId: uid })
        ).catch(() => {});
      });
      data.savingsRecords.forEach((r) => {
        setDoc(
          doc(db, 'users', uid, 'savingsRecords', r.id),
          cleanForFirestore({ ...r, userId: uid })
        ).catch(() => {});
      });
      setDoc(
        doc(db, 'users', uid, 'settings', 'financialRule'),
        cleanForFirestore({ ...data.financialRule, userId: uid })
      ).catch(() => {});
    } catch (e) {
      console.error('Error syncing restored data to user Firestore:', e);
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

  // Persistence handlers connected to user-scoped Firebase Firestore (users/{userId}/...)
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    txId?: string
  ) => {
    if (!user) return;
    const uid = user.uid;

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
          setDoc(
            doc(db, 'users', uid, 'savingsGoals', prevGoal.id),
            cleanForFirestore({ ...prevGoal, userId: uid })
          ).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/savingsGoals/${prevGoal.id}`)
          );
        }
        if (existingTx.savingsRecordId) {
          deleteDoc(doc(db, 'users', uid, 'savingsRecords', existingTx.savingsRecordId)).catch(
            (err) =>
              handleFirestoreError(
                err,
                OperationType.DELETE,
                `users/${uid}/savingsRecords/${existingTx.savingsRecordId}`
              )
          );
        }
      }

      let newRecordId: string | undefined = undefined;

      // If new data is savings with a goal, create new deposit
      if (txData.type === 'savings' && txData.goalId) {
        newRecordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newRecord: SavingsRecord = {
          id: newRecordId,
          userId: uid,
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

        // Save new savings record & updated goal in user Firestore
        setDoc(
          doc(db, 'users', uid, 'savingsRecords', newRecord.id),
          cleanForFirestore(newRecord)
        ).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}/savingsRecords/${newRecord.id}`)
        );
        const targetGoal = updatedGoals.find((g) => g.id === txData.goalId);
        if (targetGoal) {
          setDoc(
            doc(db, 'users', uid, 'savingsGoals', targetGoal.id),
            cleanForFirestore({ ...targetGoal, userId: uid })
          ).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/savingsGoals/${targetGoal.id}`)
          );
        }
      }

      const updatedTx: Transaction = {
        ...(existingTx || ({} as Transaction)),
        ...txData,
        id: txId,
        userId: uid,
        savingsRecordId: newRecordId !== undefined ? newRecordId : existingTx?.savingsRecordId,
        createdAt: existingTx?.createdAt || Date.now(),
      };

      const updatedList = transactions.map((t) => (t.id === txId ? updatedTx : t));

      // Save to user Firestore
      setDoc(
        doc(db, 'users', uid, 'transactions', txId),
        cleanForFirestore(updatedTx)
      ).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/transactions/${txId}`)
      );

      // Optimistic state update
      setTransactions(updatedList);
      setSavingsGoals(updatedGoals);
      setSavingsRecords(updatedRecords);
    } else {
      // Add new transaction
      const generatedTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let newRecordId: string | undefined = undefined;

      if (txData.type === 'savings' && txData.goalId) {
        newRecordId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newRecord: SavingsRecord = {
          id: newRecordId,
          userId: uid,
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

        // Save new savings record & updated goal in user Firestore
        setDoc(
          doc(db, 'users', uid, 'savingsRecords', newRecord.id),
          cleanForFirestore(newRecord)
        ).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}/savingsRecords/${newRecord.id}`)
        );
        const targetGoal = updatedGoals.find((g) => g.id === txData.goalId);
        if (targetGoal) {
          setDoc(
            doc(db, 'users', uid, 'savingsGoals', targetGoal.id),
            cleanForFirestore({ ...targetGoal, userId: uid })
          ).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/savingsGoals/${targetGoal.id}`)
          );
        }

        setSavingsGoals(updatedGoals);
        setSavingsRecords(updatedRecords);
      }

      const newTx: Transaction = {
        ...txData,
        id: generatedTxId,
        userId: uid,
        savingsRecordId: newRecordId,
        createdAt: Date.now(),
      };

      const updatedList = [newTx, ...transactions];

      // Save to user Firestore
      setDoc(
        doc(db, 'users', uid, 'transactions', generatedTxId),
        cleanForFirestore(newTx)
      ).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/transactions/${generatedTxId}`)
      );

      // Optimistic state update
      setTransactions(updatedList);
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    if (!user) return;
    const uid = user.uid;

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
        // Delete from user Firestore
        deleteDoc(doc(db, 'users', uid, 'transactions', tx.id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/transactions/${tx.id}`)
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

          // Update goal and delete record in user Firestore
          const goalToUpdate = updatedGoals.find((g) => g.id === tx.goalId);
          if (goalToUpdate) {
            setDoc(
              doc(db, 'users', uid, 'savingsGoals', goalToUpdate.id),
              cleanForFirestore({ ...goalToUpdate, userId: uid })
            ).catch((err) =>
              handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/savingsGoals/${goalToUpdate.id}`)
            );
          }
          if (tx.savingsRecordId) {
            deleteDoc(doc(db, 'users', uid, 'savingsRecords', tx.savingsRecordId)).catch((err) =>
              handleFirestoreError(
                err,
                OperationType.DELETE,
                `users/${uid}/savingsRecords/${tx.savingsRecordId}`
              )
            );
          }

          setSavingsGoals(updatedGoals);
          setSavingsRecords(updatedRecords);
        }

        const updated = transactions.filter((t) => t.id !== tx.id);
        setTransactions(updated);
      },
    });
  };

  const handleUpdateCategoryBudget = (
    categoryId: string,
    newBudget: number,
    isHappiness?: boolean
  ) => {
    if (!user) return;
    const uid = user.uid;

    let updatedCat: Category | null = null;
    const updated = categories.map((c) => {
      if (c.id === categoryId) {
        updatedCat = {
          ...c,
          userId: uid,
          budgetMonthly: newBudget,
          isHappiness: isHappiness !== undefined ? isHappiness : c.isHappiness,
        };
        return updatedCat;
      }
      return c;
    });

    if (updatedCat) {
      setDoc(
        doc(db, 'users', uid, 'categories', categoryId),
        cleanForFirestore(updatedCat)
      ).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/categories/${categoryId}`)
      );
    }

    setCategories(updated);
  };

  const handleSaveCategory = (cat: Category) => {
    if (!user) return;
    const uid = user.uid;

    const catWithUser = { ...cat, userId: uid };
    const exists = categories.some((c) => c.id === cat.id);
    const updated = exists
      ? categories.map((c) => (c.id === cat.id ? catWithUser : c))
      : [...categories, catWithUser];

    setDoc(
      doc(db, 'users', uid, 'categories', cat.id),
      cleanForFirestore(catWithUser)
    ).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/categories/${cat.id}`)
    );

    setCategories(updated);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!user) return;
    const uid = user.uid;

    const cat = categories.find((c) => c.id === categoryId);
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบหมวดหมู่',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat?.name || 'หมวดหมู่นี้'}"?`,
      onConfirm: () => {
        deleteDoc(doc(db, 'users', uid, 'categories', categoryId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/categories/${categoryId}`)
        );

        const updated = categories.filter((c) => c.id !== categoryId);
        setCategories(updated);
      },
    });
  };

  const handleSaveGoal = (goal: SavingsGoal) => {
    if (!user) return;
    const uid = user.uid;

    const goalWithUser = { ...goal, userId: uid };
    const exists = savingsGoals.some((g) => g.id === goal.id);
    const updated = exists
      ? savingsGoals.map((g) => (g.id === goal.id ? goalWithUser : g))
      : [...savingsGoals, goalWithUser];

    setDoc(
      doc(db, 'users', uid, 'savingsGoals', goal.id),
      cleanForFirestore(goalWithUser)
    ).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/savingsGoals/${goal.id}`)
    );

    setSavingsGoals(updated);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!user) return;
    const uid = user.uid;

    const g = savingsGoals.find((item) => item.id === goalId);
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบกระปุกเป้าหมาย',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมายการออม "${g?.title || 'เป้าหมายนี้'}"? ประวัติการหยอด/ถอนทั้งหมดของกระปุกนี้จะถูกลบออกด้วย`,
      onConfirm: () => {
        deleteDoc(doc(db, 'users', uid, 'savingsGoals', goalId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/savingsGoals/${goalId}`)
        );

        // Delete associated records from user Firestore
        const recordsToDelete = savingsRecords.filter((r) => r.goalId === goalId);
        recordsToDelete.forEach((r) => {
          deleteDoc(doc(db, 'users', uid, 'savingsRecords', r.id)).catch(() => {});
        });

        const updated = savingsGoals.filter((item) => item.id !== goalId);
        const updatedRecords = savingsRecords.filter((r) => r.goalId !== goalId);
        setSavingsGoals(updated);
        setSavingsRecords(updatedRecords);
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
    if (!user) return;
    const uid = user.uid;

    const newRecord: SavingsRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: uid,
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
        targetGoalToSave = { ...g, userId: uid, currentAmount: nextAmt };
        return targetGoalToSave;
      }
      return g;
    });

    // Save in user Firestore
    setDoc(
      doc(db, 'users', uid, 'savingsRecords', newRecord.id),
      cleanForFirestore(newRecord)
    ).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/savingsRecords/${newRecord.id}`)
    );
    if (targetGoalToSave) {
      setDoc(
        doc(db, 'users', uid, 'savingsGoals', recordData.goalId),
        cleanForFirestore(targetGoalToSave)
      ).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/savingsGoals/${recordData.goalId}`)
      );
    }

    const updatedRecords = [newRecord, ...savingsRecords];
    setSavingsGoals(updatedGoals);
    setSavingsRecords(updatedRecords);
  };

  const handleDeleteSavingsRecord = (record: SavingsRecord, revertGoalBalance: boolean = true) => {
    if (!user) return;
    const uid = user.uid;

    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบประวัติรายการออม',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการ${record.type === 'deposit' ? 'หยอดเงิน' : 'ถอนเงิน'} ฿${record.amount.toLocaleString()} ${record.notes ? `("${record.notes}")` : ''}? ${revertGoalBalance ? 'ยอดเงินในกระปุกจะถูกปรับคืนให้อัตโนมัติ' : ''}`,
      onConfirm: () => {
        deleteDoc(doc(db, 'users', uid, 'savingsRecords', record.id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/savingsRecords/${record.id}`)
        );

        if (revertGoalBalance) {
          const delta = record.type === 'deposit' ? -record.amount : record.amount;
          let goalToUpdate: SavingsGoal | null = null;
          const updatedGoals = savingsGoals.map((g) => {
            if (g.id === record.goalId) {
              goalToUpdate = { ...g, userId: uid, currentAmount: Math.max(0, g.currentAmount + delta) };
              return goalToUpdate;
            }
            return g;
          });

          if (goalToUpdate) {
            setDoc(
              doc(db, 'users', uid, 'savingsGoals', record.goalId),
              cleanForFirestore(goalToUpdate)
            ).catch((err) =>
              handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/savingsGoals/${record.goalId}`)
            );
          }

          setSavingsGoals(updatedGoals);
        }

        const updatedRecords = savingsRecords.filter((r) => r.id !== record.id);
        setSavingsRecords(updatedRecords);
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
    if (!user) return;
    const uid = user.uid;

    setDeleteModalState({
      isOpen: true,
      title: 'รีเซ็ตข้อมูลส่วนตัวทั้งหมด',
      message: 'ต้องการกู้คืนข้อมูลรายการบันทึก งบประมาณ หมวดหมู่ และกระปุกออมเงินของบัญชีคุณกลับสู่สถานะเริ่มต้นหรือไม่?',
      onConfirm: () => {
        // Clear this user's transactions & records in Firestore
        transactions.forEach((tx) => {
          deleteDoc(doc(db, 'users', uid, 'transactions', tx.id)).catch(() => {});
        });
        savingsRecords.forEach((r) => {
          deleteDoc(doc(db, 'users', uid, 'savingsRecords', r.id)).catch(() => {});
        });

        // Reset default categories, goals, and rule in user Firestore
        DEFAULT_CATEGORIES.forEach((cat) => {
          setDoc(doc(db, 'users', uid, 'categories', cat.id), cleanForFirestore({ ...cat, userId: uid })).catch(() => {});
        });
        DEFAULT_SAVINGS_GOALS.forEach((g) => {
          setDoc(doc(db, 'users', uid, 'savingsGoals', g.id), cleanForFirestore({ ...g, userId: uid })).catch(() => {});
        });
        setDoc(
          doc(db, 'users', uid, 'settings', 'financialRule'),
          cleanForFirestore({ ...DEFAULT_FINANCIAL_RULE, userId: uid })
        ).catch(() => {});

        setTransactions([]);
        setCategories(DEFAULT_CATEGORIES);
        setSavingsGoals(DEFAULT_SAVINGS_GOALS);
        setSavingsRecords([]);
        setFinancialRule(DEFAULT_FINANCIAL_RULE);
      },
    });
  };

  const handleSaveFinancialRule = (newRule: FinancialRule) => {
    if (!user) return;
    const uid = user.uid;

    const ruleWithUser = { ...newRule, userId: uid };
    setFinancialRule(ruleWithUser);

    setDoc(
      doc(db, 'users', uid, 'settings', 'financialRule'),
      cleanForFirestore(ruleWithUser)
    ).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/financialRule`)
    );
  };

  // 1. Initial Auth Loading Splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#14171c] flex flex-col items-center justify-center text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 p-0.5 shadow-2xl shadow-emerald-950/70 mb-4 animate-bounce">
          <div className="w-full h-full bg-[#181d24] rounded-[14px] flex items-center justify-center">
            <Wallet className="w-7 h-7 text-emerald-400" />
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-200">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
        <span className="text-xs text-slate-500 mt-1">Smart Expense & Saving Tracker • Firebase Cloud</span>
      </div>
    );
  }

  // 2. Authentication Gate: If not authenticated, require Sign In / Sign Up
  if (!user) {
    return <AuthScreen />;
  }

  // 3. Authenticated Dashboard with User-Specific Isolated Data
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
        user={user}
        onLogout={handleLogout}
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
          user={user}
          onLogout={handleLogout}
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
          handleResetData();
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
