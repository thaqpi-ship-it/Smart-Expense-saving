import * as XLSX from 'xlsx';
import { Category, Transaction } from '../types';

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

function formatDateThai(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const month = monthNamesThai[parseInt(parts[1], 10) - 1] || parts[1];
  const day = parseInt(parts[2], 10);
  // Gregorian + Thai format
  return `${day} ${month} ${year}`;
}

export function exportToExcel(
  transactions: Transaction[],
  categoriesMap: Map<string, Category>,
  range: ReportDateRange
) {
  // Sort chronologically (oldest to newest)
  const sorted = [...transactions].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return diff !== 0 ? diff : a.createdAt - b.createdAt;
  });

  const formattedStart = formatDateThai(range.startDate);
  const formattedEnd = formatDateThai(range.endDate);

  // Prepare sheet data adhering strictly to:
  // Line 1: บริหารจัดการรับ-จ่าย (Bold, Font Size 18)
  // Line 2: ระหว่างวันที่ [Selected Start Date] ถึง [Selected End Date] (Font Size 16)
  // Line 3/Table: Table listing all transactions sorted chronologically, matching recorded headings (Font Size 14)
  const rows: (string | number)[][] = [
    ['บริหารจัดการรับ-จ่าย'],
    [`ระหว่างวันที่ ${formattedStart} ถึง ${formattedEnd}`],
    [], // empty spacer
    ['ลำดับ', 'วันที่', 'รายการ / ร้านค้า', 'หมวดหมู่', 'ประเภท', 'จำนวนเงิน (บาท)', 'หมายเหตุ'],
  ];

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;

  sorted.forEach((tx, idx) => {
    const cat = categoriesMap.get(tx.categoryId);
    const catName = cat ? cat.name : 'ทั่วไป';
    const typeLabel =
      tx.type === 'income'
        ? 'รายรับ'
        : tx.type === 'savings'
        ? 'เงินออม/ลงทุน'
        : 'รายจ่าย';
    
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'savings') {
      totalSavings += tx.amount;
    } else {
      totalExpense += tx.amount;
    }

    rows.push([
      idx + 1,
      tx.date,
      tx.merchant || '-',
      catName,
      typeLabel,
      tx.amount,
      tx.notes || '-',
    ]);
  });

  // Summary rows
  rows.push([]);
  rows.push(['สรุปภาพรวม']);
  rows.push(['รวมรายรับทั้งหมด', '', '', '', 'รายรับ', totalIncome]);
  rows.push(['รวมรายจ่ายทั้งหมด', '', '', '', 'รายจ่าย', totalExpense]);
  rows.push(['รวมเงินออม/ลงทุนทั้งหมด', '', '', '', 'เงินออม', totalSavings]);
  rows.push(['ยอดคงเหลือในบัญชี (Operating)', '', '', '', totalIncome >= (totalExpense + totalSavings) ? 'คงเหลือ' : 'ติดลบ', totalIncome - totalExpense - totalSavings]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // No
    { wch: 14 }, // Date
    { wch: 28 }, // Description / Merchant
    { wch: 22 }, // Category
    { wch: 12 }, // Type
    { wch: 18 }, // Amount
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานรับ-จ่าย');

  const fileName = `Smart_Tracker_Report_${range.startDate}_to_${range.endDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function printOrSavePDF(
  transactions: Transaction[],
  categoriesMap: Map<string, Category>,
  range: ReportDateRange
) {
  const sorted = [...transactions].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return diff !== 0 ? diff : a.createdAt - b.createdAt;
  });

  const formattedStart = formatDateThai(range.startDate);
  const formattedEnd = formatDateThai(range.endDate);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;

  const rowsHtml = sorted
    .map((tx, idx) => {
      const cat = categoriesMap.get(tx.categoryId);
      const catName = cat ? cat.name : 'ทั่วไป';
      const isIncome = tx.type === 'income';
      const isSavings = tx.type === 'savings';
      if (isIncome) totalIncome += tx.amount;
      else if (isSavings) totalSavings += tx.amount;
      else totalExpense += tx.amount;

      const typeColor = isIncome ? '#059669' : isSavings ? '#0284c7' : '#dc2626';
      const typeText = isIncome ? 'รายรับ' : isSavings ? 'เงินออม/ลงทุน' : 'รายจ่าย';
      const prefix = isIncome ? '+' : isSavings ? '→' : '-';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 14pt;">
          <td style="padding: 10px 12px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 500;">${tx.date}</td>
          <td style="padding: 10px 12px;"><strong>${tx.merchant || '-'}</strong></td>
          <td style="padding: 10px 12px;"><span style="display:inline-block; padding: 2px 8px; border-radius: 4px; background: #f1f5f9; font-size: 13pt;">${catName}</span></td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="font-weight: 600; color: ${typeColor};">
              ${typeText}
            </span>
          </td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; font-family: monospace; color: ${typeColor};">
            ${prefix}฿${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 10px 12px; color: #475569; font-size: 13pt;">${tx.notes || '-'}</td>
        </tr>
      `;
    })
    .join('');

  const netBalance = totalIncome - totalExpense - totalSavings;

  const printHtml = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <title>บริหารจัดการรับ-จ่าย</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
        @page {
          size: A4 portrait;
          margin: 18mm 15mm;
        }
        body {
          font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          background: #ffffff;
        }
        /* Exact specifications requested by user */
        .report-title {
          font-size: 18pt;
          font-weight: 700;
          text-align: center;
          margin: 0 0 8px 0;
          color: #064e3b;
        }
        .report-subtitle {
          font-size: 16pt;
          font-weight: 500;
          text-align: center;
          margin: 0 0 24px 0;
          color: #334155;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th {
          background-color: #f8fafc;
          border-top: 2px solid #064e3b;
          border-bottom: 2px solid #cbd5e1;
          padding: 12px 10px;
          font-size: 14pt;
          font-weight: 700;
          text-align: left;
          color: #0f172a;
        }
        td {
          font-size: 14pt;
        }
        .summary-card {
          margin-top: 28px;
          display: flex;
          justify-content: flex-end;
          gap: 16px;
        }
        .summary-box {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 18px;
          background: #f8fafc;
          min-width: 180px;
          text-align: right;
        }
        .summary-label {
          font-size: 13pt;
          color: #64748b;
          margin-bottom: 4px;
        }
        .summary-val {
          font-size: 16pt;
          font-weight: 700;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="report-title">บริหารจัดการรับ-จ่าย</div>
      <div class="report-subtitle">ระหว่างวันที่ ${formattedStart} ถึง ${formattedEnd}</div>

      <table>
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">ลำดับ</th>
            <th style="width: 13%;">วันที่</th>
            <th style="width: 25%;">รายการ / ร้านค้า</th>
            <th style="width: 18%;">หมวดหมู่</th>
            <th style="width: 10%; text-align: center;">ประเภท</th>
            <th style="width: 15%; text-align: right;">จำนวนเงิน</th>
            <th style="width: 14%;">บันทึก</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 24px; color:#94a3b8;">ไม่พบรายการในช่วงเวลาที่เลือก</td></tr>'}
        </tbody>
      </table>

      <div class="summary-card">
        <div class="summary-box">
          <div class="summary-label">รวมรายรับ</div>
          <div class="summary-val" style="color: #059669;">+฿${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">รวมรายจ่าย</div>
          <div class="summary-val" style="color: #dc2626;">-฿${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-box">
          <div class="summary-label">รวมเงินออม & ลงทุน</div>
          <div class="summary-val" style="color: #0284c7;">฿${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-box" style="border-color: #059669; background: #f0fdf4;">
          <div class="summary-label">ยอดคงเหลือในบัญชี</div>
          <div class="summary-val" style="color: ${netBalance >= 0 ? '#059669' : '#dc2626'};">
            ฿${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; font-size: 11pt; color: #94a3b8; text-align: right;">
        สร้างโดย Smart Expense & Saving Tracker • พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // Fallback: create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  }
}
