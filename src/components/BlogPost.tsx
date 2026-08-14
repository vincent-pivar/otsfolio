import { useMemo } from 'react';
import { useSite } from '../hooks/useSite';
import { renderMarkdown, readingTime } from '../markdown';

export default function BlogPost({ slug }: { slug: string }) {
  const { posts } = useSite();
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
        <a href="#/blog" className="btn-neon mt-6 inline-block">
          返回博客
        </a>
      </div>
    );
  }

  const minutes = readingTime(post.body);
  const older = index + 1 < published.length ? published[index + 1] : undefined;
  const newer = index - 1 >= 0 ? published[index - 1] : undefined;

  // 相关文章：同标签优先，否则取最新
  const related = published
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
            href="#/blog"
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
                className="w-full object-cover"
              />
            </div>
          )}

          <div
            className="prose-cyber mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
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
        </article>

        {/* 侧栏：相关文章 */}
        <aside className="lg:pt-16">
          <div className="cyber-card sticky top-24 p-5">
            <h3 className="section-label mb-3">相关文章</h3>
            <ul className="space-y-3">
              {related.map((p) => (
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

            <h3 className="section-label mb-3 mt-6">全部文章</h3>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {published.map((p) => (
                <li key={p.id}>
                  <a
                    href={`#/blog/${p.slug}`}
                    className={
                      'block break-words font-body text-sm transition-colors ' +
                      (p.slug === post.slug
                        ? 'text-cyan'
                        : 'text-slate-300 hover:text-cyan')
                    }
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
