'use client';

import { useEffect, useRef, useState } from 'react';

interface OrbitalFieldProps {
  className?: string;
  variant?: 'hero' | 'panel';
}

interface StarPoint {
  orbit: number;
  angle: number;
  speed: number;
  radius: number;
  alpha: number;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);

    sync();
    media.addEventListener('change', sync);

    return () => media.removeEventListener('change', sync);
  }, []);

  return reduced;
}

export default function OrbitalField({ className = '', variant = 'hero' }: OrbitalFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const starsRef = useRef<StarPoint[]>([]);
  const pointerRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const createStars = (width: number, height: number) => {
      const count = variant === 'hero' ? 34 : 22;
      const baseOrbit = Math.min(width, height) * (variant === 'hero' ? 0.2 : 0.16);
      const orbitSpread = Math.min(width, height) * (variant === 'hero' ? 0.34 : 0.24);

      starsRef.current = Array.from({ length: count }, (_, index) => ({
        orbit: baseOrbit + orbitSpread * (index / count),
        angle: Math.random() * Math.PI * 2,
        speed: (variant === 'hero' ? 0.0012 : 0.0009) + Math.random() * 0.0012,
        radius: 1.2 + Math.random() * 2.4,
        alpha: 0.35 + Math.random() * 0.5,
      }));
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars(rect.width, rect.height);
    };

    resize();

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerRef.current = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      };
    };

    const onPointerLeave = () => {
      pointerRef.current = { x: 0, y: 0 };
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      if (!visibleRef.current) {
        frameRef.current = window.requestAnimationFrame(render);
        return;
      }

      const { width, height } = canvas.getBoundingClientRect();
      const cx = width * (variant === 'hero' ? 0.72 : 0.55) + pointerRef.current.x * 16;
      const cy = height * (variant === 'hero' ? 0.35 : 0.5) + pointerRef.current.y * 12;

      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.62);
      glow.addColorStop(0, variant === 'hero' ? 'rgba(36,84,166,0.24)' : 'rgba(36,84,166,0.18)');
      glow.addColorStop(0.45, 'rgba(47,136,160,0.1)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const rings = variant === 'hero' ? [0.18, 0.28, 0.4, 0.54] : [0.2, 0.34, 0.5];
      rings.forEach((ratio, index) => {
        context.beginPath();
        context.lineWidth = 1;
        context.strokeStyle = index === 0 ? 'rgba(255,255,255,0.34)' : 'rgba(31,57,88,0.14)';
        context.arc(cx, cy, Math.min(width, height) * ratio, 0, Math.PI * 2);
        context.stroke();
      });

      context.save();
      context.translate(cx, cy);
      context.rotate(time * (variant === 'hero' ? 0.00018 : 0.00012));
      const sweep = context.createLinearGradient(0, 0, width * 0.3, 0);
      sweep.addColorStop(0, 'rgba(255,255,255,0)');
      sweep.addColorStop(0.55, 'rgba(255,255,255,0.02)');
      sweep.addColorStop(1, variant === 'hero' ? 'rgba(216,106,36,0.18)' : 'rgba(47,136,160,0.14)');
      context.fillStyle = sweep;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, Math.min(width, height) * 0.54, -0.14, 0.16);
      context.closePath();
      context.fill();
      context.restore();

      starsRef.current.forEach((star, index) => {
        const angle = star.angle + time * star.speed;
        const x = cx + Math.cos(angle) * star.orbit;
        const y = cy + Math.sin(angle) * star.orbit * 0.64;
        const pulse = 0.82 + Math.sin(time * 0.0014 + index) * 0.18;

        context.beginPath();
        context.fillStyle = `rgba(255,255,255,${star.alpha * pulse})`;
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = index % 4 === 0 ? 'rgba(216,106,36,0.9)' : 'rgba(47,136,160,0.72)';
        context.arc(x, y, Math.max(0.8, star.radius - 0.9), 0, Math.PI * 2);
        context.fill();
      });

      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [reducedMotion, variant]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`orbital-field ${variant === 'hero' ? 'orbital-field-hero' : 'orbital-field-panel'} ${className}`}
    >
      {reducedMotion ? (
        <div className="orbital-static">
          <span className="orbital-static-ring orbital-static-ring-a" />
          <span className="orbital-static-ring orbital-static-ring-b" />
          <span className="orbital-static-ring orbital-static-ring-c" />
        </div>
      ) : (
        <canvas ref={canvasRef} className="orbital-canvas" />
      )}
      <div className="orbital-grid" />
    </div>
  );
}
