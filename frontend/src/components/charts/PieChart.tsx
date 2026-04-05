import React, { useMemo, useRef, useState } from "react";

export type PieDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: PieDatum[];
  ariaLabel?: string;
  size?: number;
  thickness?: number;
};

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const arcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
};

export default function PieChart({ data, ariaLabel = "Pie chart", size = 220, thickness = 18 }: Props) {
  const safe = (data || []).map((d) => ({ ...d, value: Number.isFinite(d.value) ? Math.max(0, d.value) : 0 }));
  const total = safe.reduce((sum, d) => sum + d.value, 0);
  if (!safe.length || total <= 0) {
    return <div className="chart-empty" style={{ width: size, height: size }}>No data</div>;
  }

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 8) / 2;
  const innerR = Math.max(0, r - thickness);

  const slices = useMemo(() => {
    let angle = 0;
    return safe.map((d) => {
      const slice = (d.value / total) * 360;
      const start = angle;
      const end = angle + slice;
      angle = end;
      const mid = (start + end) / 2;
      return { d, start, end, mid };
    });
  }, [safe, total]);

  const tooltip = useMemo(() => {
    if (hoverIdx == null || !cursor) return null;
    const slice = slices[hoverIdx];
    if (!slice) return null;
    const pct = total ? Math.round((slice.d.value / total) * 100) : 0;
    const text = `${slice.d.label}: ${slice.d.value} (${pct}%)`;
    const approxW = Math.min(size - 16, Math.max(120, 7.2 * text.length));
    const w = approxW;
    const h = 28;
    const x = Math.min(size - w - 8, Math.max(8, cursor.x - w / 2));
    const y = Math.min(size - h - 8, Math.max(8, cursor.y - h - 10));
    return { text, x, y, w, h };
  }, [cursor, hoverIdx, size, slices, total]);

  return (
    <svg
      ref={svgRef}
      className="chart-svg"
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      onMouseLeave={() => {
        setHoverIdx(null);
        setCursor(null);
      }}
    >
      {slices.map((s, i) => {
        const fill = s.d.color || "#60a5fa";
        const rad = ((s.mid - 90) * Math.PI) / 180.0;
        const bump = hoverIdx === i ? 6 : 0;
        const dx = Math.cos(rad) * bump;
        const dy = Math.sin(rad) * bump;
        return (
          <path
            className="chart-hit"
            key={s.d.label}
            d={arcPath(cx, cy, r, s.start, s.end)}
            fill={fill}
            opacity={hoverIdx === i ? 1 : 0.92}
            transform={bump ? `translate(${dx} ${dy})` : undefined}
            style={{ transition: "opacity .12s ease, transform .12s ease" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseMove={(e) => {
              const box = svgRef.current?.getBoundingClientRect();
              if (!box) return;
              setCursor({ x: ((e.clientX - box.left) / box.width) * size, y: ((e.clientY - box.top) / box.height) * size });
            }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">
        {total}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" fill="#64748b">
        total
      </text>

      {tooltip ? (
        <g pointerEvents="none">
          <rect className="chart-tooltip-bg" x={tooltip.x} y={tooltip.y} width={tooltip.w} height={tooltip.h} rx="10" />
          <text className="chart-tooltip-text" x={tooltip.x + 10} y={tooltip.y + 18}>
            {tooltip.text}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
