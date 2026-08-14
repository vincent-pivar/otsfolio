import { useEffect, useRef } from 'react';

/**
 * Giscus 评论区（基于 GitHub Discussions，零自建后端）。
 * 仓库未配置时整体不渲染（调用方已判断 repo 非空）。
 * 赛博朋克主题：监听 Giscus ready 消息后，直接向 iframe 内部注入 <style>，
 * 绕过 Giscus 外链 CSS 加载机制（实测外链主题不生效/被缓存）。
 */

// 赛博朋克配色（直接注入 iframe，覆盖 GitHub Primer 默认变量）
const CYBER_CSS = `
:root {
  --color-canvas-default: #0d0d1a !important;
  --color-canvas-subtle: #16162e !important;
  --color-canvas-inset: #07070f !important;
  --color-canvas-overlay: #16162e !important;
  --color-fg-default: #d4d4f0 !important;
  --color-fg-muted: #9a9ac0 !important;
  --color-fg-subtle: #6e6e95 !important;
  --color-border-default: #2f2f55 !important;
  --color-border-muted: #24244a !important;
  --color-accent-fg: #00f0ff !important;
  --color-accent-emphasis: #00f0ff !important;
  --color-accent-muted: rgba(0,240,255,0.15) !important;
  --color-btn-text: #d4d4f0 !important;
  --color-btn-bg: #1e1e3a !important;
  --color-btn-border: #2f2f55 !important;
  --color-btn-hover-bg: #28284f !important;
  --color-btn-hover-border: #00f0ff !important;
  --color-btn-primary-text: #0d0d1a !important;
  --color-btn-primary-bg: #00f0ff !important;
  --color-btn-primary-border: #00f0ff !important;
  --color-success-fg: #00f0ff !important;
  --color-danger-fg: #ff00a0 !important;
}
.gsc-comment-box, .gsc-comment {
  background: #16162e !important;
  border: 1px solid #2f2f55 !important;
  border-radius: 12px !important;
}
.gsc-comment-box-textarea {
  background: #07070f !important;
  color: #d4d4f0 !important;
  border: 1px solid #24244a !important;
  border-radius: 8px !important;
}
.gsc-comment-author { color: #00f0ff !important; font-weight: 600; }
.gsc-comment-content { color: #d4d4f0 !important; }
.gsc-comment-content a { color: #00f0ff !important; }
.gsc-reaction-button { border-color: #2f2f55 !important; color: #d4d4f0 !important; }
.gsc-reaction-button:hover { border-color: #00f0ff !important; }
.gsc-header-text, .gsc-meta-text, .gsc-footer { color: #9a9ac0 !important; }
.gsc-footer a, .gsc-meta-link { color: #00f0ff !important; }
.gsc-login-button, .gsc-login-button-text {
  background: #00f0ff !important;
  color: #0d0d1a !important;
  border-color: #00f0ff !important;
  border-radius: 8px !important;
}
`;

export default function Giscus({ repo }: { repo: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.querySelector('script')) return;

    // 监听 Giscus 发来的 ready 消息，拿到 iframe 后注入样式
    const onMsg = (e: MessageEvent) => {
      try {
        const data = e.data as { giscus?: { action?: string } };
        if (!data?.giscus || data.giscus.action !== 'ready') return;
        const frame = ref.current?.querySelector('iframe.giscus-frame') as
          | HTMLIFrameElement
          | null;
        if (!frame) return;
        const doc = frame.contentDocument;
        if (!doc) return;
        if (doc.getElementById('otsfolio-cyber-theme')) return; // 避免重复注入
        const style = doc.createElement('style');
        style.id = 'otsfolio-cyber-theme';
        style.textContent = CYBER_CSS;
        doc.head.appendChild(style);
      } catch {
        /* 跨域或时序问题，忽略 */
      }
    };
    window.addEventListener('message', onMsg);

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
    // 用 dark 作为基础（避免未注入前的闪烁），实际配色由注入 style 覆盖
    script.setAttribute('data-theme', 'dark');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('data-loading', 'lazy');
    ref.current.appendChild(script);

    return () => window.removeEventListener('message', onMsg);
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
