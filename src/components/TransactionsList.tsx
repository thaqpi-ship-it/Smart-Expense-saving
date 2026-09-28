import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  PlusCircle,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onNavigateToReports: () => void;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  categories,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToReports,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income' | 'savings'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const categoriesMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Type filter
        if (selectedType !== 'all' && tx.type !== selectedType) return false;
        // Category filter
        if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) return false;
        // Search
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const cat = categoriesMap.get(tx.categoryId);
          const catName = cat ? cat.name.toLowerCase() : '';
          const merchant = (tx.merchant || '').toLowerCase();
          const notes = (tx.notes || '').toLowerCase();
          const amountStr = tx.amount.toString();
          return (
            catName.includes(q) ||
            merchant.includes(q) ||
            notes.includes(q) ||
            amountStr.includes(q) ||
            tx.date.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt;
        }
        if (sortBy === 'date-asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt;
        }
        if (sortBy === 'amount-desc') {
          return b.amount - a.amount;
        }
        if (sortBy === 'amount-asc') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [transactions, selectedType, selectedCategory, search, sortBy, categoriesMap]);

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header & Controls */}
      <div className="p-5 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">รายการบันทึกทั้งหมด (All Transactions)</h2>
            <p className="text-xs text-slate-400">
              ค้นหา ตรวจสอบ แก้ไข หรือลบรายการรายรับ-รายจ่ายที่บันทึกไว้ได้แบบเรียลไทม์
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToReports}
              className="px-3 py-2 bg-[#252c38] hover:bg-[#2f3747] border border-[#384355] text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก PDF / Excel</span>
            </button>
            <button
              onClick={onAddTransaction}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>+ บันทึกรายการใหม่</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาร้านค้า, บันทึกช่วยจำ, ยอดเงิน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#14181f] border border-[#2f3645] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-[#14181f] border border-[#2f3645] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:border-emerald-400"
          >
            <option value="all">ทุกประเภท (รายรับ, รายจ่าย, เงินออม)</option>
            <option value="expense">🔴 เฉพาะรายจ่าย (Expense)</option>
            <option value="income">🟢 เฉพาะรายรับ (Income)</option>
            <option value="savings">🔵 เฉพาะเงินออม/ลงทุน (Savings)</option>
          </select>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#14181f] border border-[#2f3645] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:border-emerald-400"
          >
            <option value="all">ทุกหมวดหมู่ (All Categories)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 'expense' ? '🔴' : c.type === 'income' ? '🟢' : '🔵'} {c.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#14181f] border border-[#2f3645] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer focus:border-emerald-400"
          >
            <option value="date-desc">วันที่: ล่าสุดก่อน (Newest First)</option>
            <option value="date-asc">วันที่: เก่าสุดก่อน (Oldest First)</option>
            <option value="amount-desc">ยอดเงิน: มากไปน้อย (Highest First)</option>
            <option value="amount-asc">ยอดเงิน: น้อยไปมาก (Lowest First)</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">
            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181c22] text-emerald-400 font-semibold border-b border-[#2f3645]">
                <tr>
                  <th className="py-3.5 px-4">วันที่</th>
                  <th className="py-3.5 px-4">ร้านค้า / บันทึกรายการ</th>
                  <th className="py-3.5 px-4">หมวดหมู่</th>
                  <th className="py-3.5 px-4 text-center">ประเภท</th>
                  <th className="py-3.5 px-4 text-right">จำนวนเงิน</th>
                  <th className="py-3.5 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a313f] text-slate-200">
                {filtered.map((tx) => {
                  const cat = categoriesMap.get(tx.categoryId);
                  const isIncome = tx.type === 'income';
                  const isSavings = tx.type === 'savings';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#282e3a] transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Merchant & notes */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{tx.merchant || cat?.name || '-'}</span>
                          {tx.goalId && (
                            <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.2 rounded-md">
                              ⚡ Auto-Sync กระปุก
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{
                              backgroundColor: cat ? `${cat.color}33` : '#94a3b833',
                              color: cat?.color || '#94a3b8',
                            }}
                          >
                            <CategoryIcon name={cat?.icon || 'Tag'} className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium text-slate-200">
                            {cat?.name || 'ไม่ระบุหมวดหมู่'}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isIncome
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : isSavings
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {isIncome ? 'รายรับ' : isSavings ? 'เงินออม/ลงทุน' : 'รายจ่าย'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`text-sm font-extrabold ${
                            isIncome
                              ? 'text-emerald-400'
                              : isSavings
                              ? 'text-cyan-300'
                              : 'text-slate-100'
                          }`}
                        >
                          {isIncome ? '+' : isSavings ? '→' : '-'}฿
                          {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Edit / Delete actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`action-edit-tx-${tx.id}`}
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 rounded-lg bg-[#282e3a] hover:bg-[#343c4c] text-emerald-400 transition-colors"
                            title="แก้ไขรายการ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`action-del-tx-${tx.id}`}
                            onClick={() => onDeleteTransaction(tx)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 transition-colors"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
  );
};
