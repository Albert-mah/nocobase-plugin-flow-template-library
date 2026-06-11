import React from 'react';
import { Template } from '../core/types';
import { themeParam, resolveThemeTokens, ThemeTokens } from '../core/themes';
import { registerStyleThumbs, ThumbFC } from '../core/styleThumbs';
import { registerPreview } from '../core/previews';

/**
 * Data-viz family — collection-scope blocks NocoBase has no native equivalent
 * for: pivot table (cross-tab), period-over-period trend KPI, quadrant scatter,
 * tag cloud, news ticker. All themed + style variants; data fetched client-side
 * (pageSize-bounded, fine for dashboard-scale collections).
 */

const THEME_FALLBACK = `
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0', gradient: 'linear-gradient(135deg,#1677ff,#13c2c2)' };
`;

/** label lookup for an enum-captured field: $p.<name>__enum */
const ENUM_LABEL_SNIPPET = `
function labelOf(enumList, v) {
  if (v === null || v === undefined || v === '') return '—';
  const hit = (enumList || []).find(function (o) { return String(o.value) === String(v); });
  return hit ? hit.label : String(v);
}
`;

// ─── 1. 透视表 pivotTable ────────────────────────────────────────────────────

export const pivotTable: Template = {
  key: 'pivotTable',
  kind: 'block',
  scope: 'collection',
  label: 'Pivot table',
  description: 'Cross-tab aggregation: rows × columns with count / sum / avg cells, totals and heat coloring',
  icon: '🧮',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 815,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'rowField', type: 'field', collectionFrom: 'collection', label: 'Row field', required: true, hint: 'Enum / text field — one table row per value' },
    { name: 'colField', type: 'field', collectionFrom: 'collection', label: 'Column field', required: true, hint: 'Enum / text field — one table column per value' },
    {
      name: 'valueMode',
      type: 'select',
      label: 'Cell value',
      default: 'count',
      options: [
        { label: 'Count', value: 'count' },
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'avg' },
      ],
    },
    { name: 'numField', type: 'field', collectionFrom: 'collection', label: 'Number field', accepts: 'numeric', showWhen: (p) => p.valueMode === 'sum' || p.valueMode === 'avg' },
    { name: 'limit', type: 'number', label: 'Max rows', default: 8 },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'pivot',
      label: 'Style',
      default: 'heat',
      options: [
        { label: 'Heatmap', value: 'heat' },
        { label: 'Plain', value: 'plain' },
        { label: 'Zebra', value: 'zebra' },
        { label: 'Cell bars', value: 'bars' },
      ],
    },
    { name: 'title', type: 'text', label: 'Title' },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
