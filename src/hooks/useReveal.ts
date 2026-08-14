import { useEffect, useRef, useState, type CSSProperties } from 'react';

/** 元素进入视口时触发一次，用于滚动进场动画 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, shown };
}

/** 统一的进场样式类 */
export function revealClass(shown: boolean) {
  return [
    'transition-all duration-700 ease-out motion-reduce:transition-none',
    shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
  ].join(' ');
}

/** 阶梯延迟用 inline style，避免 Tailwind 扫不到动态类名 */
export function revealDelay(ms: number): CSSProperties {
  return ms ? { transitionDelay: `${ms}ms` } : {};
}
