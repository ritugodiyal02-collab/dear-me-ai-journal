import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start gap-3 text-xs ${
              toast.type === 'success'
                ? 'bg-white border-emerald-300 text-stone-800 ring-2 ring-emerald-500/10'
                : toast.type === 'error'
                ? 'bg-white border-rose-300 text-stone-800 ring-2 ring-rose-500/10'
                : 'bg-white border-stone-300 text-stone-800 ring-2 ring-stone-500/10'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}

            <div className="flex-1">
              <p className="font-semibold text-stone-900">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
