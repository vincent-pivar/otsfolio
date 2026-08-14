import type { SiteData } from './types';
import { SITE_VERSION } from './types';
import { profile, socials, projects, timeline, skills } from './content';

/** 生成一张赛博风封面图（内联 SVG → data URI，不依赖网络） */
function cover(title: string, sub: string, c1: string, c2: string): string {
  const lines = Array.from({ length: 15 }, (_, i) => {
    const x = i * 80;
    const y = i * 40;
    return `<line x1="${x}" y1="0" x2="${x}" y2="600" stroke="${c1}" stroke-width="1.5" opacity="0.22"/>` +
           `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="${c1}" stroke-width="1.5" opacity="0.22"/>`;
  }).join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">` +
      `<rect width="1200" height="600" fill="#07070f"/>` +
      lines +
      `<circle cx="1000" cy="150" r="160" fill="none" stroke="${c2}" stroke-width="3" opacity="0.7"/>` +
      `<circle cx="1000" cy="150" r="80" fill="${c1}" opacity="0.22"/>` +
      `<rect x="70" y="200" width="640" height="200" rx="6" fill="none" stroke="${c1}" stroke-width="2.5" opacity="0.75"/>` +
      `<text x="100" y="300" font-family="monospace" font-size="76" font-weight="bold" fill="#e2e8f0">${title}</text>` +
      `<text x="100" y="360" font-family="monospace" font-size="34" fill="${c1}">${sub}</text>` +
      `<text x="100" y="545" font-family="monospace" font-size="26" fill="${c2}">// VINCENT</text>` +
    `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const coverA = cover('Canvas', '原生标注引擎', '#00f0ff', '#ff00a0');
const coverB = cover('AI Failover', '多模型容错', '#ff00a0', '#00f0ff');

/** 首次访问或数据损坏时使用的初始内容，来源于 content.ts */
export const defaultSite: SiteData = {
  version: SITE_VERSION,
  profile: {
    name: profile.name,
    title: profile.title,
    tagline: profile.tagline,
    intro: profile.intro,
    contacts: profile.contacts.map((c) => ({
      label: c.label,
      value: c.value,
      href: c.href ?? '',
    })),
  },
  socials: socials.map((s) => ({ ...s })),
  projects: projects.map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name,
    subtitle: p.subtitle,
    desc: p.desc,
    tags: [...p.tags],
    highlights: [...p.highlights],
    link: p.link,
    status: p.status,
    accent: p.accent,
  })),
  timeline: timeline.map((t, i) => ({
    id: `t${i + 1}`,
    period: t.period,
    title: t.title,
    desc: t.desc,
    tags: [...t.tags],
    current: t.current,
  })),
  skills: skills.map((s, i) => ({
    id: `s${i + 1}`,
    group: s.group,
    items: [...s.items],
  })),
  posts: [
    {
      id: 'w1',
      slug: 'native-canvas-over-webview',
      title: '为什么我把 WebView 方案换成了原生 Canvas',
      excerpt:
        '做量尺宝的标注功能时，我先用 WebView 走了一段弯路。dpr 缩放与触摸事件的不可靠，最终逼我回到 Kotlin 原生 Canvas。',
      cover: coverA,
      body: `做「乡墅通量尺宝」的图形标注时，我最初选了 WebView 方案——毕竟 Web 技术栈熟，画布库现成，迭代快。

结果踩了两个坑，最后不得不整体重写。

![技术选型对比](${coverA})

## 坑一：dpr 缩放不可靠

不同设备的 \`devicePixelRatio\` 表现不一致，导致标注坐标在高分屏上偏移。我尝试过手动补偿：

\`\`\`kotlin
val scale = resources.displayMetrics.density
canvas.scale(scale, scale)
\`\`\`

但 WebView 内部还有自己的一层缩放，两层叠加后误差会累积。测量工具最忌讳的就是坐标不准。

## 坑二：触摸事件丢失

多指手势在 WebView 里偶发丢事件，尤其是快速缩放时。这在测量场景下是致命的——用户以为标好了，实际偏了几个像素。

> 工具类应用的核心是可信。一旦用户不信你的测量结果，功能再多也没意义。

## 换成原生 Canvas

最终用 Kotlin 重写，自己实现 Matrix 手势系统：

- 坐标变换全程自己掌控，无隐藏缩放层
- \`onTouchEvent\` 直接拿原始事件，不丢帧
- 性能反而更好，复杂图形也不卡

代价是开发量翻倍，手势逻辑得自己写。但换来的是**可预测的行为**——这在工具类应用里值得。

## 教训

技术选型要看**核心指标**能不能保住。快速迭代很重要，但如果方案在核心指标上有不确定性，早换比晚换便宜。`,
      tags: ['Android', 'Canvas', '技术选型'],
      date: '2026-07-20',
      published: true,
    },
    {
      id: 'w2',
      slug: 'multi-model-failover',
      title: 'AI 出题的多模型 failover：别让单点故障毁掉体验',
      excerpt:
        '答题挑战接入大模型自动出题后，我遇到的第一个问题不是质量，而是稳定性。推理模型返回 content=null 让我踩了一跤。',
      cover: coverB,
      body: `给「答题挑战」接 AI 出题时，我以为难点在提示词，实际难点在**稳定性**。

![多模型回退架构](${coverB})

## 第一次踩坑：content 是 null

我最初选了一个推理型模型，本地测试没问题，上线后偶发返回空内容。排查发现推理模型会把内容放在 \`reasoning\` 字段，\`content\` 直接是 \`null\`：

\`\`\`js
const content = data.choices[0].message.content; // null
\`\`\`

## 解法：模型白名单 + 逐级回退

我改成维护一个候选列表，逐个尝试直到成功：

1. 首选快速指令模型
2. 失败则换备用模型
3. 全部失败则回退到本地题库

关键是**每一层都要真的能兜住**，而不是层层抛错。

## 部署在 Cloudflare 的额外好处

Pages Functions 天然分布式，出题请求就近处理。零服务器成本，免费额度对个人项目完全够用。

> 免费不是重点，重点是不用管运维。

## 小结

接入 AI 的工程量，八成在容错而非调用本身。`,
      tags: ['AI 集成', 'Cloudflare', '容错设计'],
      date: '2026-08-02',
      published: true,
    },
  ],
  settings: {
    siteTitle: 'Vincent — 全栈开发者 / 作品集',
    siteDescription:
      '全栈开发者 Vincent 的作品集与技术博客。移动端原生、Web 全栈、AI 应用集成。',
    // 空值表示未设置口令，后台会提示设置
    adminPassHash: '',
  },
};
