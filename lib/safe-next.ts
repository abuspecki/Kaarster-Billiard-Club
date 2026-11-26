/** Nur interne Pfade als Weiterleitungsziel zulassen. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
