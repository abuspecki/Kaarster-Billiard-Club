import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Billiard-Tracker',
  description: 'Sitzungen, Turniere und Ranglisten für eure Billiard-Runde',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#065f46' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-dvh bg-stone-100 text-stone-900 antialiased">
        <main className="mx-auto max-w-xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
