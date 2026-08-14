import type { SiteData } from './types';
import { SITE_STORE_KEY, SITE_VERSION } from './types';
import { defaultSite } from './defaultSite';

/**
 * 数据访问层 —— 前台与后台都只通过这里读写内容。
 *
 * 双模式自动切换：
 *  - 本地开发 / 云端不可达：localStorage
 *  - 部署到 Cloudflare Pages（存在 /api/content）：云端 D1 为主，localStorage 为初始缓存
 * 组件与后台 UI 无需关心数据存在哪。
 */

const CLOUD_URL = '/api/content';

function fromStorage(): SiteData {
  if (typeof localStorage === 'undefined') return defaultSite;
  try {
    const raw = localStorage.getItem(SITE_STORE_KEY);
    if (!raw) return defaultSite;
    const parsed = JSON.parse(raw) as SiteData;
    if (parsed.version !== SITE_VERSION) return defaultSite;
    return normalize(parsed);
  } catch {
    return defaultSite;
  }
}

/** 把云端数据写回 localStorage（作为缓存，离线也能渲染） */
function cacheLocal(data: SiteData): void {
  try {
    localStorage.setItem(SITE_STORE_KEY, JSON.stringify({ ...data, version: SITE_VERSION }));
  } catch {
    /* 配额满忽略 */
  }
}

export function loadSite(): SiteData {
  return fromStorage();
}

/** 云端同步：拉取 D1 内容覆盖本地缓存。返回是否成功拉到数据。 */
export async function syncFromCloud(): Promise<boolean> {
  try {
    const r = await fetch(CLOUD_URL, { cache: 'no-store' });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok: boolean; data: SiteData | null };
    if (!j.ok || !j.data) return false;
    cacheLocal(j.data);
    return true;
  } catch {
    return false; // 离线 / 部署环境无 Function
  }
}

/** 云端写入：PUT 到 /api/content。需传入后台口令哈希做鉴权。 */
export async function pushToCloud(data: SiteData, adminHash: string): Promise<boolean> {
  try {
    const r = await fetch(CLOUD_URL, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-admin-hash': adminHash,
      },
      body: JSON.stringify({ data: { ...data, version: SITE_VERSION } }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function saveSite(data: SiteData): void {
  const payload: SiteData = { ...data, version: SITE_VERSION };
  try {
    localStorage.setItem(SITE_STORE_KEY, JSON.stringify(payload));
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    throw new Error(
      quota
        ? '存储空间已满（浏览器约 5MB）。请删除部分封面图或改用更小的图片，也可先到「数据」页导出备份。'
        : '保存失败：' + (e instanceof Error ? e.message : String(e)),
    );
  }
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
