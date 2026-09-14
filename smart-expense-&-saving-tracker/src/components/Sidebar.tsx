import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Tags,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  X,
  Sliders,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickAdd?: () => void;
  onOpenScanner?: () => void;
  onOpenVoice?: () => void;
  onOpenRuleSettings?: () => void;
  onResetData: () => void;
  currentNetBalance: number;
  totalSavings: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenRuleSettings,
  onResetData,
  currentNetBalance,
  totalSavings,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'แดชบอร์ดภาพรวม',
      subtitle: 'Analytics & Trends',
      icon: LayoutDashboard,
      badge: 'Interactive',
    },
    {
      id: 'transactions',
      label: 'รายการบันทึก',
      subtitle: 'All Transactions',
      icon: Receipt,
    },
    {
      id: 'budget',
      label: 'งบประมาณรายเดือน',
      subtitle: 'Monthly Budget',
      icon: Wallet,
    },
    {
      id: 'goals',
      label: 'กระปุกออมเงิน & กองทุน',
      subtitle: 'Savings & Wealth',
      icon: Target,
      highlight: true,
    },
    {
      id: 'categories',
      label: 'หมวดหมู่ & จัดการ',
      subtitle: 'Categories',
      icon: Tags,
    },
    {
      id: 'reports',
      label: 'รายงาน & ส่งออก',
      subtitle: 'PDF & Excel Export',
      icon: FileSpreadsheet,
    },
  ];

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#181c22] border-r border-[#2a303d] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#2a303d] flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-300 p-0.5 shadow-lg shadow-emerald-950/60 shrink-0">
            <div className="w-full h-full bg-[#161a20] rounded-[14px] flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white tracking-tight truncate">
                  Smart Tracker
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase shrink-0">
                  AI Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Expense & Wealth Suite
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            id="mobile-sidebar-close"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#252c38] transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop collapse toggle */}
        <button
          id="desktop-sidebar-toggle"
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#252c38] transition-colors"
          title={isCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Account Snapshot Card */}
      {(!isCollapsed || isMobileOpen) && (
        <div className="p-3 mx-3 mt-3 rounded-2xl bg-gradient-to-br from-[#1f2530] to-[#161a22] border border-[#2f3847] shadow-inner">
          <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold mb-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ยอดคงเหลือในบัญชี
            </span>
            <span className="text-[9px] text-emerald-400 font-mono">Statement</span>
          </div>
          <div className="text-lg font-black text-white font-mono tracking-tight">
            ฿{currentNetBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 pt-2 border-t border-[#2a3240] flex items-center justify-between text-[11px]">
            <span className="text-slate-300">เงินออม & ลงทุนสะสม:</span>
            <span className="font-bold text-cyan-400 font-mono">
              ฿{totalSavings.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          {(!isCollapsed || isMobileOpen) ? 'เมนูหลัก (Navigation)' : '•••'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full text-left rounded-xl transition-all flex items-center gap-3 p-2.5 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-950/70 to-teal-950/40 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#222834]'
              }`}
              title={item.label}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-[#202632] text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {(!isCollapsed || isMobileOpen) && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold truncate flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info & Reset */}
      <div className="p-3 border-t border-[#2a303d] space-y-2">
        {onOpenRuleSettings && (
          <button
            id="sidebar-rule-settings-btn"
            onClick={onOpenRuleSettings}
            className="w-full py-2 px-2.5 bg-[#1f2735] hover:bg-[#273245] border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            title="ตั้งค่าเกณฑ์เป้าหมายเงินออม & กฎทอง (Customizable Financial Rule)"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>ตั้งค่าเกณฑ์ออม</span>}
          </button>
        )}

        {(!isCollapsed || isMobileOpen) && (
          <div className="px-2 py-2 rounded-xl bg-[#14181f] border border-[#262c37] text-[10px] text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Dark-Green Luxury
            </span>
            <span className="font-mono text-emerald-400">v2.5</span>
          </div>
        )}

        <button
          id="sidebar-reset-btn"
          onClick={onResetData}
          className="w-full py-1.5 px-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          title="รีเซ็ตและโหลดข้อมูลตัวอย่างเริ่มต้น"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {(!isCollapsed || isMobileOpen) && <span>รีเซ็ตข้อมูลตัวอย่าง</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Persistent) */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar (Drawer Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
