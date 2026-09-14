import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Printer,
  Download,
  Check,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { exportToExcel, printOrSavePDF } from '../utils/export';
import { DatePicker } from './DatePicker';

interface ReportsExportProps {
  transactions: Transaction[];
  categories: Category[];
}

export const ReportsExport: React.FC<ReportsExportProps> = ({ transactions, categories }) => {
  // Default range: first day of current month to today
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');

  const [startDate, setStartDate] = useState<string>(`${currentYear}-${currentMonth}-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-${currentMonth}-${currentDay}`);

  const categoriesMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Filter transactions by date range and sort chronologically (oldest to newest)
  const reportTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return diff !== 0 ? diff : a.createdAt - b.createdAt;
      });
  }, [transactions, startDate, endDate]);

  const { totalIncome, totalExpense, totalSavings, netBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let sav = 0;
    reportTransactions.forEach((tx) => {
      if (tx.type === 'income') inc += tx.amount;
      else if (tx.type === 'savings') sav += tx.amount;
      else exp += tx.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      totalSavings: sav,
      netBalance: inc - exp - sav,
    };
  }, [reportTransactions]);

  // Date range presets
  const setPresetRange = (preset: 'this-month' | 'last-month' | 'last-30' | 'this-year' | 'all') => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (preset === 'this-month') {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last-month') {
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last-30') {
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const end = today.toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this-year') {
      setStartDate(`${y}-01-01`);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(`${y + 1}-12-31`);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(reportTransactions, categoriesMap, { startDate, endDate });
  };

  const handleExportPDF = () => {
    printOrSavePDF(reportTransactions, categoriesMap, { startDate, endDate });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner & Date Range Picker */}
      <div className="p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              ออกรายงานและส่งออกข้อมูล (Reports & Export)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              เลือกช่วงวันที่เพื่อดูตัวอย่างและส่งออกรายงานทางการเงิน พร้อมหัวกระดาษภาษาไทยตามมาตรฐาน
            </p>
          </div>

          {/* Export action buttons */}
          <div className="flex items-center gap-3">
            <button
              id="export-excel-btn"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-[#292f3c] hover:bg-[#343b4c] border border-[#3d4659] text-emerald-300 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-105"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>ส่งออกไฟล์ Excel (.xlsx)</span>
            </button>

            <button
              id="export-pdf-btn"
              onClick={handleExportPDF}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>ส่งออก / พิมพ์ PDF</span>
            </button>
          </div>
        </div>

        {/* Date Range Picker Bar */}
        <div className="p-4 rounded-xl bg-[#181c22] border border-[#2c3342] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                วันที่เริ่มต้น (Start Date)
              </label>
              <DatePicker
                id="report-start-date"
                value={startDate}
                onChange={setStartDate}
                placeholder="เลือกวันที่เริ่มต้น (YYYY-MM-DD)"
                showShortcuts={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                วันที่สิ้นสุด (End Date)
              </label>
              <DatePicker
                id="report-end-date"
                value={endDate}
                onChange={setEndDate}
                placeholder="เลือกวันที่สิ้นสุด (YYYY-MM-DD)"
                showShortcuts={false}
              />
            </div>

            {/* Quick presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                เลือกช่วงเวลาด่วน
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetRange('this-month')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#222733] hover:bg-[#2b3240] text-emerald-300 border border-[#343b4c] transition-colors"
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange('last-month')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#222733] hover:bg-[#2b3240] text-emerald-300 border border-[#343b4c] transition-colors"
                >
                  เดือนที่แล้ว
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange('this-year')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#222733] hover:bg-[#2b3240] text-emerald-300 border border-[#343b4c] transition-colors"
                >
                  ปีนี้
                </button>
                <button
                  type="button"
                  onClick={() => setPresetRange('all')}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#222733] hover:bg-[#2b3240] text-emerald-300 border border-[#343b4c] transition-colors"
                >
                  ทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#181c22] border border-[#2c3342]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              รวมรายรับในช่วงเวลา
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400">
              +฿{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#181c22] border border-[#2c3342]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              รวมรายจ่ายในช่วงเวลา
            </span>
            <span className="text-base sm:text-lg font-black text-red-400">
              -฿{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#181c22] border border-[#2c3342]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              รวมเงินออม & ลงทุน
            </span>
            <span className="text-base sm:text-lg font-black text-cyan-400">
              ฿{totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#181c22] border border-[#2c3342]">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              ยอดคงเหลือในบัญชี
            </span>
            <span
              className={`text-base sm:text-lg font-black ${
                netBalance >= 0 ? 'text-teal-300' : 'text-red-400'
              }`}
            >
              ฿{netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Exact Formatting Live Preview Box */}
      <div className="p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#2f3645]">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            ตัวอย่างรายงานตามเกณฑ์ (18pt, 16pt, 14pt)
          </span>
          <span className="text-[11px] text-slate-400">
            {reportTransactions.length} รายการ (เรียงตามลำดับเวลา)
          </span>
        </div>

        {/* Paper simulation container */}
        <div className="bg-white text-slate-900 p-8 rounded-xl shadow-2xl overflow-x-auto border border-slate-200">
          {/* Exact Line 1: บริหารจัดการรับ-จ่าย (Bold, Font Size 18) */}
          <div
            id="report-line-1"
            className="text-center font-bold text-[#064e3b]"
            style={{ fontSize: '18pt', lineHeight: 1.3 }}
          >
            บริหารจัดการรับ-จ่าย
          </div>

          {/* Exact Line 2: ระหว่างวันที่ [Selected Start Date] ถึง [Selected End Date] (Font Size 16) */}
          <div
            id="report-line-2"
            className="text-center text-slate-700 font-medium mt-1 mb-6"
            style={{ fontSize: '16pt', lineHeight: 1.3 }}
          >
            ระหว่างวันที่ {startDate || '...'} ถึง {endDate || '...'}
          </div>

          {/* Exact Line 3: Table listing all transactions sorted chronologically, matching recorded headings (Font Size 14) */}
          <table className="w-full border-collapse" style={{ fontSize: '14pt' }}>
            <thead>
              <tr className="border-t-2 border-b-2 border-emerald-900 bg-slate-50 text-slate-900">
                <th className="py-2.5 px-3 text-center" style={{ width: '6%' }}>ลำดับ</th>
                <th className="py-2.5 px-3 text-left" style={{ width: '14%' }}>วันที่</th>
                <th className="py-2.5 px-3 text-left" style={{ width: '28%' }}>รายการ / ร้านค้า</th>
                <th className="py-2.5 px-3 text-left" style={{ width: '18%' }}>หมวดหมู่</th>
                <th className="py-2.5 px-3 text-center" style={{ width: '12%' }}>ประเภท</th>
                <th className="py-2.5 px-3 text-right" style={{ width: '16%' }}>จำนวนเงิน (บาท)</th>
                <th className="py-2.5 px-3 text-left" style={{ width: '16%' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    ไม่พบรายการในช่วงวันที่ที่เลือก
                  </td>
                </tr>
              ) : (
                reportTransactions.map((tx, idx) => {
                  const cat = categoriesMap.get(tx.categoryId);
                  const isIncome = tx.type === 'income';
                  const isSavings = tx.type === 'savings';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{tx.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {tx.merchant || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {cat ? cat.name : 'ทั่วไป'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-semibold ${
                            isIncome
                              ? 'text-emerald-700'
                              : isSavings
                              ? 'text-sky-700'
                              : 'text-red-700'
                          }`}
                        >
                          {isIncome ? 'รายรับ' : isSavings ? 'เงินออม/ลงทุน' : 'รายจ่าย'}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold font-mono ${
                          isIncome
                            ? 'text-emerald-700'
                            : isSavings
                            ? 'text-sky-700'
                            : 'text-slate-900'
                        }`}
                      >
                        {isIncome ? '+' : isSavings ? '→' : '-'}
                        {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[13pt]">{tx.notes || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Table Totals Footer */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col sm:flex-row justify-end items-end gap-4 text-[14pt]">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1 min-w-[300px]">
              <div className="flex justify-between">
                <span className="text-slate-600">รวมรายรับทั้งหมด:</span>
                <span className="font-bold text-emerald-700">
                  +฿{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">รวมรายจ่ายทั้งหมด:</span>
                <span className="font-bold text-red-600">
                  -฿{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">รวมเงินออม & ลงทุน:</span>
                <span className="font-bold text-sky-700">
                  ฿{totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-300 font-bold">
                <span className="text-slate-900">ยอดคงเหลือในบัญชี:</span>
                <span className={netBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  ฿{netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
