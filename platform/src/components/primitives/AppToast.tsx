'use client';

import { Toaster, toast } from 'sonner';

/**
 * AppToast — Layer 6.12.
 * Wraps sonner. AI_CONTRACT rule 6: one toast at a time.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors={false}
      closeButton
      duration={4000}
      // AI_CONTRACT: one toast at a time
      visibleToasts={1}
      toastOptions={{
        className: 'rounded-md border border-stone-200 bg-white text-stone-900 shadow-md',
        style: {
          fontFamily: 'var(--font-sans)',
        },
      }}
    />
  );
}

export { toast };
