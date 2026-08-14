import { useState, useRef, useEffect } from 'react';
import { verifyPass, markLoggedIn, hashPass } from '../auth';
import { loadSite, saveSite } from '../store';

type LoginMode = 'local' | 'cloud';

/**
 * 后台登录闸门。
 * - 未设置口令：提示先设置（仍在本地）
 * - 已设置口令：校验
 *   若配置了 Turnstile 站点密钥，则渲染真人验证 widget，并把口令+token 发到
 *   /api/login（Pages Function）做服务端校验；否则沿用本地 SHA-256 校验。
 */
export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const site = loadSite();
  const hasPass = site.settings.adminPassHash !== '';
  const turnstileKey = site.settings.turnstileSiteKey ?? '';
  // 登录主校验走本地 D1 口令哈希（与云端写接口同源），稳定且不受网络影响。
  // Turnstile 仅作可选展示（若配置了站点密钥），不阻塞登录。
  const mode: LoginMode = 'local';

  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // 挂载 Turnstile widget（配置了站点密钥时，作为可选展示，不阻塞登录）
  useEffect(() => {
    if (!turnstileKey || !widgetRef.current) return;
    if (widgetRef.current.querySelector('script')) return;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const w = (window as unknown as { turnstile?: any }).turnstile;
      if (!w || !widgetRef.current) return;
      w.render(widgetRef.current, {
        sitekey: turnstileKey,
        callback: (t: string) => setToken(t),
        'expired-callback': () => setToken(''),
      });
    };
    document.body.appendChild(s);
  }, [mode, turnstileKey]);

  const doLogin = async () => {
    setBusy(true);
    setError('');
    try {
      // 本地比对 D1 口令哈希（与云端写接口同源）。云端写入接口另有 D1 哈希二次校验。
      const ok = await verifyPass(pass, site.settings.adminPassHash);
      if (!ok) setError('口令不正确');
      if (ok) {
        markLoggedIn();
        onSuccess();
      }
    } catch {
      setError('校验失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = () => void doLogin();

  const handleSetup = async () => {
    if (pass.length < 6) {
      setError('口令至少 6 位');
      return;
    }
    if (pass !== confirm) {
      setError('两次输入不一致');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const hash = await hashPass(pass);
      saveSite({ ...site, settings: { ...site.settings, adminPassHash: hash } });
      markLoggedIn();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : '设置失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="section-label">// 访问控制</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">
          {hasPass ? (
            <>
              后台<span className="text-cyan neon-text">登录</span>
            </>
          ) : (
            <>
              设置<span className="text-cyan neon-text">访问口令</span>
            </>
          )}
        </h1>

        {!hasPass && (
          <p className="mt-3 font-body text-sm text-muted">
            首次进入后台，请先设置口令，之后修改内容都需要验证。
          </p>
        )}

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (hasPass) void handleLogin();
            else void handleSetup();
          }}
        >
          <div>
            <label
              htmlFor="admin-pass"
              className="mb-1.5 block font-mono text-xs tracking-wider text-muted"
            >
              {hasPass ? '访问口令' : '设置口令（至少 6 位）'}
            </label>
            <input
              id="admin-pass"
              type="password"
              autoComplete={hasPass ? 'current-password' : 'new-password'}
              autoFocus
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="ios-input"
            />
          </div>

          {!hasPass && (
            <div>
              <label
                htmlFor="admin-pass2"
                className="mb-1.5 block font-mono text-xs tracking-wider text-muted"
              >
                再次输入
              </label>
              <input
                id="admin-pass2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="ios-input"
              />
            </div>
          )}

          {turnstileKey && hasPass && (
            <div ref={widgetRef} className="min-h-[65px]" aria-label="真人验证（可选）" />
          )}

          {error && (
            <p role="alert" className="font-mono text-xs text-magenta">
              ⚠ {error}
            </p>
          )}

          <button type="submit" disabled={busy || !pass} className="btn-neon w-full">
            {busy ? '处理中…' : hasPass ? '进入后台' : '设置并进入'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between font-mono text-xs">
          <a href="#/" className="text-muted transition-colors hover:text-cyan">
            ← 返回前台
          </a>
          {hasPass && (
            <span className="text-line">忘记口令？清除浏览器数据即重置</span>
          )}
        </div>
      </div>
    </div>
  );
}
