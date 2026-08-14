import { useEffect, useRef } from 'react';

/**
 * Giscus 评论区（基于 GitHub Discussions，零自建后端）。
 * 赛博朋克主题通过外链 CSS（public/giscus-theme.css）实现：
 * data-theme 指向该 CSS，Giscus 在 iframe 内加载并覆盖 Primer 变量。
 * 为防止首次 dark 配置缓存导致不刷新，注入前清 localStorage 并主动重载主题。
 */
export default function Giscus({ repo }: { repo: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const THEME = 'https://www.otscup.com/giscus-theme.css';

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.querySelector('script')) return;

    // 清掉可能缓存的旧主题配置（dark），强制用自定义赛博主题
    try {
      for (const k of Object.keys(localStorage).filter((x) => x.startsWith('giscus'))) {
        localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', '');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', '');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', THEME);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');

    // 脚本加载后，通过 Giscus 官方 API 主动重载主题（双保险，确保采用自定义 CSS）
    script.addEventListener('load', () => {
      try {
        const g = (window as unknown as { giscus?: (c: unknown) => void }).giscus;
        if (g) g({ setConfig: { theme: THEME } });
      } catch {
        /* ignore */
      }
    });

    ref.current.appendChild(script);
  }, [repo]);

  return (
    <section className="mt-12 border-t border-line pt-8" aria-label="评论">
      <p className="section-label">// 你确定不说点什么再走？</p>
      <p className="mb-4 font-mono text-xs text-muted">
        用 GitHub 账号留个脚印 — 支持 emoji（输入 <span className="text-cyan">:smile:</span>）和直接粘贴表情包图片。
      </p>
      <div ref={ref} className="giscus" />
    </section>
  );
}
