import { useEffect, useRef } from 'react';

/**
 * Giscus 评论区（基于 GitHub Discussions，零自建后端）。
 * 仓库未配置时整体不渲染（调用方已判断 repo 非空）。
 * 赛博朋克主题：监听 Giscus ready 消息后，直接向 iframe 内部注入 <style>，
 * 绕过 Giscus 外链 CSS 加载机制（实测外链主题不生效/被缓存）。
 */

// 赛博朋克配色（直接注入 iframe，覆盖 GitHub Primer 默认变量）
// 视觉对标首页：深蓝紫底（非纯黑）+ 青色霓虹描边辉光 + 品红链接 + 亮字
const CYBER_CSS = `
:root {
  --color-canvas-default: #0d0d1a !important;
  --color-canvas-subtle: #16162e !important;
  --color-canvas-inset: #0a0a18 !important;
  --color-canvas-overlay: #16162e !important;
  --color-fg-default: #e6edf3 !important;
  --color-fg-muted: #aab4d4 !important;
  --color-fg-subtle: #6e7693 !important;
  --color-border-default: #2a2a5a !important;
  --color-border-muted: #20204a !important;
  --color-accent-fg: #00f0ff !important;
  --color-accent-emphasis: #00f0ff !important;
  --color-accent-muted: rgba(0,240,255,0.18) !important;
  --color-btn-text: #e6edf3 !important;
  --color-btn-bg: #1a1a3a !important;
  --color-btn-border: #00f0ff !important;
  --color-btn-hover-bg: #232352 !important;
  --color-btn-hover-border: #00f0ff !important;
  --color-btn-primary-text: #0d0d1a !important;
  --color-btn-primary-bg: #00f0ff !important;
  --color-btn-primary-border: #00f0ff !important;
  --color-success-fg: #00f0ff !important;
  --color-danger-fg: #ff00a0 !important;
}
/* 评论卡片：深底 + 青色霓虹描边发光，呼应首页赛博风 */
.gsc-comment-box, .gsc-comment {
  background: #14142e !important;
  border: 1px solid #00f0ff !important;
  border-radius: 12px !important;
  box-shadow: 0 0 12px rgba(0,240,255,0.25), inset 0 0 8px rgba(0,240,255,0.05) !important;
}
.gsc-comment-box-textarea {
  background: #0a0a18 !important;
  color: #e6edf3 !important;
  border: 1px solid #2a2a5a !important;
  border-radius: 8px !important;
}
.gsc-comment-box-textarea:focus {
  border-color: #00f0ff !important;
  box-shadow: 0 0 10px rgba(0,240,255,0.4) !important;
  outline: none !important;
}
/* 作者名用青（带辉光），正文亮字 */
.gsc-comment-author { color: #00f0ff !important; font-weight: 700; text-shadow: 0 0 6px rgba(0,240,255,0.5) !important; }
.gsc-comment-content { color: #e6edf3 !important; }
.gsc-comment-content a { color: #ff00a0 !important; text-shadow: 0 0 6px rgba(255,0,160,0.4) !important; }
.gsc-comment-content a:hover { text-decoration: underline !important; }
/* reactions 按钮：霓虹描边 */
.gsc-reaction-button {
  border-color: #2a2a5a !important;
  color: #e6edf3 !important;
  border-radius: 8px !important;
}
.gsc-reaction-button:hover { border-color: #00f0ff !important; box-shadow: 0 0 8px rgba(0,240,255,0.35) !important; }
.gsc-header-text, .gsc-meta-text, .gsc-footer { color: #aab4d4 !important; }
.gsc-footer a, .gsc-meta-link { color: #00f0ff !important; }
/* GitHub 登录按钮：青底深字 + 辉光 */
.gsc-login-button, .gsc-login-button-text {
  background: #00f0ff !important;
  color: #0d0d1a !important;
  border-color: #00f0ff !important;
  border-radius: 8px !important;
  box-shadow: 0 0 10px rgba(0,240,255,0.4) !important;
  font-weight: 600;
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
