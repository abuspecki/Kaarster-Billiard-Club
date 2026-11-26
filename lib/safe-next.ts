/** Nur interne Pfade als Weiterleitungsziel zulassen. */
export function safeNext(next: unknown): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

/** Ziel des Bestätigungslinks aus der Registrierungs-Mail. */
export function callbackUrl(origin: string, next: unknown): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
}
