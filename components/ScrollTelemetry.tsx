'use client';

import { useEffect, useState } from 'react';

export default function ScrollTelemetry() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / height)));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div aria-hidden="true" className="scroll-telemetry">
      <div className="scroll-telemetry__bar" style={{ transform: `scaleX(${progress})` }}>
        <span className="scroll-telemetry__glow" />
      </div>
    </div>
  );
}
