'use client';

import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mt-6 space-y-3 text-center">
      <h1 className="text-xl font-bold">Da ist etwas schiefgelaufen 😕</h1>
      <p className="text-stone-600">Bitte versuch es noch einmal. Wenn das öfter passiert, prüf deine Internetverbindung.</p>
      <div className="flex justify-center gap-2">
        <Button onClick={reset}>Nochmal versuchen</Button>
        <Link href="/" className="rounded-xl px-4 py-3 font-semibold text-emerald-700">
          Startseite
        </Link>
      </div>
    </Card>
  );
}
