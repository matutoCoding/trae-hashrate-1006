import { useEffect, useRef, useState } from 'react';

interface GaugeMeterProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  thresholds?: { warn: number; danger: number };
  size?: number;
}

export default function GaugeMeter({
  value,
  max = 10,
  label,
  unit = '安全系数',
  thresholds = { warn: 2.0, danger: 1.5 },
  size = 140,
}: GaugeMeterProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const from = 0;
    const to = value;
    const duration = 800;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayValue(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size * 0.58;
    const r = size * 0.42;
    const startA = Math.PI * 0.8;
    const endA = Math.PI * 2.2;
    const range = endA - startA;

    const drawArc = (a1: number, a2: number, color: string, lineW: number) => {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineWidth = lineW;
      ctx.strokeStyle = color;
      ctx.arc(cx, cy, r, a1, a2);
      ctx.stroke();
    };

    const pct = Math.min(1, Math.max(0, value / max));
    const warnPct = Math.min(1, thresholds.warn / max);
    const dangerPct = Math.min(1, thresholds.danger / max);

    drawArc(startA, startA + range * warnPct, 'rgba(74,155,131,0.25)', 14);
    drawArc(startA + range * warnPct, startA + range * dangerPct, 'rgba(160,82,45,0.25)', 14);
    drawArc(startA + range * dangerPct, endA, 'rgba(194,65,12,0.25)', 14);

    let color;
    if (value >= thresholds.warn) color = '#4a9b83';
    else if (value >= thresholds.danger) color = '#a0522d';
    else color = '#c2410c';

    const valA = startA + range * pct;
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + 'cc');

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = grad;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.arc(cx, cy, r, startA, Math.max(startA + 0.02, valA));
    ctx.stroke();
    ctx.shadowBlur = 0;

    const dispText = displayValue >= max ? `${max.toFixed(1)}+` : displayValue.toFixed(2);
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 24px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dispText, cx, cy - 2);
    ctx.fillStyle = '#7d6c4d';
    ctx.font = '10px "Noto Serif SC", serif';
    ctx.fillText(unit, cx, cy + 18);

    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const t = i / tickCount;
      const a = startA + range * t;
      const x1 = cx + Math.cos(a) * (r + 10);
      const y1 = cy + Math.sin(a) * (r + 10);
      const x2 = cx + Math.cos(a) * (r + (i % 3 === 0 ? 18 : 14));
      const y2 = cy + Math.sin(a) * (r + (i % 3 === 0 ? 18 : 14));
      ctx.beginPath();
      ctx.strokeStyle = '#b8ab90';
      ctx.lineWidth = 1;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }, [displayValue, value, max, thresholds.warn, thresholds.danger, size]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={ref} />
      <p className="mt-1 font-song text-sm font-medium text-ink-800 tracking-wide">{label}</p>
    </div>
  );
}
