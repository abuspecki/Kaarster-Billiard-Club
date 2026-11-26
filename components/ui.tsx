import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

const variants = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900',
  secondary: 'bg-white text-stone-900 ring-1 ring-stone-300 hover:bg-stone-50',
  danger: 'bg-white text-red-700 ring-1 ring-red-300 hover:bg-red-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={`rounded-xl px-4 py-3 font-semibold transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</section>;
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}
