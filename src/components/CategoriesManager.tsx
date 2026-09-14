import React, { useState } from 'react';
import {
  Tags,
  PlusCircle,
  Edit2,
  Trash2,
  Sparkles,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { Category, TransactionType } from '../types';
import { CategoryIcon, POPULAR_ICONS } from './CategoryIcon';

interface CategoriesManagerProps {
  categories: Category[];
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [icon, setIcon] = useState('Utensils');
  const [color, setColor] = useState('#10b981');
  const [isHappiness, setIsHappiness] = useState<boolean>(false);
  const [budgetMonthly, setBudgetMonthly] = useState<string>('0');

  const colorPalette = [
    '#10b981',
    '#059669',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#14b8a6',
    '#64748b',
  ];

  const openNewCategory = () => {
    setEditingCategory(null);
    setName('');
    setType(activeTab);
    setIcon(
      activeTab === 'expense'
        ? 'ShoppingBag'
        : activeTab === 'savings'
        ? 'PiggyBank'
        : 'Coins'
    );
    setColor(activeTab === 'savings' ? '#06b6d4' : '#10b981');
    setIsHappiness(false);
    setBudgetMonthly('0');
    setIsModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setIcon(cat.icon);
    setColor(cat.color);
    setIsHappiness(!!cat.isHappiness);
    setBudgetMonthly((cat.budgetMonthly || 0).toString());
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveCategory({
      id: editingCategory ? editingCategory.id : `cat-custom-${Date.now()}`,
      name: name.trim(),
      type,
      icon,
      color,
      isHappiness: type === 'expense' ? isHappiness : false,
      budgetMonthly: parseFloat(budgetMonthly) || 0,
    });

    setIsModalOpen(false);
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#21252d] border border-[#2f3645] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">จัดการหมวดหมู่และประเภท (Categories & Types)</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            สร้าง แก้ไข และจัดระเบียบหมวดหมู่รายรับและรายจ่าย พร้อมกำหนดไอคอน สีสัน และเพดานงบประมาณ
          </p>
        </div>

        <button
          id="add-category-btn"
          onClick={openNewCategory}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>+ เพิ่มหมวดหมู่ใหม่</span>
        </button>
      </div>

      {/* Tabs for Expense vs Income vs Savings categories */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-[#2f3645] pb-2 overflow-x-auto">
        <button
          id="tab-cat-expense"
          onClick={() => setActiveTab('expense')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'expense'
              ? 'bg-red-950/60 text-red-300 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🔴 หมวดหมู่รายจ่าย ({categories.filter((c) => c.type === 'expense').length})</span>
        </button>
        <button
          id="tab-cat-income"
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'income'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🟢 หมวดหมู่รายรับ ({categories.filter((c) => c.type === 'income').length})</span>
        </button>
        <button
          id="tab-cat-savings"
          onClick={() => setActiveTab('savings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'savings'
              ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🔵 หมวดหมู่เงินออม/ลงทุน ({categories.filter((c) => c.type === 'savings').length})</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="p-4 rounded-2xl bg-[#21252d] border border-[#2f3645] hover:border-[#3d4659] shadow-lg flex items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                style={{ backgroundColor: `${cat.color}33`, color: cat.color }}
              >
                <CategoryIcon name={cat.icon} className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{cat.name}</span>
                  {cat.isHappiness && (
                    <span className="text-[10px] text-amber-300 bg-amber-400/15 px-1.5 py-0.2 rounded-full border border-amber-400/20 flex items-center gap-0.5 font-medium">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" /> หมวดความสุข
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {cat.type === 'expense'
                    ? cat.budgetMonthly
                      ? `งบต่อเดือน: ฿${cat.budgetMonthly.toLocaleString()}/เดือน`
                      : 'ยังไม่ได้กำหนดงบ'
                    : cat.type === 'savings'
                    ? 'หมวดเงินออม/ลงทุน'
                    : 'แหล่งรายรับ'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id={`edit-cat-${cat.id}`}
                onClick={() => openEditCategory(cat)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#2e3544] transition-colors"
                title="แก้ไขหมวดหมู่"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                id={`delete-cat-${cat.id}`}
                onClick={() => onDeleteCategory(cat.id)}
                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                title="ลบหมวดหมู่"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#21252d] border border-[#2f3645] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingCategory ? 'แก้ไขหมวดหมู่' : 'สร้างหมวดหมู่ใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Type toggle */}
              <div>
                <label className="block font-semibold text-emerald-300 mb-1">ประเภทธุรกรรม</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2 px-2 rounded-xl font-bold transition-all text-center ${
                      type === 'expense'
                        ? 'bg-red-950/70 text-red-300 border border-red-500/40'
                        : 'bg-[#181c22] text-slate-400 border border-[#2f3645]'
                    }`}
                  >
                    🔴 รายจ่าย
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2 px-2 rounded-xl font-bold transition-all text-center ${
                      type === 'income'
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#181c22] text-slate-400 border border-[#2f3645]'
                    }`}
                  >
                    🟢 รายรับ
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('savings')}
                    className={`py-2 px-2 rounded-xl font-bold transition-all text-center ${
                      type === 'savings'
                        ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40'
                        : 'bg-[#181c22] text-slate-400 border border-[#2f3645]'
                    }`}
                  >
                    🔵 เงินออม/ลงทุน
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-semibold text-emerald-300 mb-1">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  placeholder="เช่น สัตว์เลี้ยง, เครื่องสำอาง, คอร์สเรียน, โบนัส"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-[#181c22] border border-[#2f3645] rounded-xl text-white focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Monthly Budget (if expense) */}
              {type === 'expense' && (
                <div>
                  <label className="block font-semibold text-emerald-300 mb-1">
                    เพดานงบประมาณต่อเดือน (฿)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 3000"
                    value={budgetMonthly}
                    onChange={(e) => setBudgetMonthly(e.target.value)}
                    className="w-full p-2.5 bg-[#181c22] border border-[#2f3645] rounded-xl text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              {/* Happiness toggle */}
              {type === 'expense' && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#181c22] border border-[#2f3645] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHappiness}
                    onChange={(e) => setIsHappiness(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2f3645] text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-white font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      หมวดความสุข / ไลฟ์สไตล์ (Happiness Category)
                    </span>
                    <span className="text-[10px] text-slate-300 block mt-0.5">
                      เปิดระบบแจ้งเตือนจุดรั่วไหลแบบเรียลไทม์เมื่อใช้จ่ายใกล้หรือเกินงบประมาณ
                    </span>
                  </div>
                </label>
              )}

              {/* Color accent */}
              <div>
                <label className="block font-semibold text-emerald-300 mb-1.5">สีประจำหมวดหมู่</label>
                <div className="flex items-center gap-2">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block font-semibold text-emerald-300 mb-1.5">ไอคอน</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-[#181c22] rounded-xl border border-[#2f3645]">
                  {POPULAR_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-lg transition-colors ${
                        icon === ic
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                          : 'text-slate-400 hover:text-white hover:bg-[#252b36]'
                      }`}
                    >
                      <CategoryIcon name={ic} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md"
                >
                  {editingCategory ? 'บันทึกการแก้ไข' : 'บันทึกหมวดหมู่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
