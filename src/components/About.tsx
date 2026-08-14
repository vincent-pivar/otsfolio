import { useSite } from '../hooks/useSite';

const stats = [
  { value: '2+', label: '上线 / 在研项目' },
  { value: '4', label: '技术领域' },
  { value: '100%', label: '独立交付' },
];

export default function About() {
  const { profile } = useSite();
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24">
      <p className="section-label">// 关于我</p>
      <h2 className="font-display text-3xl font-bold text-slate-100 sm:text-4xl">
        把需求做成<span className="text-cyan neon-text">能用的东西</span>
      </h2>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {/* 主介绍卡 */}
        <div className="cyber-card p-7 md:col-span-2">
          <p className="font-mono text-xs tracking-widest text-magenta">PROFILE</p>
          <p className="mt-4 font-body text-base leading-relaxed text-slate-300">
            {profile.intro}
          </p>
          <p className="mt-4 font-body text-base leading-relaxed text-muted">
            工作方式偏向「先定架构再动手」：把复杂问题拆成可验证的小块，每一步都跑通再往下走。
            遇到问题优先做根因分析，而不是叠补丁。
          </p>
        </div>

        {/* 数据卡 */}
        <div className="grid gap-6">
          {stats.map((s) => (
            <div key={s.label} className="cyber-card flex flex-col justify-center p-6">
              <span className="font-display text-3xl font-black text-cyan neon-text">
                {s.value}
              </span>
              <span className="mt-1 font-mono text-xs tracking-wider text-muted">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
