import React, { useMemo } from "react";

type Props = {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  thickness?: number;
  ariaLabel?: string;
  accent?: string;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function CibilGauge({
  value,
  min = 300,
  max = 900,
  size = 220,
  thickness = 16,
  ariaLabel = "CIBIL gauge",
  accent = "#1f5fbf",
}: Props) {
  const v = clamp(Number(value || 0), min, max);
  const pct = (v - min) / Math.max(1, max - min);

  const { r, cx, cy, startAngle, endAngle, path, length } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const r = (size - thickness - 10) / 2;
    // semi-circle gauge (220° sweep looks nicer than 180°)
    const startAngle = 200;
    const endAngle = -20;
    const polar = (angleDeg: number) => {
      const a = (angleDeg * Math.PI) / 180;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    };
    const s = polar(startAngle);
    const e = polar(endAngle);
    const largeArcFlag = 1;
    const sweepFlag = 0;
    const d = `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${e.x} ${e.y}`;
    return { r, cx, cy, startAngle, endAngle, path: d, length: Math.PI * r * 1.22 };
  }, [size, thickness]);

  const dash = Math.max(0, Math.min(1, pct)) * length;
  const dashArray = `${dash} ${length}`;

  const needleAngle = useMemo(() => {
    // map pct to [startAngle .. endAngle] (note: decreasing)
    return startAngle + (endAngle - startAngle) * pct;
  }, [endAngle, pct, startAngle]);

  const needle = useMemo(() => {
    const a = (needleAngle * Math.PI) / 180;
    const x = cx + (r - 10) * Math.cos(a);
    const y = cy + (r - 10) * Math.sin(a);
    return { x, y };
  }, [cx, cy, needleAngle, r]);

  return (
    <svg className="chart-svg" role="img" aria-label={ariaLabel} viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <path d={path} stroke="rgba(148,163,184,0.35)" strokeWidth={thickness} strokeLinecap="round" fill="none" />
      <path
        d={path}
        stroke={accent}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={dashArray}
        style={{ transition: "stroke-dasharray .55s cubic-bezier(.2,.9,.2,1)" }}
      />

      <circle cx={cx} cy={cy} r={3} fill="rgba(15,23,42,0.25)" />
      <line
        x1={cx}
        y1={cy}
        x2={needle.x}
        y2={needle.y}
        stroke="rgba(15,23,42,0.6)"
        strokeWidth={3}
        strokeLinecap="round"
        style={{ transition: "all .55s cubic-bezier(.2,.9,.2,1)" }}
      />
      <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke="rgba(15,23,42,0.18)" strokeWidth={2} />

      <text x={cx} y={cy + 48} textAnchor="middle" fontSize="12" fill="#64748b">
        {min} — {max}
      </text>
    </svg>
  );
}

