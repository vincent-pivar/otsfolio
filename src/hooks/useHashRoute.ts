import { useEffect, useState } from 'react';

/** 极简哈希路由：静态托管无需服务端 rewrite */
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/');

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return hash;
}
