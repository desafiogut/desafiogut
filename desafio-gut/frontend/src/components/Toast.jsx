import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast — Sistema de notificações com ETA para transações on-chain
 * Variantes: success | error | warning | info | loading
 * ETA auto-calcula tempo restante (visível por 5-8s ou até confirmação)
 */

const toastStateMap = {
  loading: {
    icon: '⏳',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    text: 'text-blue-300',
    pulse: true,
  },
  info: {
    icon: 'ℹ️',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/25',
    text: 'text-sky-300',
    pulse: false,
  },
  success: {
    icon: '✅',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    text: 'text-green-300',
    pulse: false,
  },
  error: {
    icon: '❌',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    text: 'text-red-300',
    pulse: false,
  },
  warning: {
    icon: '⚠️',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    text: 'text-orange-300',
    pulse: false,
  },
};

export default function Toast({ id, variant = 'info', message, eta = null, onDismiss }) {
  const [remainingTime, setRemainingTime] = useState(eta);
  const config = toastStateMap[variant] || toastStateMap.info;

  useEffect(() => {
    if (!eta) return;
    
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [eta]);

  useEffect(() => {
    const duration = variant === 'loading' ? 20000 : (eta ? (eta + 2) * 1000 : 4000);
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [variant, eta, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[100]
        flex items-center gap-3 px-4 py-3 rounded-lg
        border backdrop-blur-md
        ${config.bg} ${config.border} ${config.text}
        max-w-sm mx-auto
      `}
      style={{
        animation: config.pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
      }}
    >
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1 text-sm font-medium">
        {message}
        {eta !== null && (
          <div className="text-xs opacity-80 mt-1">
            Confirmando em ~{remainingTime}s...
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </motion.div>
  );
}

/**
 * Toast Container — Gerencia múltiplos toasts simultaneamente
 */
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast, idx) => (
          <div key={toast.id} style={{ pointerEvents: 'auto', marginTop: idx > 0 ? '8px' : '0' }}>
            <Toast
              {...toast}
              onDismiss={() => onDismiss(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * useToast — Hook para gerenciar toasts na aplicação
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const add = (message, variant = 'info', eta = null) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant, eta }]);
    return id;
  };

  const remove = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, add, remove };
}