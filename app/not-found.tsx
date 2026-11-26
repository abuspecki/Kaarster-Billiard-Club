import Link from 'next/link';
import { Card } from '@/components/ui';

export default function NotFound() {
  return (
    <Card className="mt-6 space-y-3 text-center">
      <h1 className="text-xl font-bold">Nicht gefunden</h1>
      <p className="text-stone-600">Diese Seite gibt es nicht – oder du bist (noch) nicht Mitglied dieser Gruppe.</p>
      <Link href="/" className="font-semibold text-emerald-700">
        Zur Startseite
      </Link>
    </Card>
  );
}
