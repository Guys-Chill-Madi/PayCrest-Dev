import React, { useMemo, useRef, useState } from "react";

export type LineDatum = {
  label: string;
  value: number;
};

type Props = {
  data: LineDatum[];
  ariaLabel?: string;
  height?: number;
  stroke?: string;
  fill?: string;
};

export default function LineChart({
  data,
  ariaLabel = "Line chart",
  height = 220,
  stroke = "#2563eb",
  fill = "rgba(37, 99, 235, 0.12)",
}: Props) {
  const safe = (data || []).map((d) => ({ ...d, value: Number.isFinite(d.value) ? Math.max(0, d.value) : 0 }));
  const total = safe.reduce((sum, d) => sum + d.value, 0);
  if (!safe.length || total <= 0) {
    return <div className="chart-empty" style={{ height }}>No data</div>;
  }

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const width = 520;
  const viewHeight = 220;
  const pad = { t: 16, r: 16, b: 42, l: 36 };
  const plotW = width - pad.l - pad.r;
  const plotH = viewHeight - pad.t - pad.b;
  const max = Math.max(1, ...safe.map((d) => d.value));
  const min = 0;

  const xStep = safe.length <= 1 ? plotW : plotW / (safe.length - 1);
  const points = safe.map((d, i) => {
    const x = pad.l + i * xStep;
    const y = pad.t + plotH - ((d.value - min) / (max - min || 1)) * plotH;
    return { x, y, label: d.label, value: d.value };
  });

  const tooltip = useMemo(() => {
    if (hoverIdx == null || !cursor) return null;
    const p = points[hoverIdx];
    if (!p) return null;
    const text = `${p.label}: ${p.value}`;
    const approxW = Math.min(240, Math.max(110, 7.2 * text.length));
    const w = approxW;
    const h = 28;
    const x = Math.min(width - w - 8, Math.max(8, cursor.x - w / 2));
    const y = Math.min(viewHeight - h - 8, Math.max(8, cursor.y - h - 10));
    return { text, x, y, w, h };
  }, [cursor, hoverIdx, points]);

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pad.l},${pad.t + plotH} ${line} ${pad.l + plotW},${pad.t + plotH}`;

  return (
    <svg
      ref={svgRef}
      className="chart-svg"
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${viewHeight}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={() => {
        setHoverIdx(null);
        setCursor(null);
      }}
    >
      {[0.5, 1].map((t) => {
        const y = pad.t + plotH - t * plotH;
        return <line key={t} x1={pad.l} y1={y} x2={pad.l + plotW} y2={y} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />;
      })}
      <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke="#dbe5f2" strokeWidth="1" />
      <text x={pad.l - 10} y={pad.t + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
        {max}
      </text>
      <text x={pad.l - 10} y={pad.t + plotH / 2 + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
        {Math.round(max / 2)}
      </text>
      <text x={pad.l - 10} y={pad.t + plotH + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
        0
      </text>
      <polyline points={area} fill={fill} stroke="none" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {hoverIdx != null ? (
        <line
          x1={points[hoverIdx]?.x ?? 0}
          y1={pad.t}
          x2={points[hoverIdx]?.x ?? 0}
          y2={pad.t + plotH}
          stroke="rgba(148, 163, 184, 0.65)"
          strokeWidth="1"
        />
      ) : null}
      {points.map((p) => (
        <g key={p.label}>
          <circle
            className="chart-hit"
            cx={p.x}
            cy={p.y}
            r={hoverIdx != null && points[hoverIdx]?.label === p.label ? 5 : 4}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth="2"
            style={{ transition: "r .12s ease" }}
            onMouseEnter={() => setHoverIdx(points.findIndex((q) => q.label === p.label))}
            onMouseMove={(e) => {
              const box = svgRef.current?.getBoundingClientRect();
              if (!box) return;
              setCursor({ x: ((e.clientX - box.left) / box.width) * width, y: ((e.clientY - box.top) / box.height) * viewHeight });
            }}
          />
          <text x={p.x} y={pad.t + plotH + 24} textAnchor="middle" fontSize="12" fill="#64748b">
            {p.label}
          </text>
        </g>
      ))}

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
