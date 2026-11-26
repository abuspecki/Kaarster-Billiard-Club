'use client';

import Link from 'next/link';
import { AppBar } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { SectionCard } from '@/components/sport/SectionCard';
import { Button } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <AppBar title="Billiard-Tracker" initials="BT" />
      <div className="p-4">
        <SectionCard>
          <EmptyState
            title="Da ist etwas schiefgelaufen"
            text="Bitte versuch es noch einmal. Wenn das öfter passiert, prüf deine Internetverbindung."
            action={
              <div className="flex justify-center gap-2">
                <Button onClick={reset}>Nochmal versuchen</Button>
                <Link href="/" className="rounded-lg px-4 py-3 font-bold text-accent-text">
                  Startseite
                </Link>
              </div>
            }
          />
        </SectionCard>
      </div>
    </>
  );
}
