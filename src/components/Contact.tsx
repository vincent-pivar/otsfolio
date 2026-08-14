import { useSite } from '../hooks/useSite';

export default function Contact() {
  const { profile, socials } = useSite();
  // 只显示已填写链接的平台
  const active = socials.filter((s) => s.href.trim() !== '');

  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 py-24">
      <p className="section-label">// 建立连接</p>
      <h2 className="font-display text-3xl font-bold text-slate-100 sm:text-4xl">
        有项目想聊聊？<span className="text-cyan neon-text">随时找我</span>
      </h2>
      <p className="mt-4 max-w-lg font-body text-muted">
        无论是移动端开发、Web 全栈还是 AI 应用集成，欢迎直接联系。
      </p>

      {/* 邮箱：主联系方式 */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {profile.contacts.map((c) => (
          <a key={c.label} href={c.href!} className="cyber-card group block p-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-magenta">
              {c.label}
            </span>
            <span className="mt-2 block break-all font-body text-lg font-semibold text-slate-100 transition-colors group-hover:text-cyan">
              {c.value}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted">
              点击发送邮件
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
        ))}
      </div>

      {/* 社交平台：仅在填写了链接时显示 */}
      {active.length > 0 && (
        <div className="mt-8">
          <p className="font-mono text-xs tracking-[0.25em] text-muted uppercase">
            其他平台
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            {active.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.name}
                className="cyber-card group flex items-center gap-3 px-5 py-4"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 fill-cyan transition-colors group-hover:fill-magenta"
                >
                  <path d={s.icon} />
                </svg>
                <span className="text-left">
                  <span className="block font-display text-sm font-bold text-slate-100">
                    {s.name}
                  </span>
                  <span className="block font-mono text-xs text-muted">{s.handle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
