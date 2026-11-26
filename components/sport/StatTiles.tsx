export function StatTiles({ items }: { items: { value: string | number; label: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg bg-line" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="bg-surface px-2 py-3 text-center">
          <div className="font-cond truncate text-[28px] leading-none font-extrabold tabular-nums">{it.value}</div>
          <div className="mt-1 text-[10px] font-bold tracking-wide text-muted uppercase">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
