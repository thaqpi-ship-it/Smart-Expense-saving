import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Category, FinancialRule, SavingsGoal, SavingsRecord, Transaction } from '../types';
import { exportBackupJSON, importBackupJSON } from '../utils/storage';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  savingsRecords: SavingsRecord[];
  financialRule: FinancialRule;
  onDataRestored: (data: {
    transactions: Transaction[];
    categories: Category[];
    savingsGoals: SavingsGoal[];
    savingsRecords: SavingsRecord[];
    financialRule: FinancialRule;
  }) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  savingsGoals,
  savingsRecords,
  financialRule,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `smart-tracker-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    const jsonStr = exportBackupJSON();
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processImport(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const processImport = (jsonStr: string) => {
    setImportStatus(null);
    const result = importBackupJSON(jsonStr);
    if (result.success && result.data) {
      onDataRestored(result.data);
      setImportStatus({
        success: true,
        message: `กู้คืนข้อมูลสำเร็จ! นำเข้ารายการบันทึก ${result.data.transactions.length} รายการ, กระปุกออมเงิน ${result.data.savingsGoals.length} เป้าหมาย`,
      });
      setPasteText('');
    } else {
      setImportStatus({
        success: false,
        message: result.error || 'ไม่สามารถกู้คืนข้อมูลได้ กรุณาตรวจสอบรูปแบบไฟล์ JSON',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="backup-restore-modal"
        className="w-full max-w-xl bg-[#21252d] border border-[#2f3645] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3645] bg-[#1c2027]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                สำรองและกู้คืนข้อมูล (Backup & Restore)
              </h2>
              <p className="text-xs text-slate-400">
                ป้องกันข้อมูลสูญหาย ถ่ายโอนข้ามอุปกรณ์ หรือบันทึกเก็บไว้เป็นไฟล์ JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#282e3a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Data Overview Card */}
        <div className="px-6 pt-4">
          <div className="p-3.5 rounded-xl bg-[#171a21] border border-[#2b3341] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>สถานะในเครื่องปัจจุบัน:</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-emerald-400 font-bold">{transactions.length} รายการ</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">{savingsGoals.length} กระปุกออม</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-bold">{categories.length} หมวด</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex bg-[#161920] p-1 rounded-xl border border-[#2b3341]">
            <button
              onClick={() => {
                setActiveTab('export');
                setImportStatus(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'export'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>สำรองข้อมูลออก (Export Backup)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('import');
                setImportStatus(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>กู้คืนข้อมูลเข้า (Import Restore)</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {importStatus && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                importStatus.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
              }`}
            >
              {importStatus.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{importStatus.message}</span>
            </div>
          )}

          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#191d25] border border-[#2b3341] space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ดาวน์โหลดไฟล์สำรองข้อมูล (JSON File)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ไฟล์สำรองจะรวมรายการบันทึกรายรับ-รายจ่ายทั้งหมด, ข้อมูลกระปุกออมเงิน, หมวดหมู่ และการตั้งค่าเป้าหมาย สามารถนำกลับมากู้คืนได้ตลอดเวลา
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    id="download-backup-json-btn"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์สำรอง (.json)</span>
                  </button>
                  <button
                    onClick={handleCopyClipboard}
                    className="px-4 py-2.5 bg-[#252c38] hover:bg-[#2f3849] border border-[#3b465a] text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">คัดลอกลงคลิปบอร์ดแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>คัดลอกข้อความ JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/20 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-teal-300 flex items-center gap-1.5">
                  💡 ระบบบันทึกอัตโนมัติ 2 ชั้น (Dual-Layer Auto-Save)
                </span>
                <p className="text-[11px] text-slate-400">
                  ระบบได้เปิดใช้งานการบันทึกพร้อมกันทั้งใน LocalStorage และ IndexedDB ของเบราว์เซอร์อัตโนมัติ เพื่อป้องกันการสูญหายเมื่อปิดหน้าจอ
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#191d25] border border-[#2b3341] space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>เลือกไฟล์สำรองเพื่อกู้คืน (.json)</span>
                </div>
                <p className="text-xs text-slate-300">
                  เลือกไฟล์ .json ที่คุณเคยดาวน์โหลดไว้ ข้อมูลในไฟล์จะถูกนำกลับเข้าสู่ระบบทันที
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  id="browse-backup-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 border-2 border-dashed border-[#3d485c] hover:border-emerald-500/60 rounded-xl bg-[#14171f] hover:bg-[#181d26] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>คลิกเพื่อเลือกไฟล์สำรองข้อมูล (.json)</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>หรือวางข้อความ JSON ที่คัดลอกไว้:</span>
                </label>
                <textarea
                  rows={3}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="วางโค้ด JSON สำรองที่นี่..."
                  className="w-full p-3 bg-[#14171f] border border-[#2e3747] rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-400"
                />
                {pasteText.trim() && (
                  <button
                    onClick={() => processImport(pasteText.trim())}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
                  >
                    เริ่มกู้คืนข้อมูลจากข้อความ JSON
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2f3645] bg-[#1a1e25] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#252c38] hover:bg-[#2f3849] text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
