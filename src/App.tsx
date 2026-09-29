import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  clearAllLocalAndBackupData,
} from './utils/storage';
import { db, auth } from './firebase.js';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
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
import { CloudSyncModal } from './components/CloudSyncModal';
import { Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Initial Multi-device Cloud Sync Loading State
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // Cloud Diagnostics & Feedback States
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<{ message: string; code?: string; path?: string } | null>(null);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // User-Specific Cloud Data State (pure from Firestore, no local overwrite)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsRecords, setSavingsRecords] = useState<SavingsRecord[]>([]);
  const [financialRule, setFinancialRule] = useState<FinancialRule>(DEFAULT_FINANCIAL_RULE);

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

  // Track if user manually changed date filter
  const userAdjustedFilter = useRef<boolean>(false);

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

  // Universal Firestore Error Reporter
  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errCode = (error as any)?.code;
    const errInfo = {
      error: errMsg,
      code: errCode,
      authInfo: {
        userId: auth?.currentUser?.uid,
        email: auth?.currentUser?.email,
      },
      operationType,
      path,
    };
    console.warn('Firestore Notice: ', JSON.stringify(errInfo));
    setSyncError({
      message: errMsg,
      code: errCode,
      path: path || undefined,
    });
  };

  // Toast Notification Trigger
  const triggerSuccessToast = (msg: string) => {
    setSyncSuccessToast(msg);
    setTimeout(() => {
      setSyncSuccessToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setIsDataLoading(false);
        setTransactions([]);
        setCategories([]);
        setSavingsGoals([]);
        setSavingsRecords([]);
        setSyncError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Multi-device Firebase Listeners (users/{userId}/...)
  useEffect(() => {
    if (!user) {
      setIsCloudConnected(false);
      setIsDataLoading(false);
      return;
    }

    const uid = user.uid;
    setIsDataLoading(true);

    const loadedSections = {
      transactions: false,
      categories: false,
      goals: false,
      records: false,
      rule: false,
    };

    const checkAllLoaded = () => {
      if (
        loadedSections.transactions &&
        loadedSections.categories &&
        loadedSections.goals &&
        loadedSections.records &&
        loadedSections.rule
      ) {
        setIsDataLoading(false);
      }
    };

    const loadTimeout = setTimeout(() => {
      setIsDataLoading(false);
    }, 3500);

    // 1. Transactions Real-time Listener
    const unsubTxs = onSnapshot(
      collection(db, 'users', uid, 'transactions'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setIsCloudConnected(true);
        setSyncError(null);
        const list = snapshot.docs.map((d) => d.data() as Transaction);
        list.sort((a, b) => {
          return (
            new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
          );
        });
        setTransactions(list);

        // Smart Date Filter Auto-Alignment on New Device
        if (!userAdjustedFilter.current && list.length > 0) {
          const currentMonthHasTxs = list.some((tx) => {
            const { year, month } = parseDateParts(tx.date);
            return year === selectedYear && month === selectedMonth;
          });

          if (!currentMonthHasTxs) {
            const { year, month } = parseDateParts(list[0].date);
            setSelectedYear(year);
            setSelectedMonth(month);
            saveStoredDateFilter(year, month);
          }
        }

        loadedSections.transactions = true;
        checkAllLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`);
        loadedSections.transactions = true;
        checkAllLoaded();
      }
    );

    // 2. Categories Real-time Listener (Guarded against overwriting cloud data)
    const unsubCats = onSnapshot(
      collection(db, 'users', uid, 'categories'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setIsCloudConnected(true);
        setSyncError(null);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as Category);
          setCategories(list);
          loadedSections.categories = true;
          checkAllLoaded();
        } else if (!snapshot.metadata.fromCache) {
          // Initialize default categories with batch only if confirmed empty on cloud
          const batch = writeBatch(db);
          DEFAULT_CATEGORIES.forEach((cat) => {
            const catRef = doc(db, 'users', uid, 'categories', cat.id);
            batch.set(catRef, cleanForFirestore({ ...cat, userId: uid }));
          });
          batch
            .commit()
            .then(() => {
              setCategories(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: uid })));
            })
            .catch((err) =>
              handleFirestoreError(err, OperationType.WRITE, `users/${uid}/categories`)
            )
            .finally(() => {
              loadedSections.categories = true;
              checkAllLoaded();
            });
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/categories`);
        loadedSections.categories = true;
        checkAllLoaded();
      }
    );

    // 3. Savings Goals Real-time Listener
    const unsubGoals = onSnapshot(
      collection(db, 'users', uid, 'savingsGoals'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setIsCloudConnected(true);
        setSyncError(null);
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => d.data() as SavingsGoal);
          setSavingsGoals(list);
        } else {
          setSavingsGoals([]);
        }
        loadedSections.goals = true;
        checkAllLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsGoals`);
        loadedSections.goals = true;
        checkAllLoaded();
      }
    );

    // 4. Savings Records Real-time Listener
    const unsubRecords = onSnapshot(
      collection(db, 'users', uid, 'savingsRecords'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setIsCloudConnected(true);
        setSyncError(null);
        const list = snapshot.docs.map((d) => d.data() as SavingsRecord);
        list.sort((a, b) => b.createdAt - a.createdAt);
        setSavingsRecords(list);
        loadedSections.records = true;
        checkAllLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsRecords`);
        loadedSections.records = true;
        checkAllLoaded();
      }
    );

    // 5. Financial Rule Real-time Listener
    const unsubRule = onSnapshot(
      doc(db, 'users', uid, 'settings', 'financialRule'),
      { includeMetadataChanges: true },
      (docSnap) => {
        setIsCloudConnected(true);
        setSyncError(null);
        const fromCache = docSnap.metadata?.fromCache ?? false;
        if (docSnap.exists()) {
          const rule = docSnap.data() as FinancialRule;
          setFinancialRule(rule);
        } else if (!fromCache) {
          const defaultRule = { ...DEFAULT_FINANCIAL_RULE, userId: uid };
          setDoc(
            doc(db, 'users', uid, 'settings', 'financialRule'),
            cleanForFirestore(defaultRule)
          ).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/financialRule`)
          );
        }
        loadedSections.rule = true;
        checkAllLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${uid}/settings/financialRule`);
        loadedSections.rule = true;
        checkAllLoaded();
      }
    );

    return () => {
      clearTimeout(loadTimeout);
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
      setCategories([]);
      setSavingsGoals([]);
      setSavingsRecords([]);
      setFinancialRule(DEFAULT_FINANCIAL_RULE);
      setIsCloudConnected(false);
      userAdjustedFilter.current = false;
      setSyncError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleYearChange = (year: number) => {
    userAdjustedFilter.current = true;
    setSelectedYear(year);
    saveStoredDateFilter(year, selectedMonth);
  };

  const handleMonthChange = (month: number) => {
    userAdjustedFilter.current = true;
    setSelectedMonth(month);
    saveStoredDateFilter(selectedYear, month);
  };

  const handleDataRestored = async (data: {
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

    try {
      for (const tx of data.transactions) {
        await setDoc(doc(db, 'users', uid, 'transactions', tx.id), cleanForFirestore({ ...tx, userId: uid }));
      }
      for (const c of data.categories) {
        await setDoc(doc(db, 'users', uid, 'categories', c.id), cleanForFirestore({ ...c, userId: uid }));
      }
      for (const g of data.savingsGoals) {
        await setDoc(doc(db, 'users', uid, 'savingsGoals', g.id), cleanForFirestore({ ...g, userId: uid }));
      }
      for (const r of data.savingsRecords) {
        await setDoc(doc(db, 'users', uid, 'savingsRecords', r.id), cleanForFirestore({ ...r, userId: uid }));
      }
      await setDoc(doc(db, 'users', uid, 'settings', 'financialRule'), cleanForFirestore({ ...data.financialRule, userId: uid }));
      triggerSuccessToast('กู้คืนข้อมูลและซิงก์ขึ้น Cloud สำเร็จแล้ว');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}/(restore)`);
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
  const handleSaveTransaction = async (
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

    try {
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

          const prevGoal = updatedGoals.find((g) => g.id === existingTx.goalId);
          if (prevGoal) {
            await setDoc(
              doc(db, 'users', uid, 'savingsGoals', prevGoal.id),
              cleanForFirestore({ ...prevGoal, userId: uid })
            );
          }
          if (existingTx.savingsRecordId) {
            await deleteDoc(doc(db, 'users', uid, 'savingsRecords', existingTx.savingsRecordId));
          }
        }

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
            transactionId: txId,
            createdAt: Date.now(),
          };
          updatedRecords = [newRecord, ...updatedRecords];
          updatedGoals = updatedGoals.map((g) =>
            g.id === txData.goalId
              ? { ...g, currentAmount: g.currentAmount + txData.amount }
              : g
          );

          await setDoc(
            doc(db, 'users', uid, 'savingsRecords', newRecord.id),
            cleanForFirestore(newRecord)
          );
          const targetGoal = updatedGoals.find((g) => g.id === txData.goalId);
          if (targetGoal) {
            await setDoc(
              doc(db, 'users', uid, 'savingsGoals', targetGoal.id),
              cleanForFirestore({ ...targetGoal, userId: uid })
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

        await setDoc(
          doc(db, 'users', uid, 'transactions', txId),
          cleanForFirestore(updatedTx)
        );

        setTransactions(updatedList);
        setSavingsGoals(updatedGoals);
        setSavingsRecords(updatedRecords);
        triggerSuccessToast('บันทึกการแก้ไขขึ้น Cloud สำเร็จแล้ว');
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

          await setDoc(
            doc(db, 'users', uid, 'savingsRecords', newRecord.id),
            cleanForFirestore(newRecord)
          );
          const targetGoal = updatedGoals.find((g) => g.id === txData.goalId);
          if (targetGoal) {
            await setDoc(
              doc(db, 'users', uid, 'savingsGoals', targetGoal.id),
              cleanForFirestore({ ...targetGoal, userId: uid })
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

        await setDoc(
          doc(db, 'users', uid, 'transactions', generatedTxId),
          cleanForFirestore(newTx)
        );

        setTransactions(updatedList);
        triggerSuccessToast('บันทึกรายการขึ้น Cloud สำเร็จแล้ว');
      }
      setSyncError(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/transactions`);
    }
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
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
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid, 'transactions', tx.id));

          if (isLinkedSavings) {
            const updatedGoals = savingsGoals.map((g) =>
              g.id === tx.goalId
                ? { ...g, currentAmount: Math.max(0, g.currentAmount - tx.amount) }
                : g
            );
            const updatedRecords = savingsRecords.filter(
              (r) => r.transactionId !== tx.id && r.id !== tx.savingsRecordId
            );

            const goalToUpdate = updatedGoals.find((g) => g.id === tx.goalId);
            if (goalToUpdate) {
              await setDoc(
                doc(db, 'users', uid, 'savingsGoals', goalToUpdate.id),
                cleanForFirestore({ ...goalToUpdate, userId: uid })
              );
            }
            if (tx.savingsRecordId) {
              await deleteDoc(doc(db, 'users', uid, 'savingsRecords', tx.savingsRecordId));
            }

            setSavingsGoals(updatedGoals);
            setSavingsRecords(updatedRecords);
          }

          const updated = transactions.filter((t) => t.id !== tx.id);
          setTransactions(updated);
          triggerSuccessToast('ลบรายการออกจาก Cloud สำเร็จแล้ว');
          setSyncError(null);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/transactions/${tx.id}`);
        }
      },
    });
  };

  const handleUpdateCategoryBudget = async (
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

    setCategories(updated);

    if (updatedCat) {
      try {
        await setDoc(
          doc(db, 'users', uid, 'categories', categoryId),
          cleanForFirestore(updatedCat)
        );
        triggerSuccessToast('อัปเดตงบประมาณบน Cloud แล้ว');
        setSyncError(null);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/categories/${categoryId}`);
      }
    }
  };

  const handleSaveCategory = async (cat: Category) => {
    if (!user) return;
    const uid = user.uid;

    const catWithUser = { ...cat, userId: uid };
    const exists = categories.some((c) => c.id === cat.id);
    const updated = exists
      ? categories.map((c) => (c.id === cat.id ? catWithUser : c))
      : [...categories, catWithUser];

    setCategories(updated);

    try {
      await setDoc(
        doc(db, 'users', uid, 'categories', cat.id),
        cleanForFirestore(catWithUser)
      );
      triggerSuccessToast('บันทึกหมวดหมู่บน Cloud เรียบร้อย');
      setSyncError(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/categories/${cat.id}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    const uid = user.uid;

    const cat = categories.find((c) => c.id === categoryId);
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบหมวดหมู่',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat?.name || 'หมวดหมู่นี้'}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid, 'categories', categoryId));
          const updated = categories.filter((c) => c.id !== categoryId);
          setCategories(updated);
          triggerSuccessToast('ลบหมวดหมู่ออกจาก Cloud สำเร็จ');
          setSyncError(null);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/categories/${categoryId}`);
        }
      },
    });
  };

  const handleSaveGoal = async (goal: SavingsGoal) => {
    if (!user) return;
    const uid = user.uid;

    const goalWithUser = { ...goal, userId: uid };
    const exists = savingsGoals.some((g) => g.id === goal.id);
    const updated = exists
      ? savingsGoals.map((g) => (g.id === goal.id ? goalWithUser : g))
      : [...savingsGoals, goalWithUser];

    setSavingsGoals(updated);

    try {
      await setDoc(
        doc(db, 'users', uid, 'savingsGoals', goal.id),
        cleanForFirestore(goalWithUser)
      );
      triggerSuccessToast('บันทึกกระปุกเป้าหมายบน Cloud สำเร็จ');
      setSyncError(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/savingsGoals/${goal.id}`);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    const uid = user.uid;

    const g = savingsGoals.find((item) => item.id === goalId);
    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบกระปุกเป้าหมาย',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมายการออม "${g?.title || 'เป้าหมายนี้'}"? ประวัติการหยอด/ถอนทั้งหมดของกระปุกนี้จะถูกลบออกด้วย`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid, 'savingsGoals', goalId));

          const recordsToDelete = savingsRecords.filter((r) => r.goalId === goalId);
          for (const r of recordsToDelete) {
            await deleteDoc(doc(db, 'users', uid, 'savingsRecords', r.id)).catch(() => {});
          }

          const updated = savingsGoals.filter((item) => item.id !== goalId);
          const updatedRecords = savingsRecords.filter((r) => r.goalId !== goalId);
          setSavingsGoals(updated);
          setSavingsRecords(updatedRecords);
          triggerSuccessToast('ลบกระปุกออมเงินจาก Cloud สำเร็จ');
          setSyncError(null);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/savingsGoals/${goalId}`);
        }
      },
    });
  };

  const handleAddSavingsRecord = async (recordData: {
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

    const updatedRecords = [newRecord, ...savingsRecords];
    setSavingsGoals(updatedGoals);
    setSavingsRecords(updatedRecords);

    try {
      await setDoc(
        doc(db, 'users', uid, 'savingsRecords', newRecord.id),
        cleanForFirestore(newRecord)
      );
      if (targetGoalToSave) {
        await setDoc(
          doc(db, 'users', uid, 'savingsGoals', recordData.goalId),
          cleanForFirestore(targetGoalToSave)
        );
      }
      triggerSuccessToast('บันทึกการหยอด/ถอนเงินบน Cloud เรียบร้อย');
      setSyncError(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/savingsRecords/${newRecord.id}`);
    }
  };

  const handleDeleteSavingsRecord = async (record: SavingsRecord, revertGoalBalance: boolean = true) => {
    if (!user) return;
    const uid = user.uid;

    setDeleteModalState({
      isOpen: true,
      title: 'ยืนยันการลบประวัติรายการออม',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการ${record.type === 'deposit' ? 'หยอดเงิน' : 'ถอนเงิน'} ฿${record.amount.toLocaleString()} ${record.notes ? `("${record.notes}")` : ''}? ${revertGoalBalance ? 'ยอดเงินในกระปุกจะถูกปรับคืนให้อัตโนมัติ' : ''}`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid, 'savingsRecords', record.id));

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
              await setDoc(
                doc(db, 'users', uid, 'savingsGoals', record.goalId),
                cleanForFirestore(goalToUpdate)
              );
            }
            setSavingsGoals(updatedGoals);
          }

          const updatedRecords = savingsRecords.filter((r) => r.id !== record.id);
          setSavingsRecords(updatedRecords);
          triggerSuccessToast('ลบรายการออมจาก Cloud เรียบร้อย');
          setSyncError(null);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}/savingsRecords/${record.id}`);
        }
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
      title: 'รีเซ็ตและล้างข้อมูลทั้งหมด',
      message: 'ต้องการล้างรายการบันทึกรับ-จ่าย เงินออม กระปุกเป้าหมาย และประวัติทั้งหมดบน Firebase Cloud ให้เป็น 0 หรือไม่? (ข้อมูลทุกส่วนจะถูกล้างสะอาดหมดจด)',
      onConfirm: async () => {
        try {
          // 1. Delete all transactions from users/{uid}/transactions in Firestore
          const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
          if (!txSnap.empty) {
            const batchTxs = writeBatch(db);
            txSnap.docs.forEach((d) => batchTxs.delete(d.ref));
            await batchTxs.commit();
          }

          // 2. Delete all savings records from users/{uid}/savingsRecords in Firestore
          const recSnap = await getDocs(collection(db, 'users', uid, 'savingsRecords'));
          if (!recSnap.empty) {
            const batchRecs = writeBatch(db);
            recSnap.docs.forEach((d) => batchRecs.delete(d.ref));
            await batchRecs.commit();
          }

          // 3. Delete all savings goals from users/{uid}/savingsGoals in Firestore
          const goalSnap = await getDocs(collection(db, 'users', uid, 'savingsGoals'));
          if (!goalSnap.empty) {
            const batchGoals = writeBatch(db);
            goalSnap.docs.forEach((d) => batchGoals.delete(d.ref));
            await batchGoals.commit();
          }

          // 4. Reset categories to clean DEFAULT_CATEGORIES in Firestore
          const catSnap = await getDocs(collection(db, 'users', uid, 'categories'));
          const batchCats = writeBatch(db);
          catSnap.docs.forEach((d) => batchCats.delete(d.ref));
          DEFAULT_CATEGORIES.forEach((cat) => {
            const catRef = doc(db, 'users', uid, 'categories', cat.id);
            batchCats.set(catRef, cleanForFirestore({ ...cat, userId: uid }));
          });
          await batchCats.commit();

          // 5. Reset financial rule to DEFAULT_FINANCIAL_RULE in Firestore
          await setDoc(
            doc(db, 'users', uid, 'settings', 'financialRule'),
            cleanForFirestore({ ...DEFAULT_FINANCIAL_RULE, userId: uid })
          );

          // 6. Completely purge LocalStorage & IndexedDB browser storage
          await clearAllLocalAndBackupData();

          // 7. Update React state immediately to pristine empty state
          setTransactions([]);
          setCategories(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: uid })));
          setSavingsGoals([]);
          setSavingsRecords([]);
          setFinancialRule(DEFAULT_FINANCIAL_RULE);

          triggerSuccessToast('ล้างข้อมูลทั้งหมดบน Cloud สะอาดหมดจดแล้ว (ยอดเงินคงเหลือ ฿0.00)');
          setSyncError(null);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}/(reset)`);
        }
      },
    });
  };

  const handleSaveFinancialRule = async (newRule: FinancialRule) => {
    if (!user) return;
    const uid = user.uid;

    const ruleWithUser = { ...newRule, userId: uid };
    setFinancialRule(ruleWithUser);

    try {
      await setDoc(
        doc(db, 'users', uid, 'settings', 'financialRule'),
        cleanForFirestore(ruleWithUser)
      );
      triggerSuccessToast('บันทึกเกณฑ์ออมบน Cloud สำเร็จ');
      setSyncError(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/settings/financialRule`);
    }
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

  // 3. Multi-device Cloud Sync Loading Splash: Waits until initial data from Cloud is fetched
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-[#14171c] flex flex-col items-center justify-center text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 p-0.5 shadow-2xl shadow-emerald-950/70 mb-4">
          <div className="w-full h-full bg-[#181d24] rounded-[14px] flex items-center justify-center">
            <Wallet className="w-7 h-7 text-emerald-400" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-200">
          <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>กำลังเชื่อมต่อและซิงค์ข้อมูลจาก Firebase Cloud...</span>
        </div>
        <span className="text-xs text-emerald-400/80 mt-1.5 font-medium">
          ระบบ Real-time Multi-Device Sync สำหรับ {user.email || 'ผู้ใช้งาน'}
        </span>
      </div>
    );
  }

  // 4. Authenticated Dashboard with User-Specific Isolated Data
  return (
    <div className="min-h-screen bg-[#181b20] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Cloud Sync Warning Banner if error detected */}
      {syncError && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
          <div className="flex items-center gap-2 max-w-[80%]">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">
              <strong>ปัญหาการซิงก์ Cloud:</strong> {syncError.message} (ตรวจสอบ Security Rules ใน Firebase Console)
            </span>
          </div>
          <button
            onClick={() => setIsCloudModalOpen(true)}
            className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-lg text-[11px] shrink-0 transition-all shadow-sm"
          >
            ดูวิธีแก้ไข & Rules
          </button>
        </div>
      )}

      {/* Main Wrapper with Sidebar */}
      <div className="flex-1 flex min-w-0">
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
          onOpenCloudStatus={() => setIsCloudModalOpen(true)}
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
            onOpenCloudStatus={() => setIsCloudModalOpen(true)}
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
      </div>

      {/* Floating Success Toast */}
      {syncSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-[#1b222d] border border-emerald-500/40 text-emerald-300 rounded-2xl shadow-xl shadow-black/50 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* Cloud Diagnostics & Rules Modal */}
      {user && (
        <CloudSyncModal
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          user={user}
          isCloudConnected={isCloudConnected}
          syncError={syncError}
          transactionsCount={transactions.length}
          categoriesCount={categories.length}
          goalsCount={savingsGoals.length}
          recordsCount={savingsRecords.length}
          onClearError={() => setSyncError(null)}
        />
      )}

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
