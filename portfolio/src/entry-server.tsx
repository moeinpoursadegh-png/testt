import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';
import { defaultSite } from './content/site';

export function render(url: string) {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
}

/** Routes to prerender, with the head tags each one gets. */
export function routes() {
  const s = defaultSite;
  const pub = s.projects.filter((p) => p.status === 'published');
  return [
    { path: '/', title: s.seo.title, description: s.seo.description },
    { path: '/work', title: `Work — ${s.profile.name}`, description: 'Selected product design case studies across fintech, healthcare, SaaS and AI-assisted products.' },
    { path: '/about', title: `About — ${s.profile.name}`, description: s.profile.summary },
    { path: '/resume', title: `Résumé — ${s.profile.name}`, description: `Résumé of ${s.profile.name}, ${s.profile.title}.` },
    { path: '/contact', title: `Contact — ${s.profile.name}`, description: `Get in touch with ${s.profile.name}.` },
    ...pub.map((p) => ({
      path: `/work/${p.slug}`,
      title: p.seo.title || `${p.title} — ${s.profile.name}`,
      description: p.seo.description || p.summary,
    })),
  ];
}
