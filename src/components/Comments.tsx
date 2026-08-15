import { useEffect, useRef, useState } from 'react';
import { useSite } from '../hooks/useSite';

interface Comment {
  id: number;
  slug: string;
  name: string;
  body: string;
  created_at: number;
}

/**
 * 自建评论（数据存 Cloudflare D1，无需 GitHub）。
 * 赛博风：深底卡片 + 青色霓虹描边 + 亮灰字。
 * 支持 emoji（直接输入）与表情包图片（粘贴 ![alt](https://图片地址) 格式）。
 */
export default function Comments({ slug }: { slug: string }) {
  const { settings } = useSite();
  const maxImages = settings.maxImagesPerComment ?? 0;
  const maxSizeKB = settings.maxImageSizeKB ?? 0;
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const countImages = (s: string) => (s.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g) || []).length;

  const loadCaptcha = async () => {
    try {
      const r = await fetch('/api/captcha');
      const d = await r.json();
      if (d.ok) {
        setCaptchaToken(d.token);
        setCaptchaSvg(d.svg);
        setCaptchaInput('');
      }
    } catch {
      /* ignore */
    }
  };

  // 加载评论 + 验证码
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.ok) setComments(d.comments || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    loadCaptcha();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submit = async () => {
    setError('');
    setOk(false);
    const text = body.trim();
    if (!text) {
      setError('说点什么再走？');
      return;
    }
    if (!captchaInput.trim()) {
      setError('请填写验证码');
      return;
    }
    // 客户端软校验图片数（服务端也会强制）
    const imgN = countImages(text);
    if (maxImages > 0 && imgN > maxImages) {
      setError(`每条评论最多 ${maxImages} 张图片（当前 ${imgN} 张）`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          body: text,
          captchaToken,
          captcha: captchaInput.trim(),
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setComments((prev) => [...prev, d.comment]);
        setBody('');
        setOk(true);
        setTimeout(() => setOk(false), 2500);
        loadCaptcha(); // 刷新验证码
      } else {
        setError(d.error || '发送失败');
        loadCaptcha(); // 验证码错/失效则换新
      }
    } catch {
      setError('网络错误，稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 border-t border-line pt-8" aria-label="评论">
      <p className="section-label">// 你确定不说点什么再走？</p>
      <p className="mb-4 font-mono text-xs text-muted">
        支持 emoji（输入 <span className="text-cyan">:smile:</span>）和表情包——直接粘贴{' '}
        <span className="text-cyan">![描述](图片地址)</span> 即可显示图片。
        {(maxImages > 0 || maxSizeKB > 0) && (
          <span className="ml-1 text-line">
            （每评最多 {maxImages > 0 ? `${maxImages} 张图` : '不限张数'}
            {maxSizeKB > 0 ? `，单图建议 ≤ ${maxSizeKB}KB` : ''}）
          </span>
        )}
      </p>

      {/* 评论表单 */}
      <div className="cyber-card p-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="昵称（留空为「匿名访客」）"
          className="mb-3 w-full border border-line bg-void px-3 py-2 font-mono text-sm text-slate-200 outline-none transition-colors focus:border-cyan"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="说点什么…"
          className="w-full resize-y border border-line bg-void px-3 py-2 font-mono text-sm text-slate-200 outline-none transition-colors focus:border-cyan"
        />
        {/* 验证码 */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={loadCaptcha}
            title="点击刷新验证码"
            className="h-[52px] border border-line bg-void p-0 transition-colors hover:border-cyan"
          >
            {captchaSvg ? (
              <img src={captchaSvg} alt="验证码" className="h-[52px] w-[140px]" />
            ) : (
              <span className="px-4 font-mono text-xs text-muted">加载中</span>
            )}
          </button>
          <input
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="输入图中 4 位字符"
            className="h-[52px] w-40 border border-line bg-void px-3 font-mono text-sm tracking-widest text-slate-200 outline-none transition-colors focus:border-cyan"
          />
          <span className="font-mono text-xs text-muted">点击图可刷新</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-muted">
            {body.length}/2000
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="border border-cyan/60 px-5 py-1.5 font-mono text-sm text-cyan shadow-neon transition-colors hover:bg-cyan hover:text-void disabled:opacity-50"
          >
            {submitting ? '发送中…' : '发表评论'}
          </button>
        </div>
        {error && <p className="mt-2 font-mono text-xs text-magenta">{error}</p>}
        {ok && <p className="mt-2 font-mono text-xs text-lime">✓ 已发送</p>}
      </div>

      {/* 评论列表 */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="font-mono text-xs text-muted">加载评论中…</p>
        ) : comments.length === 0 ? (
          <p className="font-mono text-xs text-muted">还没有评论，来抢沙发。</p>
        ) : (
          comments.map((c) => <CommentCard key={c.id} c={c} />)
        )}
      </div>
    </section>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 受控渲染：纯文本（保留换行）+ 允许 ![alt](https://图片) 渲染为图片（行内或独立行，安全白名单） */
function renderBody(body: string): { __html: string } {
  const lines = body.split('\n').map((line) => {
    // 先把行内 ![alt](https://url) 替换为占位 <img>，再转义其余，最后放回
    const parts: string[] = [];
    let rest = line;
    const re = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
    let m: RegExpExecArray | null;
    let last = 0;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(escapeHtml(rest.slice(last, m.index)));
      parts.push(
        `<img src="${escapeHtml(m[2])}" alt="${escapeHtml(m[1])}" class="my-2 max-h-64 inline-block rounded border border-line align-middle" loading="lazy" />`,
      );
      last = m.index + m[0].length;
    }
    if (last < rest.length) parts.push(escapeHtml(rest.slice(last)));
    return parts.join('');
  });
  return { __html: lines.join('<br/>') };
}

function CommentCard({ c }: { c: Comment }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = renderBody(c.body).__html;
  }, [c.body]);
  return (
    <div className="border border-line bg-surface p-4 shadow-neon">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-sm text-cyan">{c.name}</span>
        <span className="font-mono text-[10px] text-line">
          {new Date(c.created_at).toLocaleString('zh-CN')}
        </span>
      </div>
      <div
        ref={ref}
        className="whitespace-pre-wrap break-words font-body text-sm text-slate-200"
      />
    </div>
  );
}
