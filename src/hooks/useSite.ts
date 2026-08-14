import { useEffect, useState } from 'react';
import type { SiteData } from '../types';
import { loadSite } from '../store';

/** 前台读取站点内容；后台保存后自动刷新 */
export function useSite(): SiteData {
  const [site, setSite] = useState<SiteData>(() => loadSite());

  useEffect(() => {
    const refresh = () => setSite(loadSite());
    // 同页保存
    window.addEventListener('site-updated', refresh);
    // 跨标签页保存
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('site-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return site;
}
