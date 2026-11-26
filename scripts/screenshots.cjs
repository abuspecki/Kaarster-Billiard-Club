// Screenshots der Vorschau-Seite in hell und dunkel (Entwicklung).
// Aufruf: node scripts/screenshots.cjs <ausgabe-ordner>   (Dev-Server muss auf PORT laufen)
// eslint-disable-next-line @typescript-eslint/no-require-imports -- einfaches Node-Skript
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2] ?? '.';
  const port = process.env.PORT ?? '3123';
  const browser = await chromium.launch();
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await page.goto(`http://localhost:${port}/dev/preview`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${out}/preview-${scheme}.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log('ok');
})();
