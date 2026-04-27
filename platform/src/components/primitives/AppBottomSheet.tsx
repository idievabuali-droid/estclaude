'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * AppBottomSheet — Layer 6.11.
 * Native <dialog> styled to slide from the bottom on mobile.
 * Used for filters, multi-select pickers, contact-flow on mobile.
 */
export function AppBottomSheet({ open, onClose, title, children, className }: AppBottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'fixed inset-x-0 bottom-0 m-0 max-h-[85vh] w-full max-w-none',
        'rounded-t-md border-t border-stone-200 bg-white p-0 shadow-md',
        'backdrop:bg-stone-900/40',
        className,
      )}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <span className="text-h3 font-semibold text-stone-900">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="inline-flex size-9 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
