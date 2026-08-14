import type { SiteData } from './types';
import { SITE_STORE_KEY, SITE_VERSION } from './types';
import { defaultSite } from './defaultSite';

/**
 * 数据访问层 —— 前台与后台都只通过这里读写内容。
 *
 * 【本地阶段】localStorage
 * 【云端阶段】把下面两个函数改成：
 *   loadSite: const r = await fetch('/api/content'); return r.json();
 *   saveSite: await fetch('/api/content', {method:'PUT', body: JSON.stringify(data)});
 * 其余代码零改动。
 */

export function loadSite(): SiteData {
  if (typeof localStorage === 'undefined') return defaultSite;
  try {
    const raw = localStorage.getItem(SITE_STORE_KEY);
    if (!raw) return defaultSite;
    const parsed = JSON.parse(raw) as SiteData;
    // 版本不匹配时回退到默认内容，避免结构错乱导致白屏
    if (parsed.version !== SITE_VERSION) return defaultSite;
    return normalize(parsed);
  } catch {
    return defaultSite;
  }
}

export function saveSite(data: SiteData): void {
  const payload: SiteData = { ...data, version: SITE_VERSION };
  try {
    localStorage.setItem(SITE_STORE_KEY, JSON.stringify(payload));
  } catch (e) {
    // 配额超限最常见于封面图过多/过大
    const quota =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    throw new Error(
      quota
        ? '存储空间已满（浏览器约 5MB）。请删除部分封面图或改用更小的图片，也可先到「数据」页导出备份。'
        : '保存失败：' + (e instanceof Error ? e.message : String(e)),
    );
  }
  // 通知同页其它组件刷新
  window.dispatchEvent(new CustomEvent('site-updated'));
}

export function resetSite(): void {
  localStorage.removeItem(SITE_STORE_KEY);
  window.dispatchEvent(new CustomEvent('site-updated'));
}

export function exportSite(data: SiteData): string {
  return JSON.stringify(data, null, 2);
}

export function importSite(json: string): SiteData {
  const parsed = JSON.parse(json) as SiteData;
  if (!parsed || typeof parsed !== 'object') throw new Error('不是合法的 JSON 对象');
  if (!parsed.profile || !Array.isArray(parsed.projects)) {
    throw new Error('缺少必需字段 profile / projects');
  }
  return normalize({ ...parsed, version: SITE_VERSION });
}

/** 补齐可能缺失的字段，防止后台删空或旧数据结构导致前台崩溃 */
function normalize(d: SiteData): SiteData {
  return {
    version: SITE_VERSION,
    profile: {
      ...defaultSite.profile,
      ...d.profile,
      contacts: d.profile?.contacts ?? [],
    },
    socials: d.socials ?? [],
    projects: d.projects ?? [],
    timeline: d.timeline ?? [],
    skills: d.skills ?? [],
    posts: d.posts ?? [],
    settings: { ...defaultSite.settings, ...d.settings },
  };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
