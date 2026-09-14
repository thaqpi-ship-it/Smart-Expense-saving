import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="delete-confirm-modal"
        className="w-full max-w-md bg-[#21252d] border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#282e3a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-300 mt-1">{message}</p>
          <div className="mt-2 text-xs text-amber-300 flex items-center gap-1.5 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>ยอดรวมในแดชบอร์ดจะคำนวณใหม่โดยอัตโนมัติทันที</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white rounded-xl hover:bg-[#282e3a] transition-colors"
          >
            ยกเลิก
          </button>
          <button
            id="confirm-delete-btn"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-950/60 transition-all active:scale-95"
          >
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>
  );
};
