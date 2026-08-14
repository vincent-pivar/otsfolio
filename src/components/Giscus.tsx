import { useEffect, useRef } from 'react';

/**
 * Giscus 评论区（基于 GitHub Discussions，零自建后端）。
 * 仅需一个公开仓库 + 安装 Giscus App 即可。
 * 仓库未配置时整体不渲染（调用方已判断 repo 非空）。
 */
export default function Giscus({ repo }: { repo: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // 避免重复注入脚本
    if (ref.current.querySelector('script')) return;

    // 清掉所有 giscus 缓存（主题/会话），防止旧 dark 配置残留导致自定义 CSS 不生效
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('giscus'))
        .forEach((k) => localStorage.removeItem(k));
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('giscus'))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', ''); // 由 Giscus 按 repo 自动解析
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', '');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'https://www.otscup.com/giscus-theme.css');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    ref.current.appendChild(script);

    // 脚本加载后，主动通过 giscus() API 强制重载自定义主题（双保险）
    script.addEventListener('load', () => {
      try {
        const g = (window as unknown as { giscus?: (c: unknown) => void }).giscus;
        if (g) {
          g({
            setConfig: {
              theme: 'https://www.otscup.com/giscus-theme.css',
            },
          });
        }
      } catch {
        /* ignore */
      }
    });
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
