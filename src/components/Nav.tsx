import { profile, nav } from '../content';

export default function Nav() {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-line bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#hero" className="font-display text-lg font-black tracking-widest text-cyan neon-text">
          {profile.name}
        </a>
        <nav className="hidden gap-7 md:flex">
          {nav.slice(1).map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-cyan"
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
