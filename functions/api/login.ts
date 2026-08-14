interface Env {
  TURNSTILE_SECRET: string;
  portfolio_content: D1Database;
}

/**
 * 后台登录校验。
 * - 口令：前端传 SHA-256(加盐) 哈希，与 D1 中 settings.adminPassHash 比对
 *   （与 content.ts 写接口共用同一数据源，不依赖 wrangler secret，避免本机注入失败导致鉴权失效）
 * - Turnstile：仅当配置了 TURNSTILE_SECRET 时才强制验证；否则跳过（防止国内网络加载不出 widget 时把自己挡在门外）
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  let body: { pass?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: '请求格式错误' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const pass = body.pass ?? '';

  // Turnstile 验证（仅在配置了私钥时才强制；未配置则放行，避免网络问题卡死登录）
  if (env.TURNSTILE_SECRET) {
    const token = body.token ?? '';
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: '请先完成真人验证' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const fd = new FormData();
    fd.set('secret', env.TURNSTILE_SECRET);
    fd.set('response', token);
    fd.set('remoteip', request.headers.get('CF-Connecting-IP') ?? '');
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: fd,
    });
    const result = (await r.json()) as { success: boolean };
    if (!result.success) {
      return new Response(JSON.stringify({ ok: false, error: '真人验证失败' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  // 口令校验：前端已传 SHA-256(加盐) 哈希，与 D1 中 settings.adminPassHash 直接比对
  const stored = await readPassHash(env);
  if (!stored) {
    // 后台未设口令：放行（首次设置）
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    });
  }
  if (pass !== stored) {
    return new Response(JSON.stringify({ ok: false, error: '口令不正确' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
};

async function readPassHash(env: Env): Promise<string> {
  try {
    const r = await env.portfolio_content
      .prepare('SELECT data FROM site WHERE id = ?')
      .bind('1')
      .first<{ data: string }>();
    if (!r?.data) return '';
    const data = JSON.parse(r.data) as { settings?: { adminPassHash?: string } };
    return data.settings?.adminPassHash ?? '';
  } catch {
    return '';
  }
}

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode('cyber-portfolio-v2' + s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
