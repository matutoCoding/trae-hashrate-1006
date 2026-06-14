import { useEffect, useRef, useState } from 'react';

interface Dimension {
  key: string;
  label: string;
  value: number;
}

interface RadarChartProps {
  dimensions: Dimension[];
  reference?: { label: string; values: number[] };
  size?: number;
  max?: number;
}

export default function RadarChart({
  dimensions,
  reference,
  size = 260,
  max = 10,
}: RadarChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const dur = 700;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setAnim(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dimensions]);

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
    const cy = size / 2;
    const r = size * 0.36;
    const n = dimensions.length;

    const getPoint = (idx: number, ratio: number) => {
      const angle = -Math.PI / 2 + (idx / n) * Math.PI * 2;
      return {
        x: cx + Math.cos(angle) * r * ratio,
        y: cy + Math.sin(angle) * r * ratio,
      };
    };

    for (let ring = 5; ring >= 1; ring--) {
      ctx.beginPath();
      const rr = (ring / 5) * r;
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const angle = -Math.PI / 2 + (idx / n) * Math.PI * 2;
        const x = cx + Math.cos(angle) * rr;
        const y = cy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = ring % 2 === 0 ? 'rgba(74,124,155,0.04)' : 'rgba(245,241,232,0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(154,138,106,0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const p = getPoint(i, 1.15);
      const p0 = { x: cx, y: cy };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p.x * cx / (cx + (p.x - cx) * 0.13), p.y * cy / (cy + (p.y - cy) * 0.13));
      ctx.strokeStyle = 'rgba(154,138,106,0.3)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (reference) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const val = reference.values[idx] ?? 0;
        const p = getPoint(idx, Math.min(1, val / max));
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(160,82,45,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,82,45,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const val = dimensions[idx].value * anim;
      const p = getPoint(idx, Math.min(1, val / max));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(74,124,155,0.35)');
    grad.addColorStop(1, 'rgba(74,124,155,0.12)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#4a7c9b';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const val = dimensions[i].value * anim;
      const p = getPoint(i, Math.min(1, val / max));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#4a7c9b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const lp = {
        x: cx + Math.cos(angle) * (r + 26),
        y: cy + Math.sin(angle) * (r + 26),
      };
      const val = dimensions[i].value;
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 13px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dimensions[i].label, lp.x, lp.y - 8);
      ctx.fillStyle = val >= 8 ? '#4a9b83' : val >= 6 ? '#a0522d' : '#c2410c';
      ctx.font = 'bold 12px "Noto Serif SC", serif';
      ctx.fillText(val.toFixed(1), lp.x, lp.y + 8);
    }
  }, [anim, dimensions, reference, size, max]);

  return (
    <div className="flex justify-center items-center">
      <canvas ref={ref} />
    </div>
  );
}
