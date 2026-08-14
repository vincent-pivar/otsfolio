import type { ReactNode } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Timeline from './components/Timeline';
import Skills from './components/Skills';
import Contact from './components/Contact';
import MatrixRain from './components/MatrixRain';
import CursorGlow from './components/CursorGlow';
import ScrollProgress from './components/ScrollProgress';
import { useReveal, revealClass } from './hooks/useReveal';

/** 滚动进场包装器 */
function Reveal({ children }: { children: ReactNode }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={revealClass(shown)}>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <MatrixRain />
      <CursorGlow />
      <ScrollProgress />

      {/* 扫描线叠层 */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(0,240,255,.045) 0 1px, transparent 1px 4px)',
        }}
      />

      <Nav />

      <main className="relative z-10">
        <Hero />
        <Reveal>
          <About />
        </Reveal>
        <Reveal>
          <Projects />
        </Reveal>
        <Reveal>
          <Timeline />
        </Reveal>
        <Reveal>
          <Skills />
        </Reveal>
        <Reveal>
          <Contact />
        </Reveal>
      </main>

      <footer className="relative z-10 border-t border-line py-8 text-center font-mono text-xs text-muted">
        © {new Date().getFullYear()} VINCENT — Built with React · Deployed on Cloudflare
      </footer>
    </div>
  );
}
