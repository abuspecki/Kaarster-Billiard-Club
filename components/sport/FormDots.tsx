export function FormDots({ form, size = 'sm' }: { form: ('W' | 'L')[]; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-2.5 w-2.5 rounded-[3px]' : 'h-6 w-6 rounded-md text-[11px]';
  return (
    <span className="inline-flex gap-[3px]" aria-label={`Form: ${form.map((f) => (f === 'W' ? 'Sieg' : 'Niederlage')).join(', ')}`}>
      {form.map((f, i) => (
        <i
          key={i}
          className={`${box} grid place-items-center font-black text-white not-italic ${f === 'W' ? 'bg-win' : 'bg-loss'}`}
        >
          {size === 'md' ? (f === 'W' ? 'S' : 'N') : null}
        </i>
      ))}
    </span>
  );
}
