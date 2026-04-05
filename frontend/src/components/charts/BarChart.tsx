import React, { useMemo, useRef, useState } from "react";

export type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: BarDatum[];
  ariaLabel?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
};

export default function BarChart({ data, ariaLabel = "Bar chart", height = 240, valueFormatter }: Props) {
  const safe = (data || []).map((d) => ({ ...d, value: Number.isFinite(d.value) ? Math.max(0, d.value) : 0 }));
  const total = safe.reduce((sum, d) => sum + d.value, 0);
  if (!safe.length || total <= 0) {
    return <div className="chart-empty" style={{ height }}>No data</div>;
  }

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const max = Math.max(1, ...safe.map((d) => d.value));
  const width = 520;
  const viewHeight = 240;
  const pad = { t: 16, r: 16, b: 66, l: 40 };
  const plotW = width - pad.l - pad.r;
  const plotH = viewHeight - pad.t - pad.b;
  const slot = plotW / safe.length;
  const barW = Math.max(14, slot * 0.55);

  const format = valueFormatter ?? ((v: number) => String(v));
  const shortLabel = (label: string) => {
    if (label.length <= 14) return label;
    return `${label.slice(0, 12)}..`;
  };
  const labelLines = (label: string) => {
    const text = shortLabel(label);
    if (!text.includes("_")) return [text];
    const parts = text.split("_").filter(Boolean);
    if (parts.length <= 1) return [text];
    const first = parts[0];
    const second = parts.slice(1).join("_");
    return [first, second];
  };

  const tooltip = useMemo(() => {
    if (hoverIdx == null || !cursor) return null;
    const d = safe[hoverIdx];
    if (!d) return null;
    const text = `${d.label}: ${format(d.value)}`;
    const approxW = Math.min(240, Math.max(120, 7.2 * text.length));
    const w = approxW;
    const h = 28;
    const x = Math.min(width - w - 8, Math.max(8, cursor.x - w / 2));
    const y = Math.min(viewHeight - h - 8, Math.max(8, cursor.y - h - 10));
    return { text, x, y, w, h };
  }, [cursor, format, hoverIdx, safe]);

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
        {format(max)}
      </text>
      <text x={pad.l - 10} y={pad.t + plotH / 2 + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
        {format(Math.round(max / 2))}
      </text>
      <text x={pad.l - 10} y={pad.t + plotH + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
        {format(0)}
      </text>
      {safe.map((d, i) => {
        const h = (d.value / max) * plotH;
        const x = pad.l + i * slot + (slot - barW) / 2;
        const y = pad.t + (plotH - h);
        const fill = d.color || "#3b82f6";
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${format(d.value)}`}</title>
            <rect
              className="chart-hit"
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="10"
              fill={fill}
              opacity={hoverIdx === i ? 1 : 0.88}
              style={{ transition: "opacity .12s ease, transform .12s ease", transformOrigin: `${x + barW / 2}px ${pad.t + plotH}px` }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseMove={(e) => {
                const box = svgRef.current?.getBoundingClientRect();
                if (!box) return;
                setCursor({ x: ((e.clientX - box.left) / box.width) * width, y: ((e.clientY - box.top) / box.height) * viewHeight });
              }}
            />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="#475569">
              {format(d.value)}
            </text>
            {labelLines(d.label).map((line, idx) => (
              <text
                key={`${d.label}-${idx}`}
                x={x + barW / 2}
                y={pad.t + plotH + 23 + idx * 12}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

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
