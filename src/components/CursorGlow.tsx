import { useEffect, useRef } from 'react';

/** 鼠标跟随霓虹光斑：仅指针设备启用，用 rAF + transform 保证性能。
 *  默认开启；用户通过右下角 FX 开关可关闭。系统 reduce-motion 下降速但不关闭。 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fxOff = () => {
      try {
        return localStorage.getItem('cyber-fx-enabled') === '0';
      } catch {
        return false;
      }
    };
    if (reduce && fxOff()) return;

    const el = ref.current;
    if (!el) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;
    let raf = 0;
    const ease = reduce ? 0.04 : 0.12;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      cx += (tx - cx) * ease;
      cy += (ty - cy) * ease;
      el.style.transform = `translate3d(${cx - 160}px, ${cy - 160}px, 0)`;
    };

    const apply = () => {
      el.style.opacity = fxOff() ? '0' : '1';
    };
    apply();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('fx-change', apply);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('fx-change', apply);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-0 h-80 w-80 rounded-full opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(circle, rgba(0,240,255,.10) 0%, rgba(255,0,160,.06) 40%, transparent 70%)',
      }}
    />
  );
}
