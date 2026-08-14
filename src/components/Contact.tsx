import { profile } from '../content';

export default function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 py-24">
      <p className="section-label">// 建立连接</p>
      <h2 className="font-display text-3xl font-bold text-slate-100 sm:text-4xl">
        有项目想聊聊？<span className="text-cyan neon-text">随时找我</span>
      </h2>
      <p className="mt-4 max-w-lg font-body text-muted">
        无论是移动端开发、Web 全栈还是 AI 应用集成，欢迎直接联系。
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {profile.contacts.map((c) => {
          const inner = (
            <>
              <span className="font-mono text-[10px] tracking-[0.25em] text-magenta uppercase">
                {c.label}
              </span>
              <span className="mt-2 block break-all font-body text-base font-semibold text-slate-100 transition-colors group-hover:text-cyan">
                {c.value}
              </span>
            </>
          );

          return c.href ? (
            <a key={c.label} href={c.href} className="cyber-card group block p-6">
              {inner}
            </a>
          ) : (
            <div key={c.label} className="cyber-card group p-6">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
