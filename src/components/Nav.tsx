import { useState } from 'react';
import { nav } from '../content';
import { useSite } from '../hooks/useSite';

export default function Nav() {
  const { profile } = useSite();
  const [open, setOpen] = useState(false);

  // 独立路由项（博客）优先展示，页内锚点跳过「首页」
  const items = nav.filter((n) => n.route || n.id !== 'hero');

  const hrefOf = (n: (typeof nav)[number]) => n.route ?? `#${n.id}`;

  return (
    <header className="fixed top-0 z-40 w-full border-b border-line bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#/"
          className="font-display text-lg font-black tracking-widest text-cyan neon-text"
        >
          {profile.name}
        </a>

        {/* 桌面导航 */}
        <nav className="hidden gap-7 md:flex" aria-label="主导航">
          {items.map((n) => (
            <a
              key={n.id}
              href={hrefOf(n)}
              className={
                n.route
                  ? 'font-mono text-xs uppercase tracking-widest text-cyan transition-colors hover:text-magenta'
                  : 'font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-cyan'
              }
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* 移动端汉堡按钮 */}
        <button
          type="button"
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 border border-line transition-colors hover:border-cyan md:hidden"
        >
          <span
            className={`block h-px w-4 bg-cyan transition-transform ${open ? 'translate-y-[3.5px] rotate-45' : ''}`}
          />
          <span
            className={`block h-px w-4 bg-cyan transition-transform ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`}
          />
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {open && (
        <nav
          className="border-t border-line bg-void/95 px-6 py-4 md:hidden"
          aria-label="移动导航"
        >
          <ul className="space-y-3">
            {items.map((n) => (
              <li key={n.id}>
                <a
                  href={hrefOf(n)}
                  onClick={() => setOpen(false)}
                  className={
                    n.route
                      ? 'block font-mono text-sm uppercase tracking-widest text-cyan'
                      : 'block font-mono text-sm uppercase tracking-widest text-muted'
                  }
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
