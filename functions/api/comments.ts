interface Env {
  portfolio_content: D1Database;
}

const SALT = 'cyber-portfolio-v2';

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** 服务端轻量净化：去除脚本/事件属性，限制长度 */
function sanitizeText(s: string, max = 2000): string {
  return s
    .replace(/<\s*script[\s\S]*?<\/script>/gi, '')
    .replace(/<\s*\/\s*script\s*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, max);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 确保表存在
  await env.portfolio_content
    .prepare(
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved'
      )`,
    )
    .run()
    .catch(() => {});

  // 读取某篇文章的评论（按时间升序）
  if (method === 'GET' && url.pathname === '/api/comments') {
    const slug = (url.searchParams.get('slug') || '').trim();
    if (!slug) return json({ ok: false, error: '缺少 slug' }, 400);
    const rows = await env.portfolio_content
      .prepare(
        'SELECT id, slug, name, body, created_at FROM comments WHERE slug = ? AND status = ? ORDER BY created_at ASC',
      )
      .bind(slug, 'approved')
      .all<{ id: number; slug: string; name: string; body: string; created_at: number }>();
    return json({ ok: true, comments: rows.results });
  }

  // 提交评论
  if (method === 'POST' && url.pathname === '/api/comments') {
    let body: { slug?: string; name?: string; body?: string };
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: '格式错误' }, 400);
    }
    const slug = (body.slug || '').trim();
    const name = sanitizeText(body.name || '', 40) || '匿名访客';
    const text = sanitizeText(body.body || '', 2000);
    if (!slug) return json({ ok: false, error: '缺少 slug' }, 400);
    if (text.length < 1) return json({ ok: false, error: '评论内容不能为空' }, 400);

    // 简单频率限制：同 IP 10 秒内只能发 1 条
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '0.0.0.0';
    const ipHash = await sha256(ip + dayStr());
    const recent = await env.portfolio_content
      .prepare('SELECT 1 FROM comments WHERE slug = ? AND status = ? ORDER BY created_at DESC LIMIT 1')
      .bind(slug, 'approved')
      .first();
    // 用 ip_hash + 近 10s 窗口粗限（复用 analytics 表无妨，这里直接按 comments 时间判断）
    const last = await env.portfolio_content
      .prepare('SELECT created_at FROM comments WHERE status=? ORDER BY created_at DESC LIMIT 1')
      .bind('approved')
      .first<{ created_at: number }>();
    if (last && Date.now() - last.created_at < 10000) {
      // 全局 10s 限流（避免刷屏），不区分 IP 也足够本站规模
      return json({ ok: false, error: '太快了，稍等几秒再发' }, 429);
    }

    const now = Date.now();
    const r = await env.portfolio_content
      .prepare('INSERT INTO comments (slug, name, body, created_at, status) VALUES (?, ?, ?, ?, ?)')
      .bind(slug, name, text, now, 'approved')
      .run();
    const id = (r.meta as any)?.last_row_id ?? null;
    return json({ ok: true, comment: { id, slug, name, body: text, created_at: now } });
  }

  return json({ ok: false, error: 'not found' }, 404);
};

function dayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
