interface Env {
  portfolio_content: D1Database;
}

const BASE = 'https://www.otscup.com';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  let posts: { slug: string; updated_at?: number }[] = [];
  try {
    const r = await env.portfolio_content
      .prepare('SELECT data FROM site WHERE id = ?')
      .bind('1')
      .first<{ data: string }>();
    if (r?.data) {
      const parsed = JSON.parse(r.data) as { posts?: { slug: string; updated_at?: number; published?: boolean }[] };
      posts = (parsed.posts || []).filter((p) => p.published !== false);
    }
  } catch {
    posts = [];
  }

  const now = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];
  // 首页
  urls.push(
    `  <url><loc>${BASE}/</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  );
  // 博客列表
  urls.push(
    `  <url><loc>${BASE}/blog</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
  );
  // 各博客文章（干净 URL，利于 Google 收录）
  for (const p of posts) {
    const lm = p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : now;
    urls.push(
      `  <url><loc>${BASE}/blog/${encodeURIComponent(p.slug)}</loc><lastmod>${lm}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
