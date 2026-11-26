export interface Sides {
  a: string[];
  b: string[];
}

export function togglePlayer(s: Sides, id: string, size: number): Sides {
  if (s.a.includes(id)) return { a: s.a.filter((x) => x !== id), b: s.b };
  if (s.b.includes(id)) return { a: s.a, b: s.b.filter((x) => x !== id) };
  if (s.a.length < size) return { a: [...s.a, id], b: s.b };
  if (s.b.length < size) return { a: s.a, b: [...s.b, id] };
  return s;
}

export const resize = (s: Sides, size: number): Sides => ({ a: s.a.slice(0, size), b: s.b.slice(0, size) });

export const isComplete = (s: Sides, size: number) => s.a.length === size && s.b.length === size;
