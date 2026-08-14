import { useSite } from '../hooks/useSite';
import { renderMarkdown, readingTime } from '../markdown';

export default function BlogPost({ slug }: { slug: string }) {
  const { posts } = useSite();
  const published = posts
    .filter((p) => p.published)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

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

  return (
    <article className="mx-auto max-w-3xl px-6 py-24">
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
        {post.tags.map((tag) => (
          <span key={tag} className="border border-line px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <h1 className="mt-4 break-words font-display text-3xl font-bold text-slate-100 sm:text-4xl">
        {post.title}
      </h1>

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
        className="mt-8"
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
                <span className="font-mono text-xs text-muted">上一篇</span>
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
                <span className="font-mono text-xs text-muted">下一篇</span>
                <span className="mt-1 block break-words text-sm text-slate-200 transition-colors group-hover:text-cyan">
                  {newer.title}
                </span>
              </a>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}
