/**
 * 轻量 Markdown → HTML。
 *
 * 设计取舍：不引入 marked/markdown-it（省约 40KB），只覆盖写作常用语法。
 * 安全：先转义全部 HTML 实体，再生成标记，因此正文中的 <script> 等
 *       只会显示为文本，不会执行。链接协议做白名单校验，阻断 javascript:。
 *
 * 支持：# 标题、**粗体**、*斜体*、`行内代码`、```代码块```、
 *       > 引用、- 无序列表、1. 有序列表、[文字](链接)、--- 分隔线、段落
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 仅允许安全协议，阻断 javascript: / data: 等 */
function safeUrl(url: string): string {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:|\/|#|\.\/)/i.test(u)) return u;
  return '#';
}

/** 行内元素：在已转义的文本上处理 */
function inline(text: string): string {
  let s = text;
  // 行内代码优先，避免内部内容被其它规则改写
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(c);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });

  // 链接 [文字](地址)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const href = safeUrl(url);
    const external = /^https?:\/\//i.test(href);
    const attrs = external ? ' target="_blank" rel="noreferrer noopener"' : '';
    return `<a href="${href}"${attrs} class="text-cyan underline decoration-cyan/40 underline-offset-2 hover:decoration-cyan">${label}</a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em class="italic text-slate-200">$2</em>');

  // 还原行内代码
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_m, i) => {
    return `<code class="rounded border border-line bg-void/70 px-1.5 py-0.5 font-mono text-[0.9em] text-lime">${codes[Number(i)]}</code>`;
  });

  return s;
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src.replace(/\r\n/g, '\n'));
  const lines = escaped.split('\n');
  const out: string[] = [];

  let inCode = false;
  let codeBuf: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paraBuf: string[] = [];
  let quoteBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push(
        `<p class="my-4 leading-relaxed text-slate-300">${inline(paraBuf.join(' '))}</p>`,
      );
      paraBuf = [];
    }
  };
  const flushList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushQuote = () => {
    if (quoteBuf.length) {
      out.push(
        `<blockquote class="my-5 border-l-2 border-magenta bg-magenta/5 py-2 pl-4 italic text-muted">${inline(
          quoteBuf.join(' '),
        )}</blockquote>`,
      );
      quoteBuf = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // 代码块围栏
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        out.push(
          `<pre class="my-5 overflow-x-auto border border-line bg-void/80 p-4"><code class="font-mono text-xs leading-relaxed text-lime">${codeBuf.join(
            '\n',
          )}</code></pre>`,
        );
        codeBuf = [];
        inCode = false;
      } else {
        flushAll();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    // 空行：结束段落/列表/引用
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      out.push('<hr class="my-8 border-line" />');
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushAll();
      const level = h[1].length;
      const sizes: Record<number, string> = {
        1: 'mt-10 mb-4 font-display text-3xl font-bold text-slate-100',
        2: 'mt-9 mb-3 font-display text-2xl font-bold text-slate-100',
        3: 'mt-7 mb-2 font-display text-xl font-semibold text-slate-100',
        4: 'mt-6 mb-2 font-display text-lg font-semibold text-slate-200',
      };
      out.push(`<h${level} class="${sizes[level]}">${inline(h[2])}</h${level}>`);
      continue;
    }

    // 引用（注意：源码已被 HTML 转义，故此处匹配 &gt; 而非 >）
    const q = line.match(/^&gt;\s?(.*)$/);
    if (q) {
      flushPara();
      flushList();
      quoteBuf.push(q[1]);
      continue;
    }
    flushQuote();

    // 无序列表
    const ul = line.match(/^[-*+]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (listType !== 'ul') {
        flushList();
        out.push('<ul class="my-4 list-disc space-y-1.5 pl-6 text-slate-300">');
        listType = 'ul';
      }
      out.push(`<li class="leading-relaxed">${inline(ul[1])}</li>`);
      continue;
    }

    // 有序列表
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      flushPara();
      if (listType !== 'ol') {
        flushList();
        out.push('<ol class="my-4 list-decimal space-y-1.5 pl-6 text-slate-300">');
        listType = 'ol';
      }
      out.push(`<li class="leading-relaxed">${inline(ol[1])}</li>`);
      continue;
    }
    flushList();

    paraBuf.push(line.trim());
  }

  // 收尾：未闭合的代码块也要输出，避免内容丢失
  if (inCode && codeBuf.length) {
    out.push(
      `<pre class="my-5 overflow-x-auto border border-line bg-void/80 p-4"><code class="font-mono text-xs leading-relaxed text-lime">${codeBuf.join(
        '\n',
      )}</code></pre>`,
    );
  }
  flushAll();

  return out.join('\n');
}

/** 从正文提取纯文本摘要 */
export function autoExcerpt(body: string, max = 120): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_~\-]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max) + '…' : plain;
}

/** 估算中文/英文混排的阅读时间（分钟） */
export function readingTime(body: string): number {
  const cjk = (body.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = body.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}

/** 标题转 slug；中文标题回退为拼接时间戳 */
export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const asciiOnly = s.replace(/[^\w-]/g, '');
  if (asciiOnly.replace(/-/g, '').length >= 3) return asciiOnly.slice(0, 60);
  return 'post-' + Date.now().toString(36);
}
