import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

let font: Promise<Buffer> | undefined;
const loadFont = () => (font ??= readFile(path.join(process.cwd(), 'assets/barlow-condensed-latin-800-normal.woff')));

/** App-Symbol: rotes Quadrat mit „KBC“ (für Startbildschirm, Favicon, Apple-Touch-Icon). */
export async function appIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#d50a0a',
          color: '#ffffff',
          fontFamily: 'Barlow Condensed',
          fontSize: size * 0.46,
          fontWeight: 800,
          letterSpacing: size * 0.01,
        }}
      >
        KBC
      </div>
    ),
    { width: size, height: size, fonts: [{ name: 'Barlow Condensed', data: await loadFont(), weight: 800, style: 'normal' }] },
  );
}
