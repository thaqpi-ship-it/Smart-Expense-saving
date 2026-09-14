import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Sparkles, Send, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Category, Transaction } from '../types';

interface VoiceTextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExtracted: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  categories: Category[];
}

export const VoiceTextInputModal: React.FC<VoiceTextInputModalProps> = ({
  isOpen,
  onClose,
  onSaveExtracted,
  categories,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<{
    amount: number;
    date: string;
    merchantName?: string;
    category?: string;
    type?: 'expense' | 'income';
    notes?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setExtractedData(null);
      setError(null);
      setIsListening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Please type your message below.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH'; // Supports Thai & English mixed
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setError(`Microphone error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.error(e);
      setIsListening(false);
      setError('Could not access microphone.');
    }
  };

  const handleSmartParse = async () => {
    if (!inputText.trim()) {
      setError('Please type or speak your transaction details first');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/smart-parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse text');
      }

      setExtractedData(data.data);
    } catch (err: any) {
      console.warn('Smart text parse fallback:', err);
      // Fallback parser using regex
      const amountMatch = inputText.match(/(\d+(?:\.\d{1,2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;
      const isIncome =
        inputText.toLowerCase().includes('salary') ||
        inputText.includes('เงินเดือน') ||
        inputText.includes('รายรับ') ||
        inputText.includes('income');

      setExtractedData({
        amount,
        date: new Date().toISOString().split('T')[0],
        merchantName: inputText.split(/\s+/).slice(0, 3).join(' '),
        category: isIncome ? 'Primary Salary' : 'Food & Dining',
        type: isIncome ? 'income' : 'expense',
        notes: inputText,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmSave = () => {
    if (!extractedData) return;

    let matchedCat = categories.find(
      (c) =>
        c.name.toLowerCase().includes((extractedData.category || '').toLowerCase()) ||
        (extractedData.category || '').toLowerCase().includes(c.name.toLowerCase())
    );

    if (!matchedCat) {
      matchedCat = categories.find((c) => c.type === (extractedData.type || 'expense'));
    }

    onSaveExtracted({
      amount: extractedData.amount,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      categoryId: matchedCat ? matchedCat.id : categories[0]?.id || '',
      type: extractedData.type || 'expense',
      merchant: extractedData.merchantName,
      notes: extractedData.notes || inputText,
    });

    onClose();
  };

  const presetExamples = [
    'กินชาบูสุกี้ตี๋น้อย 380 บาท เมื่อวาน',
    'Starbucks caramel macchiato 175 baht today',
    'เติมน้ำมัน ปตท 1,200 บาท',
    'ได้เงินเดือนโอนเข้า 65,000 บาท',
    'ซื้อเสื้อ Uniqlo 1,490 บาท',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="voice-input-modal"
        className="w-full max-w-lg bg-[#21252d] border border-[#2f3645] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3645] bg-[#1c2027]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                บันทึกด้วยเสียงและข้อความ AI
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  AI Powered
                </span>
              </h2>
              <p className="text-xs text-emerald-400">
                พูดหรือพิมพ์ประโยคตามธรรมชาติ AI จะช่วยแยกข้อมูลให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            id="close-voice-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#282e3a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Voice Mic Button & Input Box */}
          <div className="relative">
            <textarea
              id="voice-text-textarea"
              rows={3}
              placeholder="เช่น กินกาแฟสตาร์บัคส์ 165 บาท วันนี้ หรือ ได้รับเงินเดือน 65,000 บาท..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3.5 pr-14 bg-[#14181f] border border-[#2f3645] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              id="toggle-mic-btn"
              type="button"
              onClick={toggleVoiceRecognition}
              className={`absolute right-3 top-3 p-2.5 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                  : 'bg-[#29303d] hover:bg-[#343c4c] text-emerald-300'
              }`}
              title={isListening ? 'กำลังฟัง... คลิกเพื่อหยุด' : 'คลิกเพื่อเริ่มพูด'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Examples */}
          <div>
            <span className="text-[11px] text-slate-300 block mb-1.5 font-medium">
              คลิกตัวอย่างเพื่อทดลองได้ทันที:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetExamples.map((ex, i) => (
                <button
                  key={i}
                  id={`voice-preset-${i}`}
                  type="button"
                  onClick={() => setInputText(ex)}
                  className="px-2.5 py-1.5 text-[11px] bg-[#181c22] hover:bg-[#252b36] border border-[#2f3645] hover:border-emerald-400 rounded-lg text-slate-300 hover:text-white transition-all text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Parse Button */}
          <button
            id="smart-parse-btn"
            type="button"
            disabled={!inputText.trim() || isParsing}
            onClick={handleSmartParse}
            className="w-full py-2.5 bg-[#252c38] hover:bg-[#2e3746] border border-[#3c465a] text-emerald-300 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>AI กำลังวิเคราะห์ข้อความ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>วิเคราะห์ด้วย AI (Extract with AI)</span>
              </>
            )}
          </button>

          {/* Extracted Preview */}
          {extractedData && (
            <div className="p-4 rounded-2xl bg-[#181c22] border border-emerald-500/40 space-y-3 animate-in fade-in">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>ข้อมูลรายการที่สกัดได้</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                  {extractedData.type === 'income' ? '🟢 รายรับ' : '🔴 รายจ่าย'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#14181f] border border-[#282f3c]">
                  <span className="text-slate-400 block text-[10px]">จำนวนเงิน:</span>
                  <span className="font-bold text-white text-base">
                    ฿{extractedData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#14181f] border border-[#282f3c]">
                  <span className="text-slate-400 block text-[10px]">วันที่:</span>
                  <span className="font-semibold text-white">{extractedData.date}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#14181f] border border-[#282f3c]">
                  <span className="text-slate-400 block text-[10px]">ร้านค้า / ผู้รับเงิน:</span>
                  <span className="font-semibold text-white truncate block">
                    {extractedData.merchantName || '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#14181f] border border-[#282f3c]">
                  <span className="text-slate-400 block text-[10px]">หมวดหมู่:</span>
                  <span className="font-semibold text-emerald-300 truncate block">
                    {extractedData.category || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2f3645] bg-[#1c2027]">
          <button
            id="cancel-voice-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a] transition-colors"
          >
            ยกเลิก
          </button>
          <button
            id="confirm-voice-tx-btn"
            type="button"
            disabled={!extractedData}
            onClick={handleConfirmSave}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 text-slate-950" />
            <span>บันทึกเข้าระบบทันที</span>
          </button>
        </div>
      </div>
    </div>
  );
};
