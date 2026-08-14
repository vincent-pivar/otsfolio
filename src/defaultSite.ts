import type { SiteData } from './types';
import { SITE_VERSION } from './types';
import { profile, socials, projects, timeline, skills } from './content';

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
};
