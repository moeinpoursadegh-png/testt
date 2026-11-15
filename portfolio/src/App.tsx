import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import About from './pages/About';
import CaseStudy from './pages/CaseStudy';
import Contact from './pages/Contact';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Resume from './pages/Resume';
import Work from './pages/Work';

// The admin is a separate chunk: the public site never loads or depends on it.
const Admin = lazy(() => import('./admin/Admin'));

function Public() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Work />} />
        <Route path="/work/:slug" element={<CaseStudy />} />
        <Route path="/about" element={<About />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="boot mono" role="status">Loading admin…</div>}>
            <Admin />
          </Suspense>
        }
      />
      <Route path="*" element={<Public />} />
    </Routes>
  );
}
