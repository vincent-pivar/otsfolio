import { useMemo, useState } from 'react';
import { useSite } from '../hooks/useSite';
import { autoExcerpt, readingTime } from '../markdown';

const PAGE = 6;

export default function BlogList() {
  const { posts } = useSite();
  const all = useMemo(
    () =>
      posts
        .filter((p) => p.published)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [posts],
  );

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    all.forEach((p) => p.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      const inCat = !cat || p.tags.includes(cat);
      const inQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || autoExcerpt(p.body)).toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return inCat && inQ;
    });
  }, [all, query, cat]);

  const visible = filtered.slice(0, shown);
  const hasMore = shown < filtered.length;

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

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_280px]">
        {/* 主列：搜索 + 列表 */}
        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE);
              }}
              placeholder="搜索标题、正文或标签…"
              className="ios-input flex-1"
            />
            {(query || cat) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCat(null);
                  setShown(PAGE);
                }}
                className="border border-line px-4 py-2.5 font-mono text-xs text-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                清除筛选
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="cyber-card p-10 text-center font-mono text-sm text-muted">
              没有匹配的文章
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6">
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
                      <article className="cyber-card flex h-full flex-col overflow-hidden p-0 transition-transform duration-300 hover:-translate-y-1">
                        {post.cover && (
                          <div className="overflow-hidden border-b border-line">
                            <img
                              src={post.cover}
                              alt={`${post.title} 封面图`}
                              loading="lazy"
                              className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-6">
                          <div className="mb-3 flex items-center gap-2 font-mono text-xs text-muted">
                            <time dateTime={post.date}>{post.date}</time>
                            <span aria-hidden="true">·</span>
                            <span>{minutes} 分钟阅读</span>
                          </div>

                          <h3 className="break-words font-display text-2xl font-bold text-slate-100 transition-colors group-hover:text-cyan">
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
                        </div>
                      </article>
                    </a>
                  );
                })}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShown((n) => n + PAGE)}
                    className="btn-neon"
                  >
                    加载更多（还剩 {filtered.length - shown} 篇）
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 侧栏：分类 + 最新 */}
        <aside className="space-y-8">
          <div className="cyber-card p-5">
            <h3 className="section-label mb-3">分类</h3>
            {categories.length === 0 ? (
              <p className="font-mono text-xs text-muted">暂无分类</p>
            ) : (
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setCat(null);
                      setShown(PAGE);
                    }}
                    className={
                      'flex w-full items-center justify-between font-mono text-xs transition-colors ' +
                      (cat === null ? 'text-cyan' : 'text-muted hover:text-cyan')
                    }
                  >
                    <span>全部</span>
                    <span>{all.length}</span>
                  </button>
                </li>
                {categories.map(([name, count]) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => {
                        setCat(name);
                        setShown(PAGE);
                      }}
                      className={
                        'flex w-full items-center justify-between font-mono text-xs transition-colors ' +
                        (cat === name ? 'text-cyan' : 'text-muted hover:text-cyan')
                      }
                    >
                      <span>{name}</span>
                      <span>{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cyber-card p-5">
            <h3 className="section-label mb-3">最新文章</h3>
            <ul className="space-y-3">
              {all.slice(0, 5).map((p) => (
                <li key={p.id}>
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
        </aside>
      </div>
    </section>
  );
}
