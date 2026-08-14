import { skills } from '../content';

export default function Skills() {
  return (
    <section id="skills" className="mx-auto max-w-6xl px-6 py-24">
      <p className="section-label">// 技术栈</p>
      <h2 className="font-display text-3xl font-bold text-slate-100 sm:text-4xl">
        能力<span className="text-magenta">矩阵</span>
      </h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((s, i) => (
          <div key={s.group} className="cyber-card group p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-bold tracking-wide text-cyan">
                {s.group}
              </h3>
              <span className="font-mono text-[10px] text-muted">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <span className="mt-3 block h-px w-full bg-gradient-to-r from-cyan/60 to-transparent" />
            <ul className="mt-4 space-y-2">
              {s.items.map((it) => (
                <li key={it} className="flex items-center gap-2 font-body text-sm text-slate-300">
                  <span className="h-1.5 w-1.5 shrink-0 bg-magenta" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
