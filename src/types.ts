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

/** 博客文章 */
export type Post = {
  id: string;
  /** URL 短链，用于 #/blog/<slug>，须唯一 */
  slug: string;
  title: string;
  /** 列表页摘要；留空则自动从正文截取 */
  excerpt: string;
  /** 正文，支持轻量 Markdown */
  body: string;
  tags: string[];
  /** ISO 日期 YYYY-MM-DD */
  date: string;
  /** 草稿不在前台显示 */
  published: boolean;
  /** 封面图：本地为 dataURL，云端为 R2 地址 */
  cover?: string;
};

/** 站点设置 */
export type Settings = {
  /** 浏览器标签标题 */
  siteTitle: string;
  /** SEO 描述 */
  siteDescription: string;
  /**
   * 后台访问口令的哈希值（非明文）。
   * 空字符串表示未设置口令，此时后台开放访问并提示用户设置。
   */
  adminPassHash: string;
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
  posts: Post[];
  settings: Settings;
};

export const SITE_STORE_KEY = 'cyber-portfolio-site-v2';
/** 后台会话标记（sessionStorage，关闭标签即失效） */
export const ADMIN_SESSION_KEY = 'cyber-portfolio-admin-session';
export const SITE_VERSION = 2;
