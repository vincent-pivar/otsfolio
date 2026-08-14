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
    script.setAttribute('data-theme', 'dark');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    ref.current.appendChild(script);
  }, [repo]);

  return (
    <section className="mt-12 border-t border-white/10 pt-8" aria-label="评论">
      <p className="section-label">// 评论</p>
      <div ref={ref} className="giscus" />
    </section>
  );
}
