'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/actions/auth';
import { Button, ErrorText } from './ui';

/** Knopf, der eine Server Action auslöst und Fehler auf Deutsch darunter anzeigt. */
export function ActionButton({
  action,
  children,
  variant = 'primary',
  className = '',
  confirmText,
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState>(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <Button variant={variant} disabled={pending} className={className}>
        {children}
      </Button>
      <ErrorText>{state.error}</ErrorText>
    </form>
  );
}
