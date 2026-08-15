import { useMemo, useEffect, useRef, useState } from 'react';
import { useSite } from '../hooks/useSite';
import { renderMarkdown, readingTime } from '../markdown';
import Comments from './Comments';

const TRACK_URL = '/api/track';
function track(slug: string, action: 'view' | 'read', duration = 0) {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify({ slug, action, duration })], { type: 'application/json' });
    navigator.sendBeacon(TRACK_URL, blob);
  } else {
    fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, action, duration }),
      keepalive: true,
    }).catch(() => {});
  }
}

export default function BlogPost({ slug }: { slug: string }) {
  const { posts, settings } = useSite();
  const published = useMemo(
    () =>
      posts
        .filter((p) => p.published)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [posts],
  );

  const index = published.findIndex((p) => p.slug === slug);
  const post = index >= 0 ? published[index] : undefined;

  if (!post) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <p className="text-muted">文章不存在或未发布</p>
        <a href="/blog" className="btn-neon mt-6 inline-block">
          返回博客
        </a>
      </div>
    );
  }

  // 正文里若包含与封面相同的图片，剔除避免重复展示
  const bodyForRender = useMemo(() => {
    if (!post.cover) return post.body;
    // 去掉与封面 src 完全一致的孤立图片行
    return post.body
      .split('\n')
      .filter((line) => {
        const m = line.match(/^!\[[^\]]*\]\(([^)\s]+)\)\s*$/);
        return !(m && m[1] === post.cover);
      })
      .join('\n');
  }, [post.body, post.cover]);

  // 访问统计埋点：进入记 view，离开按停留时长记 read
  const startRef = useRef(Date.now());
  useEffect(() => {
    if (!post) return;
    startRef.current = Date.now();
    track(post.slug, 'view');
    const onHide = () => {
      const dur = Math.round((Date.now() - startRef.current) / 1000);
      if (dur >= 5) track(post.slug, 'read', dur);
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
    return () => {
      const dur = Math.round((Date.now() - startRef.current) / 1000);
      if (dur >= 5) track(post.slug, 'read', dur);
      window.removeEventListener('pagehide', onHide);
    };
  }, [post?.slug]);
  const minutes = readingTime(post.body);
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/#/blog/${post.slug}`
      : '';
  const shareTitle = post.title;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const sameAuthor = published.filter((p) => p.author === post.author);
  const saIndex = sameAuthor.findIndex((p) => p.slug === slug);
  const older = saIndex + 1 < sameAuthor.length ? sameAuthor[saIndex + 1] : undefined;
  const newer = saIndex - 1 >= 0 ? sameAuthor[saIndex - 1] : undefined;

  // 相关文章：同作者内，同标签优先，否则取最新
  const related = sameAuthor
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      p,
      score: p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, 5)
    .map((x) => x.p);

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* 主列：竖排正文 */}
        <article className="min-w-0">
          <a
            href="/blog"
            className="font-mono text-xs text-muted transition-colors hover:text-cyan"
          >
            ← 返回博客
          </a>

          <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <time dateTime={post.date}>{post.date}</time>
            <span aria-hidden="true">·</span>
            <span>{minutes} 分钟阅读</span>
            <span aria-hidden="true">·</span>
            <span>创作于 {post.date}</span>
          </div>

          <h1 className="mt-4 break-words font-display text-3xl font-bold text-slate-100 sm:text-4xl">
            {post.title}
          </h1>

          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-line px-2 py-0.5 font-mono text-xs text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {post.cover && (
            <div className="mt-6 border border-line">
              <img
                src={post.cover}
                alt={`${post.title} 封面图`}
                className="aspect-[2/1] w-full object-cover"
              />
            </div>
          )}

          <div
            className="prose-cyber mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyForRender) }}
          />

          <footer className="mt-12 border-t border-line pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div>
                {older && (
                  <a
                    href={`#/blog/${older.slug}`}
                    className="group block"
                    aria-label={`上一篇：${older.title}`}
                  >
                    <span className="font-mono text-xs text-muted">← 上一篇</span>
                    <span className="mt-1 block break-words text-sm text-slate-200 transition-colors group-hover:text-cyan">
                      {older.title}
                    </span>
                  </a>
                )}
              </div>
              <div className="sm:text-right">
                {newer && (
                  <a
                    href={`#/blog/${newer.slug}`}
                    className="group block"
                    aria-label={`下一篇：${newer.title}`}
                  >
                    <span className="font-mono text-xs text-muted">下一篇 →</span>
                    <span className="mt-1 block break-words text-sm text-slate-200 transition-colors group-hover:text-cyan">
                      {newer.title}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </footer>

          {/* 一键分享 */}
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <span className="font-mono text-xs text-muted">分享：</span>
            <button
              type="button"
              onClick={copyLink}
              className="border border-cyan/50 px-3 py-1.5 font-mono text-xs text-cyan transition-colors hover:bg-cyan hover:text-void"
            >
              {copied ? '✓ 已复制' : '复制链接'}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="border border-line px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-cyan hover:text-cyan"
            >
              Twitter / X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="border border-line px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-cyan hover:text-cyan"
            >
              Facebook
            </a>
            <a
              href={`https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`}
              target="_blank"
              rel="noreferrer"
              className="border border-line px-3 py-1.5 font-mono text-xs text-slate-300 transition-colors hover:border-cyan hover:text-cyan"
            >
              微博
            </a>
          </div>

          {settings.commentsEnabled !== false && (
            <Comments slug={post.slug} />
          )}
        </article>

        {/* 侧栏：相关文章 + 全部文章（各自独立卡片，均排除当前篇） */}
        <aside className="space-y-6 lg:pt-16">
          <div className="cyber-card sticky top-24 p-5">
            <h3 className="section-label mb-3">相关文章</h3>
            <ul className="space-y-3">
              {related
                .filter((p) => p.slug !== post.slug)
                .map((p) => (
                  <li key={p.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <a
                      href={`#/blog/${p.slug}`}
                      className="block break-words font-body text-sm text-slate-300 transition-colors hover:text-cyan"
                    >
                      {p.title}
                    </a>
                    <p className="mt-0.5 font-mono text-[10px] text-line">
                      <time dateTime={p.date}>{p.date}</time>
                    </p>
                  </li>
                ))}
            </ul>
          </div>

          <div className="cyber-card sticky top-24 p-5">
            <h3 className="section-label mb-3">全部文章</h3>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {sameAuthor
                .filter((p) => p.slug !== post.slug)
                .map((p) => (
                  <li key={p.id}>
                    <a
                      href={`#/blog/${p.slug}`}
                      className="block break-words font-body text-sm text-slate-300 transition-colors hover:text-cyan"
                    >
                      {p.title}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
