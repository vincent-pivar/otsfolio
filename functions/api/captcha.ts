interface Env {
  portfolio_content: D1Database;
}

const SALT = 'cyber-portfolio-v2';

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 易辨认字符集（去掉 0/O/1/l/I）
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randCode(len = 4): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

/** 生成 SVG 验证码图片（纯文本，无需 canvas 依赖） */
function svgCaptcha(code: string): string {
  const w = 140, h = 48;
  const colors = ['#00f0ff', '#ff00a0', '#c8ff00', '#8a8aae'];
  let paths = '';
  for (let i = 0; i < 4; i++) {
    const c = colors[i % colors.length];
    const y1 = 5 + Math.floor(Math.random() * (h - 10));
    const y2 = 5 + Math.floor(Math.random() * (h - 10));
    paths += `<path d="M0 ${y1} Q ${w / 2} ${y1 + (Math.random() * 20 - 10)} ${w} ${y2}" stroke="${c}" stroke-width="1" fill="none" opacity="0.35"/>`;
  }
  let texts = '';
  const n = code.length;
  for (let i = 0; i < n; i++) {
    const c = colors[i % colors.length];
    const x = 18 + i * (w - 36) / n;
    const y = 30 + Math.floor(Math.random() * 8 - 4);
    const rot = Math.floor(Math.random() * 30 - 15);
    texts += `<text x="${x}" y="${y}" font-family="monospace" font-size="26" fill="${c}" transform="rotate(${rot} ${x} ${y})" font-weight="bold">${code[i]}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#0d0d1a"/>${paths}${texts}</svg>`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }
  await env.portfolio_content
    .prepare(
      `CREATE TABLE IF NOT EXISTS captcha (
        token TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires INTEGER NOT NULL
      )`,
    )
    .run()
    .catch(() => {});

  const code = randCode(4);
  const token = await sha256(Math.random().toString(36) + Date.now());
  const expires = Date.now() + 5 * 60 * 1000; // 5 分钟
  await env.portfolio_content
    .prepare('INSERT OR REPLACE INTO captcha (token, code, expires) VALUES (?, ?, ?)')
    .bind(token, code, expires)
    .run();
  const svg = svgCaptcha(code);
  return new Response(
    JSON.stringify({ ok: true, token, svg: 'data:image/svg+xml;base64,' + btoa(svg) }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  );
};