${THEME_FALLBACK}
${ENUM_LABEL_SNIPPET}
function fmt(n) {
  if (n === null || n === undefined) return '';
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function Pivot() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const fields = [$p.rowField, $p.colField];
        if (($p.valueMode === 'sum' || $p.valueMode === 'avg') && $p.numField) fields.push($p.numField);
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 800, fields: fields } });
        setRows((res && res.data && res.data.data) || []);
      } catch (e) { setRows([]); }
    })();
  }, []);
  if (!rows) return <div style={{ padding: 16, color: T.sub }}>Loading…</div>;

  const mode = $p.valueMode || 'count';
  const cell = {}; const rowTotals = {}; const colTotals = {}; const cnt = {};
  rows.forEach(function (r) {
    const rk = String(r[$p.rowField] ?? '—');
    const ck = String(r[$p.colField] ?? '—');
    const v = mode === 'count' ? 1 : Number(r[$p.numField]) || 0;
    const k = rk + '\\u0001' + ck;
    cell[k] = (cell[k] || 0) + v;
    cnt[k] = (cnt[k] || 0) + 1;
    rowTotals[rk] = (rowTotals[rk] || 0) + v;
    colTotals[ck] = (colTotals[ck] || 0) + v;
  });
  if (mode === 'avg') {
    Object.keys(cell).forEach(function (k) { cell[k] = cell[k] / cnt[k]; });
  }
  const rks = Object.keys(rowTotals).sort(function (a, b) { return rowTotals[b] - rowTotals[a]; }).slice(0, $p.limit || 8);
  const cks = Object.keys(colTotals).sort(function (a, b) { return colTotals[b] - colTotals[a]; }).slice(0, 8);
  const maxCell = Math.max.apply(null, [1].concat(rks.map(function (rk) {
    return Math.max.apply(null, [0].concat(cks.map(function (ck) { return cell[rk + '\\u0001' + ck] || 0; })));
  })));

  const variant = $p.variant || 'heat';
  function cellStyle(v, ri) {
    const base = { padding: '6px 10px', textAlign: 'right', fontSize: 12, color: T.text, borderBottom: '1px solid ' + T.border };
    if (variant === 'heat' && v) {
      const a = Math.min(0.85, 0.08 + 0.77 * (v / maxCell));
      return Object.assign(base, { background: T.primary + Math.round(a * 255).toString(16).padStart(2, '0'), color: a > 0.45 ? '#fff' : T.text, fontWeight: 600 });
    }
    if (variant === 'zebra' && ri % 2) return Object.assign(base, { background: T.card });
    return base;
  }

  return (
    <div style={{ padding: 12, background: T.bg }}>
      {$p.title ? <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>{$p.title}</div> : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, color: T.sub, borderBottom: '2px solid ' + T.border }}>{''}</th>
              {cks.map(function (ck) {
                return <th key={ck} style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, color: T.sub, borderBottom: '2px solid ' + T.border, whiteSpace: 'nowrap' }}>{labelOf($p.colField__enum, ck)}</th>;
              })}
              <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.text, borderBottom: '2px solid ' + T.border }}>Σ</th>
            </tr>
          </thead>
          <tbody>
            {rks.map(function (rk, ri) {
              return (
                <tr key={rk}>
                  <td style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, color: T.text, borderBottom: '1px solid ' + T.border, whiteSpace: 'nowrap' }}>{labelOf($p.rowField__enum, rk)}</td>
                  {cks.map(function (ck) {
                    const v = cell[rk + '\\u0001' + ck] || 0;
                    return (
                      <td key={ck} style={cellStyle(v, ri)}>
                        {variant === 'bars' && v ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 36, height: 5, borderRadius: 3, background: T.card, overflow: 'hidden', display: 'inline-block' }}>
                              <span style={{ display: 'block', width: Math.max(6, Math.round((v / maxCell) * 100)) + '%', height: '100%', background: T.primary }} />
                            </span>
                            {fmt(v)}
                          </span>
                        ) : (v ? fmt(v) : <span style={{ color: T.border }}>·</span>)}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: T.primary, borderBottom: '1px solid ' + T.border }}>{fmt(rowTotals[rk])}</td>
                </tr>
              );
            })}
            <tr>
              <td style={{ padding: '6px 10px', fontSize: 12, fontWeight: 700, color: T.text }}>Σ</td>
              {cks.map(function (ck) {
                return <td key={ck} style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: T.primary }}>{fmt(colTotals[ck])}</td>;
              })}
              <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: 12, fontWeight: 800, color: T.primary }}>
                {fmt(rks.reduce(function (s, rk) { return s + rowTotals[rk]; }, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

ctx.render(<Pivot />);
`,
};

// ─── 2. 环比趋势卡 trendKpi ──────────────────────────────────────────────────

export const trendKpi: Template = {
  key: 'trendKpi',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'collection',
  label: 'Trend KPI (vs last period)',
  description: 'Current vs previous period with delta % and a sparkline — day / week / month over period',
  icon: '📈',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 816,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'dateField', type: 'field', collectionFrom: 'collection', label: 'Date field', accepts: 'date', required: true },
    {
      name: 'period',
      type: 'select',
      label: 'Period',
      default: 'month',
      options: [
        { label: 'Day (today vs yesterday)', value: 'day' },
        { label: 'Week (this vs last)', value: 'week' },
        { label: 'Month (this vs last)', value: 'month' },
      ],
    },
    {
      name: 'valueMode',
      type: 'select',
      label: 'Value',
      default: 'count',
      options: [
        { label: 'Count of records', value: 'count' },
        { label: 'Sum of a number field', value: 'sum' },
      ],
    },
    { name: 'numField', type: 'field', collectionFrom: 'collection', label: 'Number field', accepts: 'numeric', showWhen: (p) => p.valueMode === 'sum' },
    { name: 'label', type: 'text', label: 'Label', default: 'This period' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'tkpi',
      label: 'Style',
      default: 'spark',
      options: [
        { label: 'Sparkline', value: 'spark' },
        { label: 'Delta arrow', value: 'arrow' },
        { label: 'Mini columns', value: 'bars' },
        { label: 'Compact line', value: 'compact' },
      ],
    },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
${THEME_FALLBACK}
function startOf(period, d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (period === 'week') { const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); }
  if (period === 'month') x.setDate(1);
  return x;
}
function prevStart(period, cur) {
  const x = new Date(cur);
  if (period === 'day') x.setDate(x.getDate() - 1);
  if (period === 'week') x.setDate(x.getDate() - 7);
  if (period === 'month') x.setMonth(x.getMonth() - 1);
  return x;
}
function fmt(n) {
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function TrendKpi() {
  const [st, setSt] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const period = $p.period || 'month';
        const curS = startOf(period, new Date());
        const prevS = prevStart(period, curS);
        const fields = [$p.dateField].concat($p.valueMode === 'sum' && $p.numField ? [$p.numField] : []);
        const flt = {}; flt[$p.dateField] = { $dateAfter: prevS.toISOString() };
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 1000, fields: fields, filter: flt } });
        const rows = (res && res.data && res.data.data) || [];
        let cur = 0, prev = 0;
        const SLICES = 12;
        const span = Date.now() - prevS.getTime();
        const buckets = new Array(SLICES).fill(0);
        rows.forEach(function (r) {
          const t = new Date(r[$p.dateField]).getTime();
          if (isNaN(t)) return;
          const v = $p.valueMode === 'sum' ? (Number(r[$p.numField]) || 0) : 1;
          if (t >= curS.getTime()) cur += v; else prev += v;
          const idx = Math.min(SLICES - 1, Math.max(0, Math.floor(((t - prevS.getTime()) / span) * SLICES)));
          buckets[idx] += v;
        });
        setSt({ cur: cur, prev: prev, buckets: buckets });
      } catch (e) { setSt({ cur: 0, prev: 0, buckets: [] }); }
    })();
  }, []);
  if (!st) return <div style={{ padding: 16, color: T.sub }}>Loading…</div>;

  const delta = st.prev > 0 ? ((st.cur - st.prev) / st.prev) * 100 : (st.cur > 0 ? 100 : 0);
  const up = delta >= 0;
  const dColor = up ? '#52c41a' : '#f5222d';
  const variant = $p.variant || 'spark';
  const max = Math.max.apply(null, [1].concat(st.buckets));
  const W = 120, H = 36;
  const pts = st.buckets.map(function (v, i) {
    return (i / (st.buckets.length - 1 || 1)) * W + ',' + (H - (v / max) * (H - 4) - 2);
  }).join(' ');

  if (variant === 'compact') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10, padding: '8px 14px', background: T.bg, border: '1px solid ' + T.border, borderRadius: 8 }}>
        <span style={{ fontSize: 12, color: T.sub }}>{$p.label || 'This period'}</span>
        <b style={{ fontSize: 18, color: T.text }}>{fmt(st.cur)}</b>
        <span style={{ fontSize: 12, fontWeight: 700, color: dColor }}>{up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%</span>
        <span style={{ fontSize: 11, color: T.sub }}>prev {fmt(st.prev)}</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 14, background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, display: 'inline-block', minWidth: 200 }}>
      <div style={{ fontSize: 12, color: T.sub }}>{$p.label || 'This period'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{fmt(st.cur)}</span>
        {variant === 'arrow' ? (
          <span style={{ fontSize: 22, fontWeight: 800, color: dColor }}>{up ? '↗' : '↘'}</span>
        ) : null}
        <span style={{ fontSize: 12, fontWeight: 700, color: dColor, background: dColor + '1a', padding: '1px 8px', borderRadius: 10 }}>
          {up ? '+' : ''}{delta.toFixed(1)}%
        </span>
      </div>
      <div style={{ marginTop: 8 }}>
        {variant === 'bars' ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H }}>
            {st.buckets.map(function (v, i) {
              return <span key={i} style={{ width: 7, height: Math.max(3, (v / max) * H), borderRadius: 2, background: i >= st.buckets.length / 2 ? T.primary : T.border }} />;
            })}
          </div>
        ) : (
          <svg width={W} height={H} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={T.primary} strokeWidth="2" strokeLinejoin="round" />
            <polygon points={'0,' + H + ' ' + pts + ' ' + W + ',' + H} fill={T.primary + '22'} stroke="none" />
          </svg>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: T.sub }}>previous: {fmt(st.prev)}</div>
    </div>
  );
}

ctx.render(<TrendKpi />);
`,
};

// ─── 3. 四象限矩阵 quadrantScatter ───────────────────────────────────────────

export const quadrantScatter: Template = {
  key: 'quadrantScatter',
  kind: 'block',
  scope: 'collection',
  label: 'Quadrant matrix',
  description: 'Two number fields scattered into four quadrants (median split) — prioritization at a glance',
  icon: '🎯',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 817,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'xField', type: 'field', collectionFrom: 'collection', label: 'X axis (number)', accepts: 'numeric', required: true },
    { name: 'yField', type: 'field', collectionFrom: 'collection', label: 'Y axis (number)', accepts: 'numeric', required: true },
    { name: 'labelField', type: 'field', collectionFrom: 'collection', label: 'Point label', accepts: 'text', hint: 'Shown for the labeled style and on hover' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'quad',
      label: 'Style',
      default: 'tint',
      options: [
        { label: 'Quadrant tint', value: 'tint' },
        { label: 'Dots only', value: 'dots' },
        { label: 'Labeled points', value: 'labeled' },
        { label: 'Minimal', value: 'minimal' },
      ],
    },
    { name: 'title', type: 'text', label: 'Title' },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
${THEME_FALLBACK}
function median(arr) {
  const a = arr.slice().sort(function (x, y) { return x - y; });
  return a.length ? a[Math.floor(a.length / 2)] : 0;
}

function Quad() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const fields = [$p.xField, $p.yField].concat($p.labelField ? [$p.labelField] : []);
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 300, fields: fields } });
        setRows(((res && res.data && res.data.data) || []).filter(function (r) {
          return r[$p.xField] != null && r[$p.yField] != null;
        }));
      } catch (e) { setRows([]); }
    })();
  }, []);
  if (!rows) return <div style={{ padding: 16, color: T.sub }}>Loading…</div>;
  if (!rows.length) return <div style={{ padding: 16, color: T.sub }}>No data points</div>;

  const xs = rows.map(function (r) { return Number(r[$p.xField]) || 0; });
  const ys = rows.map(function (r) { return Number(r[$p.yField]) || 0; });
  const mx = median(xs), my = median(ys);
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  const W = 460, H = 260, P = 14;
  function sx(v) { return P + ((v - minX) / ((maxX - minX) || 1)) * (W - P * 2); }
  function sy(v) { return H - P - ((v - minY) / ((maxY - minY) || 1)) * (H - P * 2); }
  const variant = $p.variant || 'tint';
  const mxp = sx(mx), myp = sy(my);

  return (
    <div style={{ padding: 12, background: T.bg }}>
      {$p.title ? <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{$p.title}</div> : null}
      <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block', maxWidth: W }}>
        {variant === 'tint' ? (
          <g>
            <rect x={mxp} y={0} width={W - mxp} height={myp} fill={T.primary + '14'} />
            <rect x={0} y={myp} width={mxp} height={H - myp} fill={T.sub + '0d'} />
          </g>
        ) : null}
        {variant !== 'minimal' ? (
          <g>
            <line x1={mxp} y1={0} x2={mxp} y2={H} stroke={T.border} strokeDasharray="4 4" />
            <line x1={0} y1={myp} x2={W} y2={myp} stroke={T.border} strokeDasharray="4 4" />
          </g>
        ) : null}
        {rows.slice(0, 200).map(function (r, i) {
          const x = sx(Number(r[$p.xField]) || 0);
          const y = sy(Number(r[$p.yField]) || 0);
          const hot = (Number(r[$p.xField]) || 0) >= mx && (Number(r[$p.yField]) || 0) >= my;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={hot ? 5 : 4} fill={hot ? T.primary : T.primary + '88'} stroke={T.bg} strokeWidth="1">
                <title>{($p.labelField ? (r[$p.labelField] || '') + ' · ' : '') + r[$p.xField] + ' / ' + r[$p.yField]}</title>
              </circle>
              {variant === 'labeled' && $p.labelField && r[$p.labelField] ? (
                <text x={x + 7} y={y + 3} fontSize="9" fill={T.sub}>{String(r[$p.labelField]).slice(0, 12)}</text>
              ) : null}
            </g>
          );
        })}
        <text x={W - P} y={12} fontSize="10" fill={T.sub} textAnchor="end">High {$p.yField} · High {$p.xField}</text>
        <text x={P} y={H - 4} fontSize="10" fill={T.sub}>Low {$p.yField} · Low {$p.xField}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.sub, maxWidth: W }}>
        <span>{$p.xField} →</span>
        <span>↑ {$p.yField}</span>
      </div>
    </div>
  );
}

