import React, { useState } from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Shield,
  HeartHandshake,
  RotateCcw,
  Info,
  Layers,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { FinancialRule } from '../types';
import { FINANCIAL_RULE_PRESETS, DEFAULT_FINANCIAL_RULE } from '../data/initialData';

interface FinancialRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRule: FinancialRule;
  onSaveRule: (newRule: FinancialRule) => void;
  onResetToCleanState?: () => void;
}

export const FinancialRuleModal: React.FC<FinancialRuleModalProps> = ({
  isOpen,
  onClose,
  currentRule,
  onSaveRule,
  onResetToCleanState,
}) => {
  const [savingsPercent, setSavingsPercent] = useState<number>(currentRule.savingsPercent || 20);
  const [needsPercent, setNeedsPercent] = useState<number>(currentRule.needsPercent || 50);
  const [wantsPercent, setWantsPercent] = useState<number>(currentRule.wantsPercent || 30);
  const [ruleName, setRuleName] = useState<string>(currentRule.name || 'กำหนดเอง');
  const [showCleanConfirm, setShowCleanConfirm] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalPercent = savingsPercent + needsPercent + wantsPercent;
  const isBalanced = totalPercent === 100;

  // Apply a preset
  const handleSelectPreset = (preset: FinancialRule) => {
    setSavingsPercent(preset.savingsPercent);
    setNeedsPercent(preset.needsPercent);
    setWantsPercent(preset.wantsPercent);
    setRuleName(preset.name || 'กำหนดเอง');
  };

  // Quick savings pill change
  const handleQuickSavingsChange = (targetSavings: number) => {
    setSavingsPercent(targetSavings);
    // Auto-adjust needs and wants proportionally
    const remaining = 100 - targetSavings;
    const newNeeds = Math.round(remaining * (50 / 80));
    const newWants = remaining - newNeeds;
    setNeedsPercent(newNeeds);
    setWantsPercent(newWants);
    setRuleName(`เป้าหมายออม ${targetSavings}% (${newNeeds}/${newWants}/${targetSavings})`);
  };

  // Auto re-balance to 100%
  const handleAutoRebalance = () => {
    const remaining = Math.max(0, 100 - savingsPercent);
    const newNeeds = Math.round(remaining * 0.625);
    const newWants = remaining - newNeeds;
    setNeedsPercent(newNeeds);
    setWantsPercent(newWants);
  };

  const handleSave = () => {
    const finalRule: FinancialRule = {
      savingsPercent: Math.max(1, Math.min(90, savingsPercent)),
      needsPercent: Math.max(1, Math.min(90, needsPercent)),
      wantsPercent: Math.max(1, Math.min(90, wantsPercent)),
      name: ruleName,
    };
    onSaveRule(finalRule);
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#1c212a] border border-[#2d3648] rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2d3648] flex items-center justify-between bg-gradient-to-r from-[#222936] to-[#1c212a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-950/40">
              <div className="w-full h-full bg-[#181d24] rounded-[10px] flex items-center justify-center">
                <Sliders className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>ตั้งค่าเกณฑ์ออม & กฎทองทางการเงิน</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Customizable Rule
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ปรับเปลี่ยนสัดส่วนเป้าหมายเงินออม (เช่น 10%, 15%, 20%, 25%) ระบบจะคำนวณแดชบอร์ดและประเมินสุขภาพการเงินตามค่าใหม่ทันที
              </p>
            </div>
          </div>
          <button
            id="financial-rule-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#28303f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Presets Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>เลือกสัดส่วนยอดนิยม (Preset Formulas)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FINANCIAL_RULE_PRESETS.map((preset, idx) => {
                const isSelected =
                  savingsPercent === preset.savingsPercent &&
                  needsPercent === preset.needsPercent &&
                  wantsPercent === preset.wantsPercent;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                        : 'bg-[#161a22] border-[#293242] text-slate-300 hover:bg-[#202735] hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-slate-200 truncate">{preset.name}</div>
                    <div className="flex items-center gap-1 text-[11px] font-mono mt-1 text-slate-400">
                      <span className="text-cyan-400">จำเป็น {preset.needsPercent}%</span>
                      <span>/</span>
                      <span className="text-amber-400">สุข {preset.wantsPercent}%</span>
                      <span>/</span>
                      <span className="text-emerald-400 font-bold">ออม {preset.savingsPercent}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Proportion Bar */}
          <div className="p-4 rounded-xl bg-[#141820] border border-[#283141] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>ภาพรวมการจัดสรรกระแสเงินสด</span>
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                    isBalanced
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  รวม: {totalPercent}% {isBalanced ? '✓ ครบ 100%' : '⚠️ ไม่เท่ากับ 100%'}
                </span>
                {!isBalanced && (
                  <button
                    type="button"
                    onClick={handleAutoRebalance}
                    className="text-[11px] text-teal-400 hover:underline"
                  >
                    ปรับสมดุลอัตโนมัติ
                  </button>
                )}
              </div>
            </div>

            {/* Stacked Percentage Bar */}
            <div className="h-6 w-full bg-[#202633] rounded-xl overflow-hidden flex p-0.5 border border-[#2f394c]">
              <div
                style={{ width: `${Math.max(2, needsPercent)}%` }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-l-lg transition-all flex items-center justify-center text-[10px] font-mono font-bold text-white overflow-hidden px-1"
                title={`รายจ่ายจำเป็น ${needsPercent}%`}
              >
                {needsPercent >= 12 && `จำเป็น ${needsPercent}%`}
              </div>
              <div
                style={{ width: `${Math.max(2, wantsPercent)}%` }}
                className="bg-gradient-to-r from-amber-500 to-rose-400 h-full transition-all flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 overflow-hidden px-1"
                title={`รายจ่ายเพื่อความสุข ${wantsPercent}%`}
              >
                {wantsPercent >= 12 && `ความสุข ${wantsPercent}%`}
              </div>
              <div
                style={{ width: `${Math.max(2, savingsPercent)}%` }}
                className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-r-lg transition-all flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 overflow-hidden px-1"
                title={`เงินออม & ลงทุน ${savingsPercent}%`}
              >
                {savingsPercent >= 12 && `ออม ${savingsPercent}%`}
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className="p-2 rounded-lg bg-[#1b212c] border border-[#2b3546]">
                <div className="flex items-center justify-center gap-1.5 text-blue-400 font-semibold mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span>รายจ่ายจำเป็น</span>
                </div>
                <div className="text-base font-bold text-white font-mono">{needsPercent}%</div>
              </div>
              <div className="p-2 rounded-lg bg-[#1b212c] border border-[#2b3546]">
                <div className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>รายจ่ายความสุข</span>
                </div>
                <div className="text-base font-bold text-white font-mono">{wantsPercent}%</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span>เป้าหมายออม & ลงทุน</span>
                </div>
                <div className="text-base font-bold text-emerald-300 font-mono">{savingsPercent}%</div>
              </div>
            </div>
          </div>

          {/* Detailed Controls: Savings Target Focus */}
          <div className="space-y-4">
            {/* Primary Target: Savings % */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#1b2626] to-[#171d24] border border-emerald-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>1. เป้าหมายเงินออม & การลงทุน (Savings Target Rate)</span>
                  </label>
                  <p className="text-xs text-slate-400">
                    เกณฑ์เงินออมเป้าหมายที่จะใช้ประเมินสุขภาพการเงินและเทียบในหน้าแรก
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={savingsPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setSavingsPercent(val);
                    }}
                    className="w-16 px-2 py-1 text-center font-mono font-bold text-base text-emerald-300 bg-[#12161d] border border-emerald-500/50 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-emerald-400 font-bold font-mono">%</span>
                </div>
              </div>

              {/* Quick Choice Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">เลือกเร็ว:</span>
                {[10, 15, 20, 25, 30, 35, 40].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickSavingsChange(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      savingsPercent === val
                        ? 'bg-emerald-400 text-slate-950 shadow-md'
                        : 'bg-[#1e2733] text-slate-300 hover:bg-[#253242] border border-[#2f3d52]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={savingsPercent}
                onChange={(e) => setSavingsPercent(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />

              <div className="flex items-center gap-2 text-[11px] text-emerald-300/80 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                <Info className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>
                  ตัวอย่าง: หากมีรายรับ ฿50,000 จะตั้งเป้าหมายออมและลงทุนเดือนละ{' '}
                  <strong className="text-white font-mono">
                    ฿{((50000 * savingsPercent) / 100).toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>

            {/* Needs % Slider */}
            <div className="p-3.5 rounded-xl bg-[#161b24] border border-[#283244] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>2. เพดานรายจ่ายจำเป็น (Needs / ค่าใช้จ่ายพื้นฐาน)</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={needsPercent}
                    onChange={(e) => setNeedsPercent(Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-center font-mono font-bold text-xs text-blue-300 bg-[#12161d] border border-blue-500/40 rounded-lg"
                  />
                  <span className="text-blue-400 font-mono font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                step="1"
                value={needsPercent}
                onChange={(e) => setNeedsPercent(Number(e.target.value))}
                className="w-full accent-blue-400 cursor-pointer"
              />
            </div>

            {/* Wants % Slider */}
            <div className="p-3.5 rounded-xl bg-[#161b24] border border-[#283244] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. สัดส่วนเพื่อความสุข & ไลฟ์สไตล์ (Wants / Joy Spending)</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={wantsPercent}
                    onChange={(e) => setWantsPercent(Number(e.target.value))}
                    className="w-14 px-2 py-0.5 text-center font-mono font-bold text-xs text-amber-300 bg-[#12161d] border border-amber-500/40 rounded-lg"
                  />
                  <span className="text-amber-400 font-mono font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={wantsPercent}
                onChange={(e) => setWantsPercent(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Clean Production Reset Section */}
          {onResetToCleanState && (
            <div className="p-4 rounded-xl bg-[#1b1e25] border border-slate-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>เตรียมระบบสำหรับการนำไป Deploy จริง (Clean Data)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ล้างประวัติธุรกรรมและประวัติการหยอดกระปุกทั้งหมดให้เป็น 0 เพื่อส่งมอบระบบให้ผู้ใช้ใหม่ทันที
                  </p>
                </div>
                {!showCleanConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowCleanConfirm(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                  >
                    ล้างข้อมูลเพื่อเริ่มจริง
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onResetToCleanState();
                        setShowCleanConfirm(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                    >
                      ยืนยันล้างข้อมูล 0
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCleanConfirm(false)}
                      className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#2d3648] bg-[#171b22] flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelectPreset(DEFAULT_FINANCIAL_RULE)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่ามาตรฐาน (50/30/20)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#232a38] transition-colors"
            >
              ยกเลิก
            </button>
            <button
              id="financial-rule-save-btn"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast ? 'บันทึกเรียบร้อย!' : 'บันทึกเกณฑ์เป้าหมาย'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
