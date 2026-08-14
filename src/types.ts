/**
 * 站点内容的数据契约 —— 前台渲染与后台编辑共用。
 *
 * 本地阶段：数据存在 localStorage（键 SITE_STORE_KEY）。
 * 云端阶段：同样的结构存入 Cloudflare D1，图片存 R2，
 *          只需把 loadSite/saveSite 换成 fetch('/api/content')，
 *          组件与后台 UI 完全不用改。
 */

export type Social = {
  name: string;
  handle: string;
  href: string;
  /** 内联 SVG path，24x24 viewBox */
  icon: string;
};

export type Project = {
  id: string;
  name: string;
  subtitle: string;
  desc: string;
  tags: string[];
  highlights: string[];
  link?: string;
  status: '已上线' | '开发中';
  accent: 'cyan' | 'magenta' | 'lime';
  /** 封面图：本地阶段为 dataURL，云端阶段为 R2 公开地址 */
  cover?: string;
};

export type TimelineItem = {
  id: string;
  period: string;
  title: string;
  desc: string;
  tags: string[];
  current?: boolean;
};

export type SkillGroup = {
  id: string;
  group: string;
  items: string[];
};

export type Contact = {
  label: string;
  value: string;
  href: string;
};

export type Profile = {
  name: string;
  title: string;
  tagline: string;
  intro: string;
  contacts: Contact[];
};

export type SiteData = {
  /** 数据结构版本，便于将来迁移 */
  version: number;
  profile: Profile;
  socials: Social[];
  projects: Project[];
  timeline: TimelineItem[];
  skills: SkillGroup[];
};

export const SITE_STORE_KEY = 'cyber-portfolio-site-v1';
export const SITE_VERSION = 1;
