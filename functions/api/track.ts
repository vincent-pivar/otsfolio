interface Env {
  portfolio_content: D1Database;
}

/**
 * 访问统计埋点接收端。
 * POST /api/track  body: { slug, action: 'view'|'read', duration? }
 *  - 仅记录已发布文章（slug 非空）
 *  - IP 仅取国家代码(CF-IPCountry) + IP 哈希(不存明文)
 *  - 按 ip_hash + slug + day 去重，避免刷新刷量
 * GET  /api/track  -> 聚合统计（需管理员哈希）
 */
const SALT = 'cyber-portfolio-v2';

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function dayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 确保表存在
  await env.portfolio_content
    .prepare(
      `CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        action TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        country TEXT DEFAULT 'XX',
        ip_hash TEXT NOT NULL,
        day TEXT NOT NULL,
        ts INTEGER NOT NULL
      )`,
    )
    .run()
    .catch(() => {});

  if (method === 'POST' && url.pathname === '/api/track') {
    let body: { slug?: string; action?: string; duration?: number };
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: '格式错误' }, 400);
    }
    const slug = (body.slug || '').trim();
    const action = body.action === 'read' ? 'read' : 'view';
    if (!slug) return json({ ok: false, error: '缺少 slug' }, 400);

    const country = (request.headers.get('cf-ipcountry') || 'XX').toUpperCase().slice(0, 2);
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '0.0.0.0';
    const ipHash = await sha256(ip + slug + dayStr());

    // 去重：同 ip+slug+day 只记一次 view
    if (action === 'view') {
      const exist = await env.portfolio_content
        .prepare('SELECT 1 FROM analytics WHERE ip_hash = ? AND action = ? LIMIT 1')
        .bind(ipHash, 'view')
        .first();
      if (exist) return json({ ok: true, dedup: true });
    }

    await env.portfolio_content
      .prepare(
        'INSERT INTO analytics (slug, action, duration, country, ip_hash, day, ts) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(slug, action, Math.max(0, Math.min(86400, body.duration || 0)), country, ipHash, dayStr(), Date.now())
      .run();
    return json({ ok: true });
  }

  if (method === 'GET' && url.pathname === '/api/track') {
    // 鉴权
    const raw = await readSite(env);
    const h = request.headers.get('x-admin-hash');
    const stored = raw ? (JSON.parse(raw) as any)?.settings?.adminPassHash : '';
    if (!h || !stored || h !== stored) return json({ ok: false, error: '未授权' }, 401);

    const since = url.searchParams.get('since');
    const sinceClause = since ? 'AND day >= ?' : '';
    const params: any[] = since ? [since] : [];

    // 总访问（view 事件数）
    const totalViews = (
      await env.portfolio_content
        .prepare(`SELECT COUNT(*) c FROM analytics WHERE action='view' ${sinceClause}`)
        .bind(...params)
        .first<{ c: number }>()
    )?.c || 0;

    // 每篇文章阅读次数 + 平均时长
    const perPost = await env.portfolio_content
      .prepare(
        `SELECT slug,
                COUNT(CASE WHEN action='view' THEN 1 END) views,
                COUNT(CASE WHEN action='read' THEN 1 END) reads,
                COALESCE(AVG(CASE WHEN action='read' THEN duration END), 0) avg_duration
         FROM analytics WHERE 1=1 ${sinceClause} GROUP BY slug ORDER BY views DESC`,
      )
      .bind(...params)
      .all<{ slug: string; views: number; reads: number; avg_duration: number }>();

    // 国家占比
    const byCountry = await env.portfolio_content
      .prepare(
        `SELECT country, COUNT(*) c FROM analytics WHERE action='view' ${sinceClause} GROUP BY country ORDER BY c DESC`,
      )
      .bind(...params)
      .all<{ country: string; c: number }>();

    // 每日趋势（近 14 天）
    const daily = await env.portfolio_content
      .prepare(
        `SELECT day, COUNT(CASE WHEN action='view' THEN 1 END) views,
                COUNT(CASE WHEN action='read' THEN 1 END) reads
         FROM analytics WHERE 1=1 ${sinceClause} GROUP BY day ORDER BY day DESC LIMIT 14`,
      )
      .bind(...params)
      .all<{ day: string; views: number; reads: number }>();

    return json({
      ok: true,
      totalViews,
      perPost: perPost.results,
      byCountry: byCountry.results,
      daily: daily.results.reverse(),
    });
  }

  return json({ ok: false, error: 'not found' }, 404);
};

async function readSite(env: Env): Promise<string | null> {
  const r = await env.portfolio_content.prepare('SELECT data FROM site WHERE id = ?').bind('1').first<{ data: string }>();
  return r?.data ?? null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
