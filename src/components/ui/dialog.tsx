'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
}

export function Dialog({ open, onClose, children, title, description }: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open && !mounted) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        open ? 'animate-fade-in' : 'opacity-0 pointer-events-none'
      )}
      onTransitionEnd={() => {
        if (!open) setMounted(false);
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={cn(
          'relative w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-lg animate-scale-in',
          'p-6'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <h2 className="text-lg font-semibold text-text-primary mb-1">{title}</h2>
        )}
        {description && (
          <p className="text-sm text-text-secondary mb-4">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
