import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Target,
  Tags,
  FileSpreadsheet,
  PlusCircle,
  Camera,
  Mic,
  Shield,
  RotateCcw,
  Menu,
  Sliders,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  onOpenRuleSettings?: () => void;
  onResetData: () => void;
  currentNetBalance: number;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickAdd,
  onOpenScanner,
  onOpenVoice,
  onOpenRuleSettings,
  onResetData,
  currentNetBalance,
  onToggleSidebar,
}) => {
  const navTabs = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'transactions', label: 'รายการบันทึก', icon: Receipt },
    { id: 'budget', label: 'งบประมาณรายเดือน', icon: Wallet },
    { id: 'goals', label: 'กระปุกออมเงิน', icon: Target },
    { id: 'categories', label: 'หมวดหมู่', icon: Tags },
    { id: 'reports', label: 'รายงาน & ส่งออก', icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1c2027]/95 backdrop-blur-md border-b border-[#2d3444]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Logo & Brand & Mobile Sidebar Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {onToggleSidebar && (
              <button
                id="navbar-sidebar-toggle-btn"
                onClick={onToggleSidebar}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#28303e] border border-[#2f3849] transition-colors"
                title="เปิด/ปิด แถบเมนูด้านข้าง"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 p-0.5 shadow-lg shadow-emerald-950/50">
              <div className="w-full h-full bg-[#1c212a] rounded-[14px] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Smart Expense & Saving Tracker</span>
                <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  AI Pro
                </span>
              </h1>
              <div className="text-[11px] font-medium flex items-center gap-2">
                <span className="text-emerald-400 font-bold">
                  ยอดสุทธิ: ฿{currentNetBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">ธีม Dark Gray & Mint Green</span>
              </div>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#13161c] p-1 rounded-2xl border border-[#2a303e]">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-[#252c3a] text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#202634]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Customizable Rule Settings Button */}
            {onOpenRuleSettings && (
              <button
                id="nav-rule-settings-btn"
                onClick={onOpenRuleSettings}
                className="p-2 sm:px-3 sm:py-2 bg-[#212631] hover:bg-[#282f3d] border border-[#343d4e] text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="ตั้งค่าเกณฑ์ออม & กฎทองทางการเงิน (Customizable Financial Rule)"
              >
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span className="hidden xl:inline">เกณฑ์ออม</span>
              </button>
            )}

            {/* AI Slip Scanner */}
            <button
              id="nav-scanner-btn"
              onClick={onOpenScanner}
              className="p-2 sm:px-3 sm:py-2 bg-[#212631] hover:bg-[#282f3d] border border-[#343d4e] text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="อัปโหลดสแกนสลิปโอนเงินด้วย AI"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">สแกนสลิป AI</span>
            </button>

            {/* AI Voice Input */}
            <button
              id="nav-voice-btn"
              onClick={onOpenVoice}
              className="p-2 sm:px-3 sm:py-2 bg-[#212631] hover:bg-[#282f3d] border border-[#343d4e] text-teal-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="สั่งบันทึกด้วยเสียงหรือพิมพ์ภาษาธรรมชาติ"
            >
              <Mic className="w-4 h-4 text-teal-300" />
              <span className="hidden sm:inline">สั่งด้วยเสียง AI</span>
            </button>

            {/* 3-Second Add Button */}
            <button
              id="nav-add-btn"
              onClick={onOpenQuickAdd}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ บันทึกด่วน (3 วิ)</span>
            </button>

            {/* Reset sample data */}
            <button
              onClick={onResetData}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-[#252b38] transition-colors"
              title="รีเซ็ตข้อมูลตัวอย่าง"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2.5 gap-1.5 border-t border-[#2d3444] no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#252c3a] text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white bg-[#13161c]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
