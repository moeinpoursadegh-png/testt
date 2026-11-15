// Writes a static HTML file per public route so the site is indexable and
// works on plain static/shared hosting. `200.html` is the un-rendered app
// shell used as the fallback for /admin and unknown URLs.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const { render, routes } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const template = await readFile(join(dist, 'index.html'), 'utf8');
const head = (t, d, extra = '') =>
  `<title>${esc(t)}</title>\n    <meta name="description" content="${esc(d)}" />\n    <meta property="og:title" content="${esc(t)}" />\n    <meta property="og:description" content="${esc(d)}" />${extra}`;
// `data-path` tells the client which route this HTML was rendered for, so it
// only hydrates when the host really served the matching file.
const fill = (h, body, path = '') =>
  template
    .replace(/<!--head-->[\s\S]*<!--\/head-->/, () => h)
    .replace('<div id="root">', () => `<div id="root" data-path="${path}">`)
    .replace('<!--app-->', () => body);

const all = routes();
const shell = fill(head(all[0].title, all[0].description, '\n    <meta name="robots" content="noindex" />'), '');
await writeFile(join(dist, '200.html'), shell);
await writeFile(join(dist, 'admin.html'), shell);

for (const r of all) {
  // Flat files (/work.html, /work/iranicard.html) are served at clean URLs by
  // most static hosts and by the .htaccess rules for Apache shared hosting.
  const file = join(dist, r.path === '/' ? 'index.html' : `${r.path.slice(1)}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, fill(head(r.title, r.description), render(r.path), r.path));
}
await rm(join(root, 'dist-ssr'), { recursive: true, force: true });
console.log(`Prerendered ${all.length} routes.`);