ctx.render(<Quad />);
`,
};

// ─── 4. 标签云 tagCloud ──────────────────────────────────────────────────────

export const tagCloud: Template = {
  key: 'tagCloud',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'collection',
  label: 'Tag cloud',
  description: 'A field’s values sized by frequency — cloud / pills / bubbles',
  icon: '☁️',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 818,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'field', type: 'field', collectionFrom: 'collection', label: 'Tag field', required: true, hint: 'Enum / text field — each distinct value becomes a tag' },
    { name: 'limit', type: 'number', label: 'Max tags', default: 24 },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'tcloud',
      label: 'Style',
      default: 'cloud',
      options: [
        { label: 'Cloud', value: 'cloud' },
        { label: 'Count pills', value: 'pills' },
        { label: 'Bubbles', value: 'bubbles' },
        { label: 'Ranked rows', value: 'rows' },
      ],
    },
    { name: 'title', type: 'text', label: 'Title' },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
${THEME_FALLBACK}
${ENUM_LABEL_SNIPPET}
function TagCloud() {
  const [tags, setTags] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 800, fields: [$p.field] } });
        const rows = (res && res.data && res.data.data) || [];
        const counts = {};
        rows.forEach(function (r) {
          const v = r[$p.field];
          if (v === null || v === undefined || v === '') return;
          (Array.isArray(v) ? v : [v]).forEach(function (one) {
            const k = String(one);
            counts[k] = (counts[k] || 0) + 1;
          });
        });
        const list = Object.keys(counts).map(function (k) { return { v: k, n: counts[k] }; });
        list.sort(function (a, b) { return b.n - a.n; });
        setTags(list.slice(0, $p.limit || 24));
      } catch (e) { setTags([]); }
    })();
  }, []);
  if (!tags) return <div style={{ padding: 16, color: T.sub }}>Loading…</div>;
  if (!tags.length) return <div style={{ padding: 16, color: T.sub }}>No values</div>;

  const max = tags[0].n, min = tags[tags.length - 1].n;
  const variant = $p.variant || 'cloud';
  function scale(n, lo, hi) { return lo + ((n - min) / ((max - min) || 1)) * (hi - lo); }

  let bodyEl = null;
  if (variant === 'rows') {
    bodyEl = (
      <div>
        {tags.slice(0, 10).map(function (t, i) {
          return (
            <div key={t.v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <span style={{ width: 16, fontSize: 11, color: T.sub, textAlign: 'right' }}>{i + 1}</span>
              <span style={{ flex: '0 0 110px', fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf($p.field__enum, t.v)}</span>
              <span style={{ flex: 1, height: 6, borderRadius: 3, background: T.card, overflow: 'hidden' }}>
                <span style={{ display: 'block', width: Math.max(4, (t.n / max) * 100) + '%', height: '100%', borderRadius: 3, background: T.primary, opacity: 0.4 + 0.6 * (t.n / max) }} />
              </span>
              <b style={{ fontSize: 12, color: T.text, width: 30, textAlign: 'right' }}>{t.n}</b>
            </div>
          );
        })}
      </div>
    );
  } else if (variant === 'bubbles') {
    bodyEl = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        {tags.map(function (t) {
          const d = Math.round(scale(t.n, 34, 74));
          return (
            <span key={t.v} title={t.n + ''} style={{ width: d, height: d, borderRadius: '50%', background: T.primary, opacity: 0.35 + 0.65 * (t.n / max), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', overflow: 'hidden' }}>
              <span style={{ fontSize: Math.max(9, d / 5.5), fontWeight: 600, lineHeight: 1.1, padding: '0 4px', maxWidth: d - 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf($p.field__enum, t.v)}</span>
              <span style={{ fontSize: Math.max(8, d / 7), opacity: 0.85 }}>{t.n}</span>
            </span>
          );
        })}
      </div>
    );
  } else if (variant === 'pills') {
    bodyEl = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map(function (t) {
          return (
            <span key={t.v} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 4px 2px 10px', borderRadius: 14, fontSize: 12, background: T.card, border: '1px solid ' + T.border, color: T.text }}>
              {labelOf($p.field__enum, t.v)}
              <span style={{ padding: '0 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: T.primary, color: '#fff', opacity: 0.45 + 0.55 * (t.n / max) }}>{t.n}</span>
            </span>
          );
        })}
      </div>
    );
  } else {
    bodyEl = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline', justifyContent: 'center' }}>
        {tags.map(function (t, i) {
          return (
            <span key={t.v} title={t.n + ''} style={{ fontSize: Math.round(scale(t.n, 12, 28)), fontWeight: t.n === max ? 800 : 600, color: i % 3 === 0 ? T.primary : T.text, opacity: 0.5 + 0.5 * (t.n / max), lineHeight: 1.4 }}>
              {labelOf($p.field__enum, t.v)}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ padding: 14, background: T.bg }}>
      {$p.title ? <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 10 }}>{$p.title}</div> : null}
      {bodyEl}
    </div>
  );
}

ctx.render(<TagCloud />);
`,
};

