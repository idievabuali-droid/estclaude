'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Hides the close button — use only when the modal must be intentionally dismissed via an action. */
  hideClose?: boolean;
}

/**
 * AppModal — Layer 6.10.
 * Uses native <dialog> for accessibility (keyboard, focus trap, backdrop).
 */
export function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  hideClose,
}: AppModalProps) {
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
        'rounded-md border border-stone-200 bg-white p-0 shadow-md',
        'max-w-lg w-[calc(100%-2rem)]',
        'backdrop:bg-stone-900/40',
        'open:animate-in open:fade-in-0',
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        {title || !hideClose ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              {title ? <h2 className="text-h2 font-semibold text-stone-900">{title}</h2> : null}
              {description ? <p className="text-meta text-stone-500">{description}</p> : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="inline-flex size-9 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div>{children}</div>
      </div>
    </dialog>
  );
}
