interface Env {
  portfolio_content: D1Database;
  portfolio_assets: R2Bucket;
  ADMIN_PASS_HASH: string;
}

const SALT = 'cyber-portfolio-v2';

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 从 D1 读取整份站点数据（单行列式存储） */
async function readContent(env: Env): Promise<string | null> {
  const r = await env.portfolio_content
    .prepare('SELECT data FROM site WHERE id = ?')
    .bind('1')
    .first<{ data: string }>();
  return r?.data ?? null;
}

/** 写入整份站点数据（upsert） */
async function writeContent(env: Env, data: string): Promise<void> {
  await env.portfolio_content
    .prepare(
      'INSERT INTO site (id, data, updated_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
    )
    .bind('1', data, Date.now())
    .run();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

/** 校验管理员口令：前端传 SHA-256(pass) 哈希，与存储哈希比对 */
async function authOk(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_PASS_HASH) return true; // 未设口令时不拦（首次）
  const h = request.headers.get('x-admin-hash');
  if (!h) return false;
  return h === env.ADMIN_PASS_HASH;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // 确保表存在
  if (method === 'GET' || method === 'PUT' || method === 'POST') {
    await env.portfolio_content
      .prepare(
        'CREATE TABLE IF NOT EXISTS site (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)',
      )
      .run()
      .catch(() => {});
  }

  // 封面图上传 → R2
  if (url.pathname === '/api/upload' && method === 'POST') {
    if (!(await authOk(request, env))) {
      return json({ ok: false, error: '未授权' }, 401);
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ ok: false, error: '缺少文件' }, 400);
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    await env.portfolio_assets.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'image/png' },
    });
    return json({ ok: true, url: `/api/assets/${key}` });
  }

  // 读取 R2 资源
  if (url.pathname.startsWith('/api/assets/') && method === 'GET') {
    const key = url.pathname.slice('/api/assets/'.length);
    const obj = await env.portfolio_assets.get(key);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // 站点内容
  if (url.pathname === '/api/content') {
    if (method === 'GET') {
      const data = await readContent(env);
      if (!data) return json({ ok: true, data: null });
      return json({ ok: true, data: JSON.parse(data) });
    }
    if (method === 'PUT') {
      if (!(await authOk(request, env))) {
        return json({ ok: false, error: '未授权' }, 401);
      }
      let payload: { data?: unknown };
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: '格式错误' }, 400);
      }
      if (!payload.data || typeof payload.data !== 'object') {
        return json({ ok: false, error: '缺少 data' }, 400);
      }
      await writeContent(env, JSON.stringify(payload.data));
      return json({ ok: true });
    }
  }

  return json({ ok: false, error: 'not found' }, 404);
};
