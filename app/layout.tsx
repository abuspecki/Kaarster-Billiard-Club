import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Billiard-Tracker',
  description: 'Sitzungen, Turniere und Ranglisten für eure Billiard-Runde',
  applicationName: 'Billiard-Tracker',
  appleWebApp: { capable: true, title: 'Billiard', statusBarStyle: 'black' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#121214' },
    { media: '(prefers-color-scheme: dark)', color: '#16181d' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh max-w-xl pb-16">{children}</div>
      </body>
    </html>
  );
}
