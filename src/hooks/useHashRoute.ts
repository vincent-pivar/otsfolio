import { useEffect, useState } from 'react';

/**
 * 极简路由：优先使用干净 URL（pathname，如 /blog/xxx，利于 SEO 被 Google 收录），
 * 兼容旧的 hash 形式（#/blog/xxx）作为回退。
 * 返回统一格式：''（首页）| 'blog' | 'blog/xxx' | 'admin' | 'projects' | ...
 */
export function useHashRoute(): string {
  const read = () => {
    const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (path) return path;
    // 回退：hash 形式
    const h = window.location.hash.replace(/^#\/?/, '');
    return h;
  };
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  return route;
}
