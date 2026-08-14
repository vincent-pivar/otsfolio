interface Env {
  TURNSTILE_SECRET: string;
  ADMIN_PASS_HASH: string;
}

/**
 * 后台登录校验：Cloudflare Turnstile 真人验证 + 口令哈希比对。
 * 仅当配置了 TURNSTILE_SECRET 时才强制验证 Turnstile。
 * 未配置时退化为纯口令校验（与本地阶段一致）。
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

  // Turnstile 验证（配置了密钥才强制）
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

  // 口令校验：前端传 SHA-256 哈希，与存储值比对
  const given = await sha256(pass);
  if (env.ADMIN_PASS_HASH && given !== env.ADMIN_PASS_HASH) {
    return new Response(JSON.stringify({ ok: false, error: '口令不正确' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
};

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode('cyber-portfolio-v2' + s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