// ─── 5. 滚动播报 ticker ──────────────────────────────────────────────────────

export const ticker: Template = {
  key: 'ticker',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'collection',
  label: 'News ticker',
  description: 'Latest records scrolling like a stock ticker — marquee / vertical roll',
  icon: '📢',
  category: 'Style',
  scenes: ['Dashboard'],
  sort: 819,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'textField', type: 'field', collectionFrom: 'collection', label: 'Text field', accepts: 'text', required: true },
    { name: 'limit', type: 'number', label: 'Items', default: 12 },
    { name: 'prefix', type: 'text', label: 'Prefix', default: '📢' },
    {
      name: 'speed',
      type: 'select',
      label: 'Speed',
      default: 'normal',
      options: [
        { label: 'Slow', value: 'slow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Fast', value: 'fast' },
      ],
    },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'ticker',
      label: 'Style',
      default: 'marquee',
      options: [
        { label: 'Marquee', value: 'marquee' },
        { label: 'Vertical roll', value: 'vertical' },
        { label: 'Accent bar', value: 'accent' },
      ],
    },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
${THEME_FALLBACK}
const ANIM = 'jstpl-ticker-' + (ctx.model && ctx.model.uid);

function Ticker() {
  const [items, setItems] = useState(null);
  const [idx, setIdx] = useState(0);
  useEffect(function () {
    (async function () {
      try {
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: $p.limit || 12, fields: [$p.textField], sort: ['-createdAt'] } });
        setItems(((res && res.data && res.data.data) || []).map(function (r) { return String(r[$p.textField] || ''); }).filter(Boolean));
      } catch (e) { setItems([]); }
    })();
  }, []);
  const variant = $p.variant || 'marquee';
  useEffect(function () {
    if (variant !== 'vertical' || !items || items.length < 2) return;
    const t = setInterval(function () { setIdx(function (i) { return (i + 1) % items.length; }); }, 2800);
    return function () { clearInterval(t); };
  }, [items, variant]);
  if (!items) return <div style={{ padding: 10, color: T.sub }}>Loading…</div>;
  if (!items.length) return <div style={{ padding: 10, color: T.sub }}>Nothing to report</div>;

  const dur = ($p.speed === 'fast' ? 14 : $p.speed === 'slow' ? 45 : 26);

  if (variant === 'vertical') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, overflow: 'hidden' }}>
        <span style={{ flexShrink: 0 }}>{$p.prefix || '📢'}</span>
        <div style={{ position: 'relative', height: 20, flex: 1, overflow: 'hidden' }}>
          {items.map(function (txt, i) {
            return (
              <div key={i} style={{ position: 'absolute', inset: 0, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'all .45s', opacity: i === idx ? 1 : 0, transform: 'translateY(' + (i === idx ? 0 : 14) + 'px)' }}>
                {txt}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 11, color: T.sub, flexShrink: 0 }}>{idx + 1}/{items.length}</span>
      </div>
    );
  }

  const row = items.map(function (txt, i) {
    return (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginRight: 36 }}>
        {variant === 'accent' ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 }} /> : null}
        <span style={{ fontSize: 13, color: variant === 'accent' ? T.text : T.text }}>{txt}</span>
      </span>
    );
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 8px 14px', background: variant === 'accent' ? T.card : T.bg, border: '1px solid ' + T.border, borderLeft: variant === 'accent' ? '3px solid ' + T.primary : '1px solid ' + T.border, borderRadius: 8, overflow: 'hidden' }}>
      <span style={{ flexShrink: 0 }}>{$p.prefix || '📢'}</span>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <style>{'@keyframes ' + ANIM + ' { from { transform: translateX(0); } to { transform: translateX(-50%); } }'}</style>
        <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: ANIM + ' ' + dur + 's linear infinite' }}>
          <span>{row}</span>
          <span>{row}</span>
        </div>
      </div>
    </div>
  );
}

