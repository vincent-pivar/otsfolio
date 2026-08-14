import { useSite } from '../hooks/useSite';

export default function Timeline() {
  const { timeline } = useSite();
  return (
    <section id="timeline" className="mx-auto max-w-6xl px-6 py-24">
      <p className="section-label">// 技术历程</p>
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        <span className="text-slate-100">成长</span>
        <span className="text-cyan neon-text">轨迹</span>
      </h2>

      <p className="mt-4 max-w-xl font-body text-sm text-muted">
        从原生图形引擎到边缘全栈，每一步都留下可验证的产出。
      </p>

      <ol className="relative mt-12 list-none">
        {/* vertical connector line */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-cyan via-magenta to-transparent"
        />

        {timeline.map((item) => (
          <li key={item.title} className="relative mb-8 pl-10 last:mb-0 sm:pl-12">
            {/* node dot */}
            {item.current ? (
              <span className="absolute left-0 top-4 h-4 w-4 -translate-x-1/2">
                <span className="absolute inset-0 rounded-full bg-cyan/40 animate-ping" />
                <span className="absolute inset-0 rounded-full bg-cyan shadow-neon" />
              </span>
            ) : (
              <span className="absolute left-0 top-4 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-cyan/60 bg-line" />
            )}

            {/* card */}
            <div
              className={`cyber-card p-5 transition-all duration-300 hover:-translate-y-0.5 ${
                item.current ? 'border-cyan/40' : ''
              }`}
            >
              <p className="font-mono text-xs text-magenta">{item.period}</p>
              <h3 className="mt-1 font-display text-lg text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.desc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-line px-2 py-0.5 font-mono text-xs text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
