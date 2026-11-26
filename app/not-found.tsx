import Link from 'next/link';
import { AppBar } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { SectionCard } from '@/components/sport/SectionCard';

export default function NotFound() {
  return (
    <>
      <AppBar title="Billiard-Tracker" initials="BT" />
      <div className="p-4">
        <SectionCard>
          <EmptyState
            title="Nicht gefunden"
            text="Diese Seite gibt es nicht – oder du bist (noch) nicht Mitglied dieser Gruppe."
            action={
              <Link href="/" className="font-bold text-accent-text">
                Zur Startseite ›
              </Link>
            }
          />
        </SectionCard>
      </div>
    </>
  );
}
