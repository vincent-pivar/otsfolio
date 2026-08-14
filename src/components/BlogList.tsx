import { useState } from 'react';
import { useSite } from '../hooks/useSite';
import { autoExcerpt, readingTime } from '../markdown';

const PAGE = 6;

export default function BlogList() {
  const { posts } = useSite();
  const published = posts
    .filter((p) => p.published)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const [shown, setShown] = useState(PAGE);
  const visible = published.slice(0, shown);
  const hasMore = shown < published.length;

  return (
    <section id="blog" className="mx-auto max-w-6xl px-6 py-24">
      <p className="section-label">// 思考记录</p>
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        <span className="text-slate-100">博</span>
        <span className="text-cyan neon-text">客</span>
      </h2>
      <p className="mt-4 max-w-xl font-body text-sm text-muted">
        记录技术探索与工程思考，在代码与文字之间寻找平衡。
      </p>

      {published.length === 0 ? (
        <div className="mt-12 flex justify-center">
          <div className="cyber-card max-w-md p-10 text-center">
            <p className="text-muted">还没有发布文章</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            {visible.map((post) => {
              const minutes = readingTime(post.body);
              const excerpt = post.excerpt || autoExcerpt(post.body);
              return (
                <a
                  key={post.id}
                  href={`#/blog/${post.slug}`}
                  className="group block"
                  aria-label={`阅读文章：${post.title}`}
                >
                  <article className="cyber-card flex h-full flex-col p-6 transition-transform duration-300 hover:-translate-y-1">
                    {post.cover && (
                      <div className="mb-4 overflow-hidden border border-line">
                        <img
                          src={post.cover}
                          alt={`${post.title} 封面图`}
                          loading="lazy"
                          className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="mb-3 flex items-center gap-2 font-mono text-xs text-muted">
                      <time dateTime={post.date}>{post.date}</time>
                      <span aria-hidden="true">·</span>
                      <span>{minutes} 分钟阅读</span>
                    </div>

                    <h3 className="break-words font-display text-xl font-bold text-slate-100 transition-colors group-hover:text-cyan">
                      {post.title}
                    </h3>

                    <p className="prose-cyber mt-3 line-clamp-3 text-sm leading-relaxed text-slate-300">
                      {excerpt}
                    </p>

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

                    <div className="mt-auto pt-5 font-mono text-xs text-cyan">
                      阅读全文 →
                    </div>
                  </article>
                </a>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="btn-neon"
              >
                加载更多（还剩 {published.length - shown} 篇）
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
