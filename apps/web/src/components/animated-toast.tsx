'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface AnimatedToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    className: 'bg-green-500/10 border-green-500/50 text-green-500',
    iconClassName: 'text-green-500',
  },
  error: {
    icon: XCircle,
    className: 'bg-red-500/10 border-red-500/50 text-red-500',
    iconClassName: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    className: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500',
    iconClassName: 'text-yellow-500',
  },
  info: {
    icon: Info,
    className: 'bg-blue-500/10 border-blue-500/50 text-blue-500',
    iconClassName: 'text-blue-500',
  },
};

export function AnimatedToast({
  id,
  type,
  title,
  description,
  duration = 5000,
  onDismiss,
}: AnimatedToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm',
        'shadow-lg min-w-[320px] max-w-[420px]',
        config.className
      )}
    >
      {/* Progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-current origin-left opacity-30"
      />
      
      {/* Icon with animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
      >
        <Icon className={cn('h-5 w-5', config.iconClassName)} />
      </motion.div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{title}</p>
        {description && (
          <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onDismiss(id)}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/**
 * Toast container component
 */
interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface AnimatedToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function AnimatedToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: AnimatedToastContainerProps) {
  return (
    <div className={cn('fixed z-50 flex flex-col gap-2', positionClasses[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <AnimatedToast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to manage toasts
 */
export function useAnimatedToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = React.useCallback((title: string, description?: string) => {
    return addToast({ type: 'success', title, description });
  }, [addToast]);

  const error = React.useCallback((title: string, description?: string) => {
    return addToast({ type: 'error', title, description });
  }, [addToast]);

  const warning = React.useCallback((title: string, description?: string) => {
    return addToast({ type: 'warning', title, description });
  }, [addToast]);

  const info = React.useCallback((title: string, description?: string) => {
    return addToast({ type: 'info', title, description });
  }, [addToast]);

  return {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => (
      <AnimatedToastContainer toasts={toasts} onDismiss={dismissToast} />
    ),
  };
}
