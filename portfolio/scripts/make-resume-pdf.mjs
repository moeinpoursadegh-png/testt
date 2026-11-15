// Optional: regenerates public/resume/Moein_Poursadegh_Resume.pdf from the
// /resume page (which omits the phone number unless it is enabled in Profile).
// Needs Playwright (`npm i -D playwright && npx playwright install chromium`)
// and a running server: `npm run dev`, then `npm run resume:pdf`.
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const url = process.argv[2] ?? 'http://localhost:5180';
const out = 'public/resume/Moein_Poursadegh_Resume.pdf';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  try {
    ({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright'));
  } catch {
    console.error('Playwright is not installed. See the comment at the top of this script.');
    process.exit(1);
  }
}
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${url}/resume`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await mkdir('public/resume', { recursive: true });
await page.pdf({ path: out, format: 'A4', printBackground: true });
await browser.close();
console.log(`Wrote ${out}`);
