import { useRef, useState } from 'react';
import { renderMarkdown } from '../markdown';

type Props = {
  id: string;
  value: string;
  onChange: (v: string) => void;
};

/**
 * Markdown 编辑器：左侧编辑 + 工具栏，右侧实时预览（prose-cyber 排版）。
 * 工具栏在光标处插入语法；插入图片走本地 file→dataURL，正文即支持 ![alt](dataURL)。
 */
export default function MarkdownEditor({ id, value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const surround = (before: string, after = before, placeholder = '文字') => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + sel.length;
    });
  };

  const insertLinePrefix = (prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = lineStart + prefix.length;
    });
  };

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('图片过大（超过 1MB），请压缩后再插入');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const ta = ref.current;
      const pos = ta ? ta.selectionStart : value.length;
      const snippet = `\n![${file.name.replace(/\.[^.]+$/, '')}](${dataUrl})\n`;
      onChange(value.slice(0, pos) + snippet + value.slice(pos));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => insertLinePrefix('# ')} className="tool-btn">H1</button>
        <button type="button" onClick={() => insertLinePrefix('## ')} className="tool-btn">H2</button>
        <button type="button" onClick={() => surround('**', '**', '粗体')} className="tool-btn">B</button>
        <button type="button" onClick={() => surround('*', '*', '斜体')} className="tool-btn italic">I</button>
        <button type="button" onClick={() => surround('`', '`', '代码')} className="tool-btn font-mono">{'</>'}</button>
        <button type="button" onClick={() => insertLinePrefix('- ')} className="tool-btn">• 列表</button>
        <button type="button" onClick={() => insertLinePrefix('> ')} className="tool-btn">引用</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="tool-btn">🖼 图片</button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPickImage(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        <span className="mx-1 h-4 w-px bg-line" />
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className={showPreview ? 'tool-btn !border-cyan !text-cyan' : 'tool-btn'}
        >
          {showPreview ? '隐藏预览' : '显示预览'}
        </button>
      </div>

      <div className={showPreview ? 'grid gap-3 md:grid-cols-2' : ''}>
        <textarea
          ref={ref}
          id={id}
          rows={16}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="在此用 Markdown 写作…"
          className="w-full resize-y border border-line bg-void/60 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100 transition-all focus:border-cyan focus:shadow-neon focus:outline-none"
        />
        {showPreview && (
          <div className="prose-cyber max-h-[26rem] overflow-y-auto border border-line bg-void/40 p-4">
            {value.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />
            ) : (
              <p className="font-mono text-xs text-line">预览将显示在这里…</p>
            )}
          </div>
        )}
      </div>

      <p className="font-mono text-[10px] text-line">{value.length} 字 · 支持 Markdown</p>
    </div>
  );
}
