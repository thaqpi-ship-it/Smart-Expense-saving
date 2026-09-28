import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  id?: string;
  value: string; // Format: "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showShortcuts?: boolean;
  allowClear?: boolean;
}

const MONTHS_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'เลือกวันที่ (YYYY-MM-DD)',
  className = '',
  required = false,
  disabled = false,
  showShortcuts = true,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month from value or today
  const today = new Date();
  const initialDate = value ? new Date(value + 'T00:00:00') : today;
  const validInitial = !isNaN(initialDate.getTime());

  const [viewYear, setViewYear] = useState<number>(
    validInitial ? initialDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    validInitial ? initialDate.getMonth() : today.getMonth()
  );

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selected = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(selected);
    setIsOpen(false);
  };

  const setShortcut = (offsetDays: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const str = `${y}-${m}-${day}`;
    onChange(str);
    setViewYear(y);
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      });
    }

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateKey = `${viewYear}-${mStr}-${dStr}`;
      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isSelected: value === dateKey,
        isToday: dateKey === todayStr,
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: i,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false,
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();

  // Format display text
  const displayFormatted = () => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
        return `${d} ${MONTHS_TH[m]} ${y} (${value})`;
      }
    }
    return value;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container */}
      <div
        className={`relative flex items-center cursor-pointer select-none transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
      >
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none flex items-center justify-center">
          <CalendarIcon className="w-4 h-4" />
        </div>

        <input
          id={id}
          type="text"
          readOnly
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={displayFormatted()}
          className={`w-full pl-10 pr-9 py-2.5 bg-[#14181f] border rounded-xl text-xs sm:text-sm text-white focus:outline-none transition-all cursor-pointer ${
            isOpen ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-[#2f3645] hover:border-[#424c61]'
          } ${className}`}
        />

        {allowClear && value && !disabled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md"
            title="ล้างค่าวันที่"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#1c222c] border border-[#2b3341]">
            ปฏิทิน
          </div>
        )}
      </div>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-72 sm:w-80 bg-[#1c212a] border border-[#2f3747] rounded-2xl shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between pb-3 border-b border-[#2b3341] mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#28303f] transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-[#14181f] border border-[#2b3341] text-xs font-semibold text-emerald-300 rounded-lg px-2 py-1 focus:outline-none cursor-pointer hover:border-emerald-400"
              >
                {MONTHS_TH.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-[#14181f] border border-[#2b3341] text-xs font-semibold text-white rounded-lg px-2 py-1 focus:outline-none cursor-pointer hover:border-emerald-400"
              >
                {Array.from({ length: 15 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>
                    {y} (พ.ศ. {y + 543})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#28303f] transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          {showShortcuts && (
            <div className="flex items-center justify-between gap-1.5 mb-3 pb-2.5 border-b border-[#2b3341]">
              <button
                type="button"
                onClick={(e) => setShortcut(0, e)}
                className="flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg bg-[#242b37] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 border border-[#2f3849] transition-all text-center"
              >
                วันนี้ (Today)
              </button>
              <button
                type="button"
                onClick={(e) => setShortcut(-1, e)}
                className="flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg bg-[#242b37] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-200 border border-[#2f3849] transition-all text-center"
              >
                เมื่อวาน (Yesterday)
              </button>
            </div>
          )}

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS_TH.map((w, idx) => (
              <div
                key={w}
                className={`text-[11px] font-bold py-1 ${
                  idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              let cellClasses =
                'w-full aspect-square flex items-center justify-center text-xs rounded-xl font-medium transition-all ';

              if (item.isSelected) {
                cellClasses +=
                  'bg-emerald-400 text-slate-950 font-extrabold shadow-md shadow-emerald-400/30 scale-105';
              } else if (item.isToday) {
                cellClasses +=
                  'bg-emerald-950/60 text-emerald-300 border border-emerald-500/60 font-bold hover:bg-emerald-500 hover:text-slate-950';
              } else if (item.isCurrentMonth) {
                cellClasses += 'text-white hover:bg-[#293242] hover:text-emerald-300 cursor-pointer';
              } else {
                cellClasses += 'text-slate-600 hover:bg-[#202633] cursor-pointer';
              }

              return (
                <button
                  key={`${item.year}-${item.month}-${item.day}-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectDay(item.year, item.month, item.day);
                  }}
                  className={cellClasses}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Current selected display footer */}
          <div className="mt-3 pt-2 border-t border-[#2b3341] flex items-center justify-between text-[11px] text-slate-400">
            <span>เลือก: {value ? value : 'ยังไม่ได้เลือก'}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-emerald-400 hover:underline font-semibold"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
