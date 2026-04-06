'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function PerformanceBar() {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setVisible(true);
    setWidth(30);
    const t1 = setTimeout(() => setWidth(70), 100);
    const t2 = setTimeout(() => setWidth(95), 300);
    const t3 = setTimeout(() => { setWidth(100); }, 500);
    const t4 = setTimeout(() => { setVisible(false); setWidth(0); }, 700);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [pathname]);

  if (!visible) return null;
  return (
    <div
      className="perf-bar"
      style={{ width: `${width}%`, opacity: width === 100 ? 0 : 1 }}
    />
  );
}