ctx.render(<Ticker />);
`,
};

// ─── thumbs + previews(English mock samples)────────────────────────────────

const h = React.createElement;

const thumbBox = (kids: React.ReactNode, style?: React.CSSProperties) =>
  h('div', { style: { padding: '8px 6px', display: 'flex', flexDirection: 'column' as const, gap: 3, ...style } }, kids);

// pivot thumbs
const pivotThumb = (mode: string): ThumbFC => {
  const F: ThumbFC = ({ T }) => {
    const cell = (v: number, ri: number) => {
      const a = v / 9;
      const st: React.CSSProperties = { flex: 1, fontSize: 6, textAlign: 'right', padding: '1px 3px', color: T.text, borderBottom: '1px solid ' + T.border };
      if (mode === 'heat' && v) Object.assign(st, { background: T.primary + Math.round((0.1 + 0.7 * a) * 255).toString(16).padStart(2, '0'), color: a > 0.5 ? '#fff' : T.text });
      if (mode === 'zebra' && ri % 2) Object.assign(st, { background: T.card });
      return h('span', { key: Math.random(), style: st }, mode === 'bars' && v ? h('span', { style: { display: 'inline-block', width: (v / 9) * 14 + 2, height: 3, background: T.primary, borderRadius: 2, marginRight: 2 } }) : (v || '·'));
    };
    const data = [[9, 4, 2], [5, 7, 1], [2, 3, 6]];
    return thumbBox(
      data.map((r, ri) => h('div', { key: ri, style: { display: 'flex', gap: 1 } }, [h('span', { key: 'l', style: { fontSize: 6, color: T.sub, width: 16 } }, 'R' + (ri + 1)), ...r.map((v) => cell(v, ri))])),
    );
  };
  return F;
};
registerStyleThumbs('pivot', { heat: pivotThumb('heat'), plain: pivotThumb('plain'), zebra: pivotThumb('zebra'), bars: pivotThumb('bars') });

// trend kpi thumbs
const tkpiThumb = (mode: string): ThumbFC => {
  const F: ThumbFC = ({ T }) => {
    const spark = h('svg', { width: 56, height: 16, key: 's' },
      h('polyline', { points: '0,12 8,10 16,13 24,8 32,9 40,5 48,6 56,2', fill: 'none', stroke: T.primary, strokeWidth: 1.5 }));
    const bars = h('div', { key: 'b', style: { display: 'flex', alignItems: 'flex-end', gap: 1, height: 14 } },
      [4, 6, 3, 8, 7, 10, 9, 12].map((v, i) => h('span', { key: i, style: { width: 4, height: v, background: i >= 4 ? T.primary : T.border, borderRadius: 1 } })));
    if (mode === 'compact')
      return thumbBox(h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4, border: '1px solid ' + T.border, borderRadius: 5, padding: '4px 6px', background: T.bg } },
        h('b', { key: 'n', style: { fontSize: 11, color: T.text } }, '128'),
        h('span', { key: 'd', style: { fontSize: 7, color: '#52c41a', fontWeight: 700 } }, '▲ 12%')), { justifyContent: 'center' });
    return thumbBox([
      h('div', { key: 't', style: { display: 'flex', alignItems: 'center', gap: 4 } },
        h('b', { key: 'n', style: { fontSize: 13, color: T.text } }, '128'),
        mode === 'arrow' ? h('span', { key: 'a', style: { fontSize: 11, color: '#52c41a', fontWeight: 800 } }, '↗') : null,
        h('span', { key: 'd', style: { fontSize: 6, fontWeight: 700, color: '#52c41a', background: '#52c41a1a', borderRadius: 5, padding: '0 4px' } }, '+12%')),
      mode === 'bars' ? bars : spark,
    ]);
  };
  return F;
};
registerStyleThumbs('tkpi', { spark: tkpiThumb('spark'), arrow: tkpiThumb('arrow'), bars: tkpiThumb('bars'), compact: tkpiThumb('compact') });

// quadrant thumbs
const quadThumb = (mode: string): ThumbFC => {
  const F: ThumbFC = ({ T }) => {
    const dots = [[60, 10], [70, 22], [30, 30], [16, 12], [50, 34], [76, 8]];
    return thumbBox(
      h('svg', { width: 84, height: 44, style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 4 } }, [
        mode === 'tint' ? h('rect', { key: 'r', x: 42, y: 0, width: 42, height: 22, fill: T.primary + '18' }) : null,
        mode !== 'minimal' ? h('line', { key: 'v', x1: 42, y1: 0, x2: 42, y2: 44, stroke: T.border, strokeDasharray: '2 2' }) : null,
        mode !== 'minimal' ? h('line', { key: 'hh', x1: 0, y1: 22, x2: 84, y2: 22, stroke: T.border, strokeDasharray: '2 2' }) : null,
        ...dots.map((d, i) => h('circle', { key: i, cx: d[0], cy: d[1], r: d[0] > 42 && d[1] < 22 ? 3 : 2.2, fill: d[0] > 42 && d[1] < 22 ? T.primary : T.primary + '88' })),
        mode === 'labeled' ? h('text', { key: 't', x: 64, y: 8, fontSize: 4, fill: T.sub }, 'Alpha') : null,
      ]),
      { alignItems: 'center' },
    );
  };
  return F;
};
registerStyleThumbs('quad', { tint: quadThumb('tint'), dots: quadThumb('dots'), labeled: quadThumb('labeled'), minimal: quadThumb('minimal') });

// tag cloud thumbs
const tcloudThumb = (mode: string): ThumbFC => {
  const F: ThumbFC = ({ T }) => {
    if (mode === 'rows')
      return thumbBox([8, 5, 3].map((v, i) =>
        h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 3 } },
          h('span', { key: 'l', style: { fontSize: 6, color: T.text, width: 22 } }, ['Cloud', 'Edge', 'IoT'][i]),
          h('span', { key: 'b', style: { flex: 1, height: 4, background: T.card, borderRadius: 2 } },
            h('span', { style: { display: 'block', width: (v / 8) * 100 + '%', height: '100%', background: T.primary, borderRadius: 2 } })),
          h('b', { key: 'n', style: { fontSize: 6, color: T.text } }, String(v)))));
    if (mode === 'bubbles')
      return thumbBox(h('div', { style: { display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center' } },
        [26, 18, 13].map((d, i) => h('span', { key: i, style: { width: d, height: d, borderRadius: '50%', background: T.primary, opacity: 1 - i * 0.25, color: '#fff', fontSize: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ['Cloud', 'Edge', 'IoT'][i]))), { alignItems: 'center' });
    if (mode === 'pills')
      return thumbBox(h('div', { style: { display: 'flex', flexWrap: 'wrap' as const, gap: 2, justifyContent: 'center' } },
        ['Cloud 8', 'Edge 5', 'IoT 3'].map((s, i) => h('span', { key: i, style: { fontSize: 6, padding: '1px 5px', borderRadius: 7, background: T.card, border: '1px solid ' + T.border, color: T.text } }, s))), { justifyContent: 'center' });
    return thumbBox(h('div', { style: { textAlign: 'center' as const, lineHeight: 1.3 } }, [
      h('span', { key: 1, style: { fontSize: 13, fontWeight: 800, color: T.primary, margin: '0 3px' } }, 'Cloud'),
      h('span', { key: 2, style: { fontSize: 9, fontWeight: 600, color: T.text, margin: '0 3px' } }, 'Edge'),
      h('span', { key: 3, style: { fontSize: 7, color: T.sub, margin: '0 3px' } }, 'IoT'),
      h('span', { key: 4, style: { fontSize: 8, color: T.text, margin: '0 3px' } }, 'AI'),
    ]), { justifyContent: 'center' });
  };
  return F;
};
registerStyleThumbs('tcloud', { cloud: tcloudThumb('cloud'), pills: tcloudThumb('pills'), bubbles: tcloudThumb('bubbles'), rows: tcloudThumb('rows') });

// ticker thumbs
const tickerThumb = (mode: string): ThumbFC => {
  const F: ThumbFC = ({ T }) =>
    thumbBox(
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, border: '1px solid ' + T.border, borderLeft: mode === 'accent' ? '3px solid ' + T.primary : '1px solid ' + T.border, borderRadius: 5, padding: '4px 6px', background: mode === 'accent' ? T.card : T.bg, overflow: 'hidden' } }, [
        h('span', { key: 'p', style: { fontSize: 8 } }, '📢'),
        mode === 'vertical'
          ? h('span', { key: 't', style: { fontSize: 6, color: T.text } }, 'Order #1024 shipped ⌃')
          : h('span', { key: 't', style: { fontSize: 6, color: T.text, whiteSpace: 'nowrap' as const } }, 'Order #1024 shipped · New lead from…'),
      ]),
      { justifyContent: 'center' },
    );
  return F;
};
registerStyleThumbs('ticker', { marquee: tickerThumb('marquee'), vertical: tickerThumb('vertical'), accent: tickerThumb('accent') });

// previews
type PvProps = { params?: any; ctx?: any };
const PvFrame = (kids: React.ReactNode, T: ThemeTokens) =>
  h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 6, padding: 12, minHeight: 118, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' } }, kids);

const PivotPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'heat';
  const rows = [['Hardware', 9, 4, 2], ['Software', 5, 7, 1], ['Service', 2, 3, 6]] as [string, number, number, number][];
  return PvFrame(
    h('table', { key: 't', style: { borderCollapse: 'collapse', width: '100%', fontSize: 11 } }, [
      h('thead', { key: 'h' }, h('tr', {}, [h('th', { key: 0, style: { textAlign: 'left', color: T.sub, padding: 3 } }, ''), ...['Active', 'Repair', 'Retired'].map((c, i) => h('th', { key: i + 1, style: { textAlign: 'right', color: T.sub, padding: 3 } }, c)), h('th', { key: 9, style: { textAlign: 'right', color: T.text, padding: 3 } }, 'Σ')])),
      h('tbody', { key: 'b' }, rows.map(([name, ...vals], ri) =>
        h('tr', { key: ri }, [
          h('td', { key: 'n', style: { fontWeight: 600, color: T.text, padding: 3 } }, name),
          ...vals.map((v, ci) => {
            const a = v / 9;
            const st: React.CSSProperties = { textAlign: 'right', padding: 3, color: T.text };
            if (variant === 'heat') Object.assign(st, { background: T.primary + Math.round((0.08 + 0.7 * a) * 255).toString(16).padStart(2, '0'), color: a > 0.5 ? '#fff' : T.text, fontWeight: 600 });
            if (variant === 'zebra' && ri % 2) Object.assign(st, { background: T.card });
            return h('td', { key: ci, style: st }, variant === 'bars' ? h('span', {}, [h('span', { key: 'b', style: { display: 'inline-block', width: a * 22 + 3, height: 4, background: T.primary, borderRadius: 2, marginRight: 3 } }), String(v)]) : String(v));
          }),
          h('td', { key: 's', style: { textAlign: 'right', padding: 3, fontWeight: 700, color: T.primary } }, String(vals[0] + vals[1] + vals[2])),
        ]))),
    ]),
    T,
  );
};

const TrendKpiPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'spark';
  const spark = h('svg', { key: 's', width: 110, height: 30 }, [
    h('polyline', { key: 'l', points: '0,24 14,20 28,25 42,16 56,18 70,10 84,12 98,4 110,6', fill: 'none', stroke: T.primary, strokeWidth: 2 }),
    h('polygon', { key: 'a', points: '0,30 0,24 14,20 28,25 42,16 56,18 70,10 84,12 98,4 110,6 110,30', fill: T.primary + '22' }),
  ]);
  const bars = h('div', { key: 'b', style: { display: 'flex', alignItems: 'flex-end', gap: 3, height: 30 } },
    [8, 12, 6, 16, 14, 20, 18, 26].map((v, i) => h('span', { key: i, style: { width: 9, height: v, background: i >= 4 ? T.primary : T.border, borderRadius: 2 } })));
  if (variant === 'compact')
    return PvFrame(h('div', { style: { display: 'flex', justifyContent: 'center' } },
      h('div', { style: { display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '8px 14px', background: T.bg, border: '1px solid ' + T.border, borderRadius: 8 } }, [
        h('span', { key: 'l', style: { fontSize: 11, color: T.sub } }, params?.label || 'This month'),
        h('b', { key: 'n', style: { fontSize: 16, color: T.text } }, '128'),
        h('span', { key: 'd', style: { fontSize: 11, fontWeight: 700, color: '#52c41a' } }, '▲ 12.5%'),
      ])), T);
  return PvFrame(
    h('div', { style: { display: 'flex', justifyContent: 'center' } },
      h('div', { style: { padding: 12, background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, minWidth: 170 } }, [
        h('div', { key: 'l', style: { fontSize: 11, color: T.sub } }, params?.label || 'This month'),
        h('div', { key: 'r', style: { display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 6px' } }, [
          h('span', { key: 'n', style: { fontSize: 22, fontWeight: 800, color: T.text } }, '128'),
          variant === 'arrow' ? h('span', { key: 'a', style: { fontSize: 18, fontWeight: 800, color: '#52c41a' } }, '↗') : null,
          h('span', { key: 'd', style: { fontSize: 11, fontWeight: 700, color: '#52c41a', background: '#52c41a1a', borderRadius: 9, padding: '0 7px' } }, '+12.5%'),
        ]),
        variant === 'bars' ? bars : spark,
        h('div', { key: 'p', style: { fontSize: 10, color: T.sub, marginTop: 4 } }, 'previous: 114'),
      ])),
    T,
  );
};

const QuadPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'tint';
  const dots: [number, number, string][] = [[150, 18, 'Alpha'], [180, 44, 'Beta'], [70, 62, 'Gamma'], [36, 26, 'Delta'], [120, 70, 'Eps'], [196, 14, 'Zeta'], [90, 36, 'Eta']];
  return PvFrame(
    h('svg', { width: '100%', viewBox: '0 0 220 96', style: { maxWidth: 320, margin: '0 auto', background: T.bg, border: '1px solid ' + T.border, borderRadius: 6 } }, [
      variant === 'tint' ? h('rect', { key: 't', x: 110, y: 0, width: 110, height: 48, fill: T.primary + '14' }) : null,
      variant !== 'minimal' ? h('line', { key: 'v', x1: 110, y1: 0, x2: 110, y2: 96, stroke: T.border, strokeDasharray: '3 3' }) : null,
      variant !== 'minimal' ? h('line', { key: 'hl', x1: 0, y1: 48, x2: 220, y2: 48, stroke: T.border, strokeDasharray: '3 3' }) : null,
      ...dots.map(([x, y, name], i) => h('g', { key: i }, [
        h('circle', { key: 'c', cx: x, cy: y, r: x > 110 && y < 48 ? 4.5 : 3.5, fill: x > 110 && y < 48 ? T.primary : T.primary + '88', stroke: T.bg }),
        variant === 'labeled' ? h('text', { key: 't', x: x + 6, y: y + 3, fontSize: 7, fill: T.sub }, name) : null,
      ])),
      h('text', { key: 'q', x: 214, y: 10, fontSize: 7, fill: T.sub, textAnchor: 'end' }, 'High · High'),
    ]),
    T,
  );
};

const TagCloudPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'cloud';
  const tags: [string, number][] = [['Cloud', 18], ['Edge', 11], ['IoT', 8], ['AI', 14], ['SaaS', 6], ['Data', 9], ['API', 5]];
  if (variant === 'rows')
    return PvFrame(tags.slice(0, 4).map(([n, v], i) =>
      h('div', { key: n, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' } }, [
        h('span', { key: 'i', style: { width: 14, textAlign: 'right', fontSize: 10, color: T.sub } }, String(i + 1)),
        h('span', { key: 'n', style: { width: 50, fontSize: 11, color: T.text } }, n),
        h('span', { key: 'b', style: { flex: 1, height: 5, borderRadius: 3, background: T.bg } }, h('span', { style: { display: 'block', width: (v / 18) * 100 + '%', height: '100%', borderRadius: 3, background: T.primary } })),
        h('b', { key: 'v', style: { fontSize: 11, color: T.text } }, String(v)),
      ])), T);
  if (variant === 'bubbles')
    return PvFrame(h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' as const } },
      tags.slice(0, 5).map(([n, v]) => h('span', { key: n, style: { width: 24 + v * 1.6, height: 24 + v * 1.6, borderRadius: '50%', background: T.primary, opacity: 0.35 + 0.65 * (v / 18), color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, n))), T);
  if (variant === 'pills')
    return PvFrame(h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const } },
      tags.map(([n, v]) => h('span', { key: n, style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 4px 2px 9px', borderRadius: 12, background: T.bg, border: '1px solid ' + T.border, color: T.text } }, [n, h('span', { key: 'c', style: { padding: '0 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: T.primary, color: '#fff', opacity: 0.45 + 0.55 * (v / 18) } }, String(v))]))), T);
  return PvFrame(h('div', { style: { textAlign: 'center' as const, lineHeight: 1.6 } },
    tags.map(([n, v], i) => h('span', { key: n, style: { fontSize: 10 + (v / 18) * 14, fontWeight: v > 12 ? 800 : 600, color: i % 3 === 0 ? T.primary : T.text, opacity: 0.5 + 0.5 * (v / 18), margin: '0 7px' } }, n))), T);
};

const TickerPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'marquee';
  return PvFrame(
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: variant === 'accent' ? T.card : T.bg, border: '1px solid ' + T.border, borderLeft: variant === 'accent' ? '3px solid ' + T.primary : '1px solid ' + T.border, borderRadius: 8, overflow: 'hidden' } }, [
      h('span', { key: 'p' }, params?.prefix || '📢'),
      h('span', { key: 't', style: { fontSize: 12, color: T.text, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' } },
        variant === 'vertical' ? 'Order #1024 shipped to Berlin' : 'Order #1024 shipped · New lead from Acme · Stock low: SKU-88 · Invoice #220 paid'),
      variant === 'vertical' ? h('span', { key: 'i', style: { fontSize: 10, color: T.sub } }, '3/12') : null,
    ]),
    T,
  );
};

registerPreview('pivotTable', PivotPreview);
registerPreview('trendKpi', TrendKpiPreview);
registerPreview('quadrantScatter', QuadPreview);
registerPreview('tagCloud', TagCloudPreview);
registerPreview('ticker', TickerPreview);
