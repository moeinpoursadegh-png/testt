# Moein Poursadegh — Portfolio

English, left-to-right portfolio for a product designer, with a case-study system, a FigJam-style research board and an admin panel. Design phase: content and media are placeholders where marked, and the admin stores changes in the browser only.

## Run it

```bash
cd portfolio
npm install
npm run dev        # http://localhost:5180  (site)  ·  /admin  (admin panel)
npm run build      # type-check, build, prerender every public page into dist/
npm run preview    # serve dist/ on http://localhost:5180
```

## Design direction

The site borrows the *working surface* of Figma and FigJam rather than copying the app:

- **Canvas** — dotted background, the headline held in a selection box with the designer's name as the frame label, floating toolbar-style navigation, a bottom dock on phones.
- **Frames** — each project is a labelled frame; hover or focus selects it.
- **Layers and inspector** — on a case study, the left panel lists the sections (scroll-aware) and the right panel holds role, timeline, team, scope and methods.
- **Sticky notes** — headline metrics on the home page and research synthesis in case studies. Solid notes are verified statements; dashed notes are illustrative placeholders.

**Type:** Instrument Serif (display), Geist (interface), Geist Mono (labels), all self-hosted.

**Colour** (light and dark; follows the system setting, toggle in the top bar):

| Role | Light | Dark |
| --- | --- | --- |
| Canvas / surface | `#F4F3EF` / `#FFFFFF` | `#19191B` / `#232326` |
| Text / muted | `#17171A` / `#5D5D66` | `#F1F0EC` / `#A5A5AF` |
| Accent (selection blue) | `#0B68D8` | `#45A9FF` |
| Research accent (FigJam violet) | `#6F3FF0` | `#AB8DFF` |
| Sticky notes | blue, violet, green, yellow, pink, orange | same hues, slightly deeper |

All tokens live at the top of `src/styles/site.css`.

## Technical choice

**React + TypeScript + Vite, prerendered to static HTML.** No server is needed to host the public site.

- *Why:* static files are the cheapest and safest thing to host, each page is real HTML for search engines, and the admin is a separate lazy-loaded chunk the public pages never load.
- *Trade-off:* content changes need a rebuild until a backend exists, and the admin cannot be secured without a server.
- *Shared hosting:* yes. Upload `dist/` to the web root; the included `.htaccess` gives clean URLs on Apache. It also works on Netlify, Cloudflare Pages and GitHub Pages.
- *Later backend:* the whole site is one typed object (`src/content/types.ts`). A small API (PHP on shared hosting, or any Node host) only has to authenticate the admin, validate and store that object and uploaded files, and trigger a rebuild. `src/content/store.ts` and `src/content/media.ts` are the two files to swap.

Security is a property of that backend, not of the language: it needs established authentication with server-side sessions, authorization checked on every write, upload validation on the server (type, size, re-encoding of images), secrets kept out of the client bundle, and rate limiting on sign-in. The site already renders all content as text (no raw HTML) and only accepts `http(s)` URLs for links and embeds.

## Structure

```
src/content/types.ts    content model
src/content/site.ts     default content (from the résumé + marked placeholders)
src/content/store.ts    draft / publish / preview (localStorage demo)
src/content/media.ts    uploads (IndexedDB demo), URL safety, Figma embeds
src/components/         Shell, ProjectFrame, Cover, Board, Sections (case-study blocks)
src/pages/              Home, Work, CaseStudy, About, Resume, Contact, NotFound
src/admin/              Admin (projects, profile, résumé, site settings), ProjectEditor, ui
scripts/prerender.mjs   static HTML per route
```

A case study is an ordered list of blocks, so each project can tell a different story: `text`, `list`, `metrics`, `board`, `flow`, `decisions`, `media`, `embed`.

## Admin: what works and what does not

Works now, saved in this browser: create, edit, duplicate, delete and reorder projects; draft/published status; add, edit and reorder case-study sections; upload and replace images, video and PDFs with captions and alt text; Figma, FigJam, prototype and external links; profile, experience, skills and contact details; résumé file; navigation, featured projects and SEO fields; preview of the unpublished draft; publish; JSON export and import.

Not real yet:

- **No authentication.** `/admin` is open to anyone with the URL. Do not treat it as protected.
- **Publishing is local.** "Publish" updates what *this browser* sees. To change the live site, export the JSON from Site settings, use it to update `src/content/site.ts`, and rebuild.
- **Uploads stay in the browser** (IndexedDB) and are not included in the export.
- Prerendered HTML and page titles are built from `site.ts`, not from admin edits.

## Placeholders to replace

- Project cover images (abstract wireframes are shown and labelled "Placeholder cover").
- Final screens, recordings and prototype links in every case study.
- Research boards: dashed notes, flow steps and "Reflection" sections are marked "Illustrative placeholder".
- Portrait on the About page.
- Social sharing image.
- `public/resume/Moein_Poursadegh_Resume.pdf` is generated from the Résumé page and leaves out the phone number. Replace it with a designed PDF if preferred (`npm run resume:pdf` regenerates it).

Metrics are quoted from the résumé with their source ("Usability testing", "Test sessions", "Proposed structure") shown beside each number, so test results are not read as production outcomes. The phone number is not in the code or the build; it can be added and switched on in Admin → Profile.

## Still needed for production

Backend with authentication and server-side authorization; server-side upload storage and validation; rebuild or server rendering on publish; sitemap and Open Graph images; analytics if wanted; domain and hosting setup; real 404 status on the host.
