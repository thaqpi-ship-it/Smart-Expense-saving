import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Database,
  ShieldCheck,
  Smartphone,
  Laptop,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { db } from '../firebase.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isCloudConnected: boolean;
  syncError: { message: string; code?: string; path?: string } | null;
  transactionsCount: number;
  categoriesCount: number;
  goalsCount: number;
  recordsCount: number;
  onClearError?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  isCloudConnected,
  syncError,
  transactionsCount,
  categoriesCount,
  goalsCount,
  recordsCount,
  onClearError,
}) => {
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  if (!isOpen) return null;

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตให้ผู้ใช้เข้าถึงเฉพาะข้อมูลส่วนตัวของตนเอง (User-Specific Data)
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const handleTestCloudSync = async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const testRef = doc(db, 'users', user.uid, '_system_sync_probe', 'ping');
      await setDoc(testRef, {
        timestamp: Date.now(),
        clientTime: new Date().toISOString(),
        testedBy: user.email || 'anonymous',
      });
      const snap = await getDoc(testRef);
      const latency = Date.now() - start;
      if (snap.exists()) {
        setTestResult({
          success: true,
          message: 'เชื่อมต่อและเขียน-อ่านข้อมูลบน Firebase Cloud สำเร็จ 100%!',
          latencyMs: latency,
        });
        if (onClearError) onClearError();
      } else {
        setTestResult({
          success: false,
          message: 'สามารถส่งข้อมูลได้แต่ไม่พบเอกสารตอบกลับจาก Cloud',
        });
      }
    } catch (err: any) {
      console.error('Test sync failed:', err);
      setTestResult({
        success: false,
        message: err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Cloud',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1c212a] border border-[#2f3747] w-full max-w-xl rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2b3342] flex items-center justify-between bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>สถานะการซิงก์ Cloud ข้ามเครื่อง</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Multi-Device Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ตรวจสอบความพร้อมของ Firebase Firestore เพื่อให้ข้อมูลตรงกันทุกเครื่อง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#252c38] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Active Error Banner if any */}
          {syncError && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>พบปัญหาการเขียน/อ่าน Firebase Firestore:</span>
              </div>
              <p className="font-mono text-[11px] bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50 break-all">
                {syncError.message}
              </p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                👉 <strong>สาเหตุที่พบบ่อย:</strong> ยังไม่ได้ตั้งค่า <strong>Security Rules</strong> ใน Firebase Console หรือ Rules เดิมหมดอายุ ให้คัดลอก Rules ด้านล่างไปวางใน Firebase Console แล้วกด Publish
              </p>
            </div>
          )}

          {/* Device & Account Identity */}
          <div className="p-4 rounded-2xl bg-[#14181f] border border-[#2b3342] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>บัญชีผู้ใช้งานปัจจุบันบนเครื่องนี้</span>
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isCloudConnected ? 'Cloud เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อ'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-slate-300">
              <div className="p-2.5 bg-[#1b2029] rounded-xl border border-[#2c3545]">
                <span className="text-[10px] text-slate-500 block">อีเมลที่เข้าสู่ระบบ</span>
                <span className="font-bold text-white truncate block">{user.email || 'เข้าสู่ระบบด้วย Google/นิรนาม'}</span>
              </div>
              <div className="p-2.5 bg-[#1b2029] rounded-xl border border-[#2c3545]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">User ID (UID)</span>
                  <button
                    onClick={handleCopyUid}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUid ? 'คัดลอกแล้ว' : 'คัดลอก UID'}</span>
                  </button>
                </div>
                <span className="font-mono text-[11px] text-emerald-300 truncate block mt-0.5" title={user.uid}>
                  {user.uid}
                </span>
              </div>
            </div>

            {/* Cross-device Explanation */}
            <div className="flex items-start gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
              <div className="flex items-center gap-1 shrink-0 mt-0.5 text-emerald-400 font-bold">
                <Laptop className="w-3.5 h-3.5" />
                <span>⇄</span>
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <p>
                <strong>จุดสำคัญ:</strong> เพื่อให้เครื่อง B ซิงก์ข้อมูลกับเครื่อง A กรุณากดล็อกอินด้วย <strong>บัญชีเดียวกัน</strong> เพื่อให้ได้ <strong>User ID (UID) เดียวกัน</strong> ข้อมูลจะถูกดึงข้ามเครื่องอัตโนมัติแบบเรียลไทม์ทันที
              </p>
            </div>
          </div>

          {/* Current Synced Counts */}
          <div className="p-4 rounded-2xl bg-[#14181f] border border-[#2b3342] space-y-2.5">
            <span className="font-semibold text-slate-200 block">จำนวนข้อมูลที่บันทึกอยู่บน Cloud ของคุณ:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-[#1b2029] rounded-xl border border-[#2b3444]">
                <span className="text-[10px] text-slate-400 block">รายการรับ-จ่าย</span>
                <span className="text-base font-extrabold text-emerald-400">{transactionsCount}</span>
              </div>
              <div className="p-2.5 bg-[#1b2029] rounded-xl border border-[#2b3444]">
                <span className="text-[10px] text-slate-400 block">หมวดหมู่งบ</span>
                <span className="text-base font-extrabold text-teal-400">{categoriesCount}</span>
              </div>
              <div className="p-2.5 bg-[#1b2029] rounded-xl border border-[#2b3444]">
                <span className="text-[10px] text-slate-400 block">กระปุกเป้าหมาย</span>
                <span className="text-base font-extrabold text-blue-400">{goalsCount}</span>
              </div>
              <div className="p-2.5 bg-[#1b2029] rounded-xl border border-[#2b3444]">
                <span className="text-[10px] text-slate-400 block">ประวัติการออม</span>
                <span className="text-base font-extrabold text-purple-400">{recordsCount}</span>
              </div>
            </div>
          </div>

          {/* Live Cloud Test Button */}
          <div className="space-y-2">
            <button
              onClick={handleTestCloudSync}
              disabled={isTesting}
              className="w-full py-3 bg-[#242c3a] hover:bg-[#2c3647] active:scale-[0.99] border border-emerald-500/40 text-emerald-300 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>กำลังทดสอบเขียน-อ่านข้อมูลบน Firestore Cloud...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>ทดสอบเขียนและอ่านข้อมูลบน Cloud ทันที (Test Ping)</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">{testResult.message}</span>
                  {testResult.latencyMs !== undefined && (
                    <span className="text-[10px] text-emerald-300/80">
                      ความเร็วการตอบสนอง (Round-trip Latency): {testResult.latencyMs} ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Firebase Rules Configuration Guide */}
          <div className="p-4 rounded-2xl bg-[#14181f] border border-[#2b3342] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">
                โค้ด Firebase Firestore Rules (หากติด Permission Denied)
              </span>
              <button
                onClick={handleCopyRules}
                className="px-2.5 py-1 bg-[#232a37] hover:bg-[#2b3444] border border-[#3b465c] text-emerald-300 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all"
              >
                {copiedRules ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? 'คัดลอกเรียบร้อย' : 'คัดลอก Rules'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              ไปที่ <strong>Firebase Console</strong> &gt; <strong>Firestore Database</strong> &gt; เมนู <strong>Rules</strong> วางโค้ดนี้แล้วกด <strong>Publish</strong>:
            </p>
            <pre className="p-3 bg-[#0d1015] border border-[#222936] rounded-xl font-mono text-[10px] text-emerald-300/90 overflow-x-auto leading-relaxed">
              {FIRESTORE_RULES_SNIPPET}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2b3342] bg-[#181d24] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Path: <code className="font-mono text-emerald-400">users/{user.uid}/...</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
