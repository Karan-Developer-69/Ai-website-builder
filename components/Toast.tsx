
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, Loader2, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            layout
            className="pointer-events-auto min-w-[320px] max-w-md rounded-xl shadow-2xl backdrop-blur-xl border border-white/10 overflow-hidden mb-3 bg-obsidian-900/95"
          >
            <div className={`p-5 flex items-start gap-4 ${toast.type === 'success' ? 'bg-green-500/10 border-l-4 border-l-green-500' :
              toast.type === 'error' ? 'bg-red-500/10 border-l-4 border-l-red-500' :
                toast.type === 'loading' ? 'bg-cyan-500/10 border-l-4 border-l-cyan-500' :
                  'bg-gray-800/90 border-l-4 border-l-gray-500'
              }`}>

              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                {toast.type === 'loading' && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-gray-400" />}
              </div>

              {/* Content */}
              <div className="flex-1 mr-4">
                <h4 className={`text-sm font-bold ${toast.type === 'success' ? 'text-green-500' :
                  toast.type === 'error' ? 'text-red-500' :
                    toast.type === 'loading' ? 'text-cyan-400' : 'text-gray-200'
                  }`}>
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Progress Bar for Auto-dismiss (Visual only for now) */}
              {toast.type !== 'loading' && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${toast.type === 'success' ? 'bg-green-500' :
                    toast.type === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`}
                />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
