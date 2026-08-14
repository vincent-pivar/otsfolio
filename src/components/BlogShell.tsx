import type { ReactNode } from 'react';
import Nav from './Nav';
import MatrixRain from './MatrixRain';
import CursorGlow from './CursorGlow';
import ScrollProgress from './ScrollProgress';
import { useSite } from '../hooks/useSite';

/** 博客页面的公共外壳：与前台保持同一套氛围 */
export default function BlogShell({ children }: { children: ReactNode }) {
  const { profile } = useSite();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <MatrixRain />
      <CursorGlow />
      <ScrollProgress />

      {/* 扫描线叠层 */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(0,240,255,.045) 0 1px, transparent 1px 4px)',
        }}
      />

      <Nav />

      <main className="relative z-10 pt-16">{children}</main>

      <footer className="relative z-10 border-t border-line py-8 text-center font-mono text-xs text-muted">
        <p>
          © {new Date().getFullYear()} {profile.name} — Built with React · Deployed on Cloudflare
        </p>
      </footer>
    </div>
  );
}
