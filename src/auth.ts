import { ADMIN_SESSION_KEY } from './types';

/**
 * 后台口令校验。
 *
 * 【本地阶段】口令哈希存于站点数据，校验在浏览器完成。
 *   这能防止「随手点开后台就改内容」，但技术上懂行的人可绕过
 *   （前端鉴权的固有局限）。真正的防护在云端阶段。
 *
 * 【云端阶段】改为 POST /api/login，由 Pages Functions 校验并下发
 *   HttpOnly Cookie，内容写入接口一律校验该 Cookie。届时前端
 *   绕过也无法写入数据。
 */

const SALT = 'cyber-portfolio-v2';

/** SHA-256 加盐哈希，返回十六进制字符串 */
export async function hashPass(pass: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + pass);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPass(pass: string, hash: string): Promise<boolean> {
  if (!hash) return true; // 未设置口令时不拦截
  return (await hashPass(pass)) === hash;
}

/** 会话存于 sessionStorage：关闭标签页即失效 */
export function markLoggedIn(): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
}

export function isLoggedIn(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function logout(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
