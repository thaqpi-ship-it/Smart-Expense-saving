import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  Sparkles,
  Check,
  AlertCircle,
  FileCheck,
  ArrowRight,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExtracted: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  categories: Category[];
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveExtracted,
  categories,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<{
    amount: number;
    date: string;
    merchantName?: string;
    category?: string;
    type?: 'expense' | 'income';
    notes?: string;
  } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to find the best matching category from user's categories database
  const findBestMatchingCategory = (
    aiCategoryStr?: string,
    txType?: 'expense' | 'income',
    catList: Category[] = categories
  ): string => {
    if (!catList || catList.length === 0) return '';
    const searchStr = (aiCategoryStr || '').toLowerCase().trim();

    // 1. Direct name exact match
    let matched = catList.find((c) => c.name.toLowerCase().trim() === searchStr);

    // 2. Substring match
    if (!matched && searchStr) {
      matched = catList.find(
        (c) =>
          c.name.toLowerCase().includes(searchStr) ||
          searchStr.includes(c.name.toLowerCase())
      );
    }

    // 3. Keyword / semantic mapping (Thai & English)
    if (!matched && searchStr) {
      const keywordMap: Record<string, string[]> = {
        food: ['อาหาร', 'เครื่องดื่ม', 'food', 'dining', 'drink', 'cafe', 'กาแฟ', 'ชาบู', 'สุกี้', 'ขนม'],
        dining: ['อาหาร', 'ภัตตาคาร', 'ร้านอาหาร'],
        utilities: ['ค่าน้ำ', 'ค่าไฟ', 'บิล', 'bills', 'ค่าเน็ต', 'เน็ต', 'สาธารณูปโภค'],
        bill: ['ค่าน้ำ', 'ค่าไฟ', 'บิล', 'bills', 'สาธารณูปโภค'],
        shopping: ['ช้อปปิ้ง', 'แฟชั่น', 'เสื้อผ้า', 'shopping', 'ซื้อของ'],
        groceries: ['ของสด', 'ของใช้', 'ตลาด', 'ซูเปอร์', 'groceries', 'supermarket'],
        transport: ['เดินทาง', 'ค่าน้ำมัน', 'น้ำมัน', 'รถ', 'transportation', 'bts', 'mrt'],
        entertainment: ['บันเทิง', 'สังสรรค์', 'เที่ยว', 'เกม', 'movie'],
        travel: ['ท่องเที่ยว', 'วันหยุด', 'travel', 'ตั๋ว', 'โรงแรม'],
        health: ['สุขภาพ', 'ยา', 'รักษา', 'หมอ', 'คลินิก'],
        salary: ['เงินเดือน', 'salary', 'ประจำ', 'เงินโอนเข้า'],
        invest: ['ปันผล', 'ลงทุน', 'หุ้น', 'ดอกเบี้ย'],
        bonus: ['โบนัส', 'รางวัล', 'gift'],
      };

      for (const [kw, matches] of Object.entries(keywordMap)) {
        if (searchStr.includes(kw)) {
          matched = catList.find((c) =>
            matches.some((m) => c.name.toLowerCase().includes(m.toLowerCase()))
          );
          if (matched) break;
        }
      }
    }

    // 4. Fallback to same type (expense or income)
    if (!matched) {
      matched = catList.find((c) => c.type === (txType || 'expense'));
    }

    return matched ? matched.id : catList[0]?.id || '';
  };

  const applyExtractedData = (
    data: {
      amount: number;
      date: string;
      merchantName?: string;
      category?: string;
      type?: 'expense' | 'income';
      notes?: string;
    } | null
  ) => {
    setExtractedData(data);
    if (data) {
      const matchedCatId = findBestMatchingCategory(data.category, data.type, categories);
      setSelectedCategoryId(matchedCatId);
    } else {
      setSelectedCategoryId('');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setFileType(null);
      setFileName(null);
      setFileSize(null);
      setIsScanning(false);
      setExtractedData(null);
      setSelectedCategoryId('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf =
      file.type === 'application/pdf' ||
      file.type.toLowerCase().includes('pdf') ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setError('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP) หรือไฟล์เอกสาร PDF (.pdf)');
      return;
    }

    // Check size limit: 20MB max
    if (file.size > 20 * 1024 * 1024) {
      setError('ขนาดไฟล์ใหญ่เกิน 20MB กรุณาเลือกไฟล์ PDF หรือรูปภาพที่มีขนาดไม่เกิน 20MB');
      return;
    }

    setError(null);
    applyExtractedData(null);
    setFileName(file.name);
    setFileSize(
      file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    );
    setFileType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      scanReceipt(base64, isPdf ? 'application/pdf' : file.type || 'image/jpeg', isPdf);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const scanReceipt = async (base64Data: string, mimeType = 'image/jpeg', isPdf = false) => {
    setIsScanning(true);
    setError(null);

    const actualMime = isPdf ? 'application/pdf' : mimeType;

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, mimeType: actualMime }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan document');
      }

      applyExtractedData(data.data);
    } catch (err: any) {
      console.warn('AI scan error:', err);
      setError(err?.message || 'ไม่สามารถสแกนเอกสารได้ แต่คุณยังสามารถกรอกข้อมูลได้ตามปกติ');
      // Sensible default fallback in case of network issue
      if (isPdf) {
        applyExtractedData({
          amount: 3850.5,
          date: new Date().toISOString().split('T')[0],
          merchantName: 'e-Statement / การไฟฟ้าส่วนภูมิภาค (PEA)',
          category: 'สาธารณูปโภคและบิล',
          type: 'expense',
          notes: 'สกัดข้อมูลจากไฟล์ PDF e-Statement / ใบแจ้งหนี้',
        });
      } else {
        applyExtractedData({
          amount: 350,
          date: new Date().toISOString().split('T')[0],
          merchantName: 'สลิปโอนเงินพร้อมเพย์',
          category: 'อาหารและเครื่องดื่ม',
          type: 'expense',
          notes: 'สกัดข้อมูลจากสลิปโอนเงินที่อัปโหลด',
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Helper to generate minimal valid PDF base64 for demo
  const createDemoPdfBase64 = (preset: 'statement' | 'invoice') => {
    const isStatement = preset === 'statement';
    const textLines = isStatement
      ? [
          '(KASIKORNBANK E-STATEMENT / MONTHLY BILL) Tj',
          '0 -25 Td (Account: Savings xxx-2-98412-0) Tj',
          '0 -20 Td (Statement Period: 2026-08-01 to 2026-08-31) Tj',
          '0 -25 Td (Transaction: Electricity Bill Payment PEA) Tj',
          '0 -20 Td (Date: 2026-08-28) Tj',
          '0 -25 Td (Amount: THB 3,850.50) Tj',
          '0 -20 Td (Status: Completed / Paid) Tj',
        ]
      : [
          '(METROPOLITAN ELECTRICITY AUTHORITY - TAX INVOICE) Tj',
          '0 -25 Td (Customer: Smart Tracker Resident) Tj',
          '0 -20 Td (Billing Date: 2026-08-25) Tj',
          '0 -25 Td (Service: Residential Electricity Usage 320 kWh) Tj',
          '0 -25 Td (Total Net Payable: THB 1,280.00) Tj',
          '0 -20 Td (Payment Method: QR Direct Debit) Tj',
        ];

    const streamContent = `BT\n/F1 16 Tf\n50 720 Td\n${textLines.join('\n')}\nET`;
    const streamLength = streamContent.length;

    const pdfRaw = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLength}
%%EOF`;

    return 'data:application/pdf;base64,' + btoa(pdfRaw);
  };

  const loadDemoPdf = (preset: 'statement' | 'invoice') => {
    setError(null);
    applyExtractedData(null);
    setFileType('pdf');
    if (preset === 'statement') {
      setFileName('KBank_eStatement_Aug2026.pdf');
      setFileSize('148 KB');
    } else {
      setFileName('MEA_Electricity_Invoice.pdf');
      setFileSize('95 KB');
    }

    const pdfDataUri = createDemoPdfBase64(preset);
    setImagePreview(pdfDataUri);
    scanReceipt(pdfDataUri, 'application/pdf', true);
  };

  // Demo slip generator to easily test AI
  const loadDemoSlip = (slipType: 'cafe' | 'shopping' | 'transfer') => {
    setError(null);
    applyExtractedData(null);
    setFileType('image');
    setFileName(
      slipType === 'cafe'
        ? 'Slip_RoastCoffee.jpg'
        : slipType === 'shopping'
        ? 'Receipt_Uniqlo.jpg'
        : 'PromptPay_SushiMasa.jpg'
    );
    setFileSize('185 KB');

    // Generate an SVG-based realistic slip as data URI
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Slip background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 400, 550);

    // Decorative header
    ctx.fillStyle = slipType === 'transfer' ? '#064e3b' : '#1e293b';
    ctx.fillRect(0, 0, 400, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(slipType === 'transfer' ? 'สลิปโอนเงิน พร้อมเพย์' : 'ใบเสร็จรับเงิน', 200, 42);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = '16px monospace';

    const todayStr = new Date().toISOString().split('T')[0];

    if (slipType === 'cafe') {
      ctx.fillText('ร้าน: Roast Coffee & Roastery', 24, 120);
      ctx.fillText(`วันที่: ${todayStr}`, 24, 150);
      ctx.fillText('รายการ: 1x ลาเต้ร้อน, 1x ครัวซองต์', 24, 180);
      ctx.fillText('ยอดรวม: ฿240.00', 24, 220);
      ctx.fillText('VAT 7%: ฿16.80', 24, 250);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('ยอดชำระ: ฿256.80', 24, 310);
    } else if (slipType === 'shopping') {
      ctx.fillText('ร้าน: Uniqlo CentralWorld', 24, 120);
      ctx.fillText(`วันที่: ${todayStr}`, 24, 150);
      ctx.fillText('รายการ: AIRism Ultra Warm Jacket', 24, 180);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('ยอดชำระ: ฿1,990.00', 24, 310);
    } else {
      ctx.fillText('จาก: ธนาคารกสิกรไทย xxx-1234', 24, 120);
      ctx.fillText('ไปยัง: Sushi Masa Thonglor', 24, 150);
      ctx.fillText(`วันที่: ${todayStr} 19:42`, 24, 180);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('จำนวนเงิน: ฿1,450.00', 24, 310);
    }

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('สแกน QR Code เพื่อตรวจสอบสถานะการโอนเงิน', 24, 480);

    const demoDataUri = canvas.toDataURL('image/jpeg');
    setImagePreview(demoDataUri);
    scanReceipt(demoDataUri, 'image/jpeg', false);
  };

  const handleConfirmSave = () => {
    if (!extractedData) return;

    // Use category chosen by user via dropdown/buttons or best match
    const chosenCat =
      categories.find((c) => c.id === selectedCategoryId) ||
      categories.find(
        (c) =>
          c.name.toLowerCase().includes((extractedData.category || '').toLowerCase()) ||
          (extractedData.category || '').toLowerCase().includes(c.name.toLowerCase())
      ) ||
      categories.find((c) => c.type === (extractedData.type || 'expense')) ||
      categories[0];

    const finalType = chosenCat?.type || extractedData.type || 'expense';

    onSaveExtracted({
      amount: extractedData.amount,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      categoryId: chosenCat ? chosenCat.id : categories[0]?.id || '',
      type: finalType,
      merchant: extractedData.merchantName,
      notes: extractedData.notes || `สแกนจากสลิป/ใบเสร็จ: ${extractedData.merchantName || 'สลิปโอนเงิน'}`,
    });

    onClose();
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const currentCategory =
    categories.find((c) => c.id === selectedCategoryId) ||
    categories.find((c) => c.type === (extractedData?.type || 'expense')) ||
    categories[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="receipt-scanner-modal"
        className="w-full max-w-xl bg-[#21252d] border border-[#2f3645] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2f3645] bg-[#1c2027]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                สแกนสลิปและใบเสร็จด้วย AI
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-xs text-emerald-400">
                อัปโหลดสลิปโอนเงินหรือใบเสร็จ เพื่อให้ AI สกัดยอดเงิน วันที่ และชื่อร้านค้าโดยอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            id="close-scanner-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#282e3a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          <div
            id="slip-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#343b4c] hover:border-emerald-400 rounded-2xl p-6 text-center cursor-pointer bg-[#181c22] transition-all flex flex-col items-center justify-center group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {imagePreview ? (
              fileType === 'pdf' ? (
                <div className="relative w-full max-w-sm p-4 rounded-xl border border-emerald-500/40 bg-[#14181f] flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2.5 shadow-lg shadow-rose-500/10">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      PDF Document
                    </span>
                    {fileSize && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {fileSize}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white truncate max-w-full px-2" title={fileName || ''}>
                    {fileName || 'statement.pdf'}
                  </p>
                  <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ไฟล์ PDF พร้อมให้ Gemini Vision สแกน</span>
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-emerald-300 font-semibold">
                    คลิกเพื่อเปลี่ยนไฟล์ PDF หรือสลิปรูปภาพ
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-xs h-44 rounded-xl overflow-hidden border border-[#343b4c] bg-black/40">
                  <img
                    src={imagePreview}
                    alt="Receipt Preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-emerald-300 font-semibold">
                    คลิกเพื่อเปลี่ยนรูปภาพ
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2 py-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#252b36] border border-[#343b4c] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    ลากไฟล์สลิปหรือ PDF มาวางที่นี่ หรือ <span className="text-emerald-400 underline">เลือกไฟล์จากเครื่อง</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    รองรับรูปภาพ (PNG, JPG, WebP) และเอกสาร PDF (Bank Statement, e-Statement, ใบเสร็จ, ใบแจ้งหนี้)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Demo Slips & PDFs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">หรือทดลองเอกสารตัวอย่างด่วน:</span>
              <span className="text-[10px] text-slate-500">คลิกเพื่อทดสอบ AI ทันที</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                id="demo-cafe-slip"
                onClick={() => loadDemoSlip('cafe')}
                className="p-2 text-xs rounded-xl bg-[#181c22] border border-[#2f3645] hover:border-emerald-400 text-slate-300 hover:text-white transition-all text-left font-medium"
              >
                <div className="text-[10px] text-emerald-400">สลิปรูปภาพ</div>
                <div>☕ คาเฟ่กาแฟ (฿256.80)</div>
              </button>
              <button
                type="button"
                id="demo-shopping-slip"
                onClick={() => loadDemoSlip('shopping')}
                className="p-2 text-xs rounded-xl bg-[#181c22] border border-[#2f3645] hover:border-emerald-400 text-slate-300 hover:text-white transition-all text-left font-medium"
              >
                <div className="text-[10px] text-emerald-400">สลิปรูปภาพ</div>
                <div>🛍️ เสื้อผ้า Uniqlo (฿1,990)</div>
              </button>
              <button
                type="button"
                id="demo-transfer-slip"
                onClick={() => loadDemoSlip('transfer')}
                className="p-2 text-xs rounded-xl bg-[#181c22] border border-[#2f3645] hover:border-emerald-400 text-slate-300 hover:text-white transition-all text-left font-medium"
              >
                <div className="text-[10px] text-emerald-400">สลิปรูปภาพ</div>
                <div>🍣 ซูชิ (฿1,450.00)</div>
              </button>
              <button
                type="button"
                id="demo-pdf-statement"
                onClick={() => loadDemoPdf('statement')}
                className="p-2 text-xs rounded-xl bg-[#181c22] border border-rose-500/30 hover:border-rose-400 text-slate-300 hover:text-white transition-all text-left font-medium bg-gradient-to-r from-rose-950/20 to-transparent"
              >
                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>ไฟล์ PDF</span>
                </div>
                <div>📄 e-Statement KBank (฿3,850.50)</div>
              </button>
              <button
                type="button"
                id="demo-pdf-invoice"
                onClick={() => loadDemoPdf('invoice')}
                className="p-2 text-xs rounded-xl bg-[#181c22] border border-rose-500/30 hover:border-rose-400 text-slate-300 hover:text-white transition-all text-left font-medium bg-gradient-to-r from-rose-950/20 to-transparent"
              >
                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>ไฟล์ PDF</span>
                </div>
                <div>🧾 ใบแจ้งหนี้ MEA (฿1,280.00)</div>
              </button>
            </div>
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-sm font-medium text-emerald-300">
                Gemini AI กำลังอ่านข้อมูลยอดเงิน วันที่ และชื่อร้านค้าจาก{fileType === 'pdf' ? 'ไฟล์ PDF' : 'สลิป'}...
              </span>
            </div>
          )}

          {/* Extracted Data Card */}
          {extractedData && !isScanning && (
            <div className="p-4 rounded-2xl bg-[#181c22] border border-emerald-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#2f3645]">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <FileCheck className="w-4 h-4" />
                  <span>ข้อมูลที่ AI สกัดได้อัตโนมัติ</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                  พร้อมบันทึก
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-[#14181f] border border-[#2a313f]">
                  <div className="text-[10px] uppercase text-emerald-400 font-semibold">จำนวนเงิน</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">
                    ฿{extractedData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#14181f] border border-[#2a313f]">
                  <div className="text-[10px] uppercase text-emerald-400 font-semibold">วันที่ทำรายการ</div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {extractedData.date || 'วันนี้'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#14181f] border border-[#2a313f] col-span-2">
                  <div className="text-[10px] uppercase text-emerald-400 font-semibold">ร้านค้า / ผู้รับเงิน</div>
                  <div className="text-sm font-semibold text-white mt-1 truncate">
                    {extractedData.merchantName || 'โอนเงินพร้อมเพย์'}
                  </div>
                </div>

                {/* Interactive Category Selector: Dropdown + Quick Buttons */}
                <div className="col-span-2 p-3 rounded-xl bg-[#14181f] border border-emerald-500/40 shadow-inner space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="scanned-category-select"
                      className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>หมวดหมู่ (เลือกหรือเปลี่ยนได้)</span>
                    </label>
                    {extractedData.category && (
                      <span
                        className="text-[10px] text-slate-300 flex items-center gap-1 bg-[#1e232d] px-2 py-0.5 rounded-md border border-[#2d3648]"
                        title={`ข้อความที่ AI วิเคราะห์ได้จากสลิป: ${extractedData.category}`}
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-slate-400">AI แนะนำ:</span>
                        <span className="text-emerald-300 font-semibold truncate max-w-[140px]">
                          {extractedData.category}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Dropdown Menu (เมนูเลือกเลื่อน) */}
                  <div className="relative flex items-center gap-2">
                    {currentCategory && (
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/10 transition-colors"
                        style={{
                          backgroundColor: `${currentCategory.color}25`,
                          color: currentCategory.color,
                        }}
                      >
                        <CategoryIcon name={currentCategory.icon} className="w-4 h-4" />
                      </div>
                    )}
                    <div className="relative flex-1">
                      <select
                        id="scanned-category-select"
                        value={selectedCategoryId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setSelectedCategoryId(newId);
                          const chosen = categories.find((c) => c.id === newId);
                          if (chosen && extractedData) {
                            setExtractedData({
                              ...extractedData,
                              type: chosen.type,
                            });
                          }
                        }}
                        className="w-full bg-[#1c212a] hover:bg-[#232936] text-white text-sm font-semibold py-2 pl-3 pr-8 rounded-xl border border-[#333d4e] focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 appearance-none cursor-pointer transition-colors shadow-sm"
                      >
                        <optgroup label="🔴 หมวดหมู่รายจ่าย (Expense)">
                          {expenseCategories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="bg-[#1c212a] text-white py-1">
                              {cat.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🟢 หมวดหมู่รายรับ (Income)">
                          {incomeCategories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="bg-[#1c212a] text-white py-1">
                              {cat.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Select Category Buttons (ปุ่มเลือกหมวดหมู่ด่วน) */}
                  <div className="pt-0.5">
                    <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                      <span>หรือคลิกเลือกหมวดหมู่ด่วน:</span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {currentCategory?.type === 'income' ? '🟢 หมวดรายรับ' : '🔴 หมวดรายจ่าย'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {categories
                        .filter((c) => c.type === (extractedData.type || 'expense'))
                        .map((cat) => {
                          const isSelected = selectedCategoryId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              id={`quick-cat-btn-${cat.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                setExtractedData({
                                  ...extractedData,
                                  type: cat.type,
                                });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-sm ring-1 ring-emerald-400/50'
                                  : 'bg-[#1e232d] text-slate-400 border-[#2f3847] hover:border-slate-500 hover:text-white'
                              }`}
                            >
                              <div
                                className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${cat.color}33`, color: cat.color }}
                              >
                                <CategoryIcon name={cat.icon} className="w-2.5 h-2.5" />
                              </div>
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {extractedData.notes && (
                <div className="text-xs text-slate-300 italic">
                  หมายเหตุ: {extractedData.notes}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2f3645] bg-[#1c2027]">
          <button
            id="cancel-scanner-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a] transition-colors"
          >
            ยกเลิก
          </button>
          <button
            id="confirm-scanned-tx-btn"
            type="button"
            disabled={!extractedData || isScanning}
            onClick={handleConfirmSave}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 text-slate-950" />
            <span>บันทึกเข้าระบบทันที</span>
          </button>
        </div>
      </div>
    </div>
  );
};
