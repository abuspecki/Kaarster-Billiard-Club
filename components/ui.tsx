import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary: 'bg-accent text-white hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-2',
  danger: 'bg-surface text-accent-text border border-line hover:bg-accent-soft',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={`rounded-lg px-4 py-3 text-[15px] font-bold transition active:scale-[0.99] disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-base text-fg outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-soft ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`shadow-card rounded-xl border border-line bg-surface p-4 ${className}`}>{children}</section>;
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent-text">{children}</p>;
}

export function InfoText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-win">{children}</p>;
}
