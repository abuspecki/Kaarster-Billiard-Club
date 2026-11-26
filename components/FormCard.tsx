'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/actions/auth';
import { Button, ErrorText, InfoText, Input } from './ui';

/** Ein-Feld-Formular (Name oder Code) mit Fehleranzeige. */
export function SingleFieldForm({
  action,
  name,
  placeholder,
  button,
  defaultValue,
  maxLength,
  uppercase,
  optional,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  name: string;
  placeholder: string;
  button: string;
  defaultValue?: string;
  maxLength?: number;
  uppercase?: boolean;
  optional?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <Input
          name={name}
          placeholder={placeholder}
          required={!optional}
          maxLength={maxLength}
          defaultValue={defaultValue}
          autoCapitalize={uppercase ? 'characters' : undefined}
          autoComplete="off"
          className={uppercase ? 'font-mono uppercase tracking-widest' : ''}
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {button}
        </Button>
      </div>
      <ErrorText>{state.error}</ErrorText>
      <InfoText>{state.info}</InfoText>
    </form>
  );
}
