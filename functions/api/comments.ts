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

/** 服务端轻量净化 */
function sanitizeText(s: string, max = 2000): string {
  return s;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

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

  // 读取评论
  if (method === 'GET' && url.pathname === '/api/comments') {
    const slug = (url.searchParams.get('slug') || '').trim();
    if (!slug) return json({ ok: false, error: '缺少 slug' }, 400);
    const rows = await env.portfolio_content
      .prepare('SELECT id, slug, name, body, created_at FROM comments WHERE slug = ? AND status = ? ORDER BY created_at ASC')
      .bind(slug, 'approved')
      .all<{ id: number; slug: string; name: string; body: string; created_at: number }>();
    return json({ ok: true, comments: rows.results });
  }

  // 提交评论（带验证码）
  if (method === 'POST' && url.pathname === '/api/comments') {
    let body: { slug?: string; name?: string; body?: string; captchaToken?: string; captcha?: string };
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: '格式错误' }, 400);
    }
    const slug = (body.slug || '').trim();
    const name = sanitizeText(body.name || '', 40) || '匿名访客';
    const text = sanitizeText(body.body || '', 2000);
    const token = (body.captchaToken || '').trim();
    const code = (body.captcha || '').trim().toUpperCase();

    if (!slug) return json({ ok: false, error: '缺少 slug' }, 400);
    if (text.length < 1) return json({ ok: false, error: '评论内容不能为空' }, 400);
    if (!token || !code) return json({ ok: false, error: '请填写验证码' }, 400);

    // 校验验证码（从 D1 captcha 表）
    const cap = await env.portfolio_content
      .prepare('SELECT code, expires FROM captcha WHERE token = ?')
      .bind(token)
      .first<{ code: string; expires: number }>();
    if (!cap) return json({ ok: false, error: '验证码已失效，请刷新' }, 400);
    if (cap.expires < Date.now()) return json({ ok: false, error: '验证码已过期，请刷新' }, 400);
    if (cap.code !== code) return json({ ok: false, error: '验证码错误' }, 400);
    await env.portfolio_content.prepare('DELETE FROM captcha WHERE token = ?').bind(token).run(); // 用完即删

    // 10 秒限流
    const last = await env.portfolio_content
      .prepare('SELECT created_at FROM comments WHERE status=? ORDER BY created_at DESC LIMIT 1')
      .bind('approved')
      .first<{ created_at: number }>();
    if (last && Date.now() - last.created_at < 10000) {
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
