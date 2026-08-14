import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Skills from './components/Skills';
import Contact from './components/Contact';

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 扫描线叠层 */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(0,240,255,.045) 0 1px, transparent 1px 4px)',
        }}
      />
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <footer className="border-t border-line py-8 text-center font-mono text-xs text-muted">
        © {new Date().getFullYear()} VINCENT — Built with React · Deployed on Cloudflare
      </footer>
    </div>
  );
}
