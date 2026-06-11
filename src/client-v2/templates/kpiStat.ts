import { themeParam, ThemeTokens, resolveThemeTokens } from '../core/themes';
import { Template } from '../core/types';
import { BLOCK_POPUP_SNIPPET, popupParams } from './shared';
import { RESOLVE_VALUE_SNIPPET, valueSourceOnSave, valueSourceParams } from './valueSource';
import { registerStyleThumbs } from '../core/styleThumbs';
import { registerPreview } from '../core/previews';
import React from 'react';

/**
 * KPI 统计卡片 — a big-number card. The number can come from an aggregate
 * (count/sum/avg/max/min), a SQL statement (runById-wrapped) or a JS snippet.
 * Ten visual variants on top of the unified theme.
 */
export const kpiStat: Template = {
  key: 'kpiStat',
  scope: 'collection',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'KPI stat card',
  description: 'A big-number card — aggregate / SQL / JS value, 10 styles',
  icon: '📊',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 805,
  params: [
    ...valueSourceParams(),
    { name: 'label', type: 'text', label: 'Card title' },
    { name: 'prefix', type: 'text', label: 'Prefix (e.g. ¥)' },
    { name: 'suffix', type: 'text', label: 'Suffix (e.g. items)' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'kpi',
      label: 'Style',
      default: 'minimal',
      options: [
        { label: 'Minimal', value: 'minimal' },
        { label: 'Gradient fill', value: 'gradient' },
        { label: 'Icon badge', value: 'icon' },
        { label: 'Accent bar', value: 'outline' },
        { label: 'Big number', value: 'bigNumber' },
        { label: 'Sparkline hint', value: 'sparkline' },
        { label: 'Progress ring', value: 'ring' },
        { label: 'Badge corner', value: 'badge' },
        { label: 'Split accent', value: 'splitAccent' },
        { label: 'Glass tile', value: 'glass' },
      ],
    },
    { name: 'icon', type: 'text', label: 'Icon (emoji)', default: '📊', showWhen: (p) => p.variant === 'icon' || p.variant === 'splitAccent' || p.variant === 'badge' },
    ...popupParams(['records', 'view']),
    themeParam,
  ],
  onSave: valueSourceOnSave,
  body:
    RESOLVE_VALUE_SNIPPET +
    BLOCK_POPUP_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0', gradient: 'linear-gradient(135deg,#1677ff,#13c2c2)' };

function Kpi() {
  const [val, setVal] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(function () {
    (async function () {
      try { setVal(await __resolveValue()); }
      catch (e) { setErr((e && e.message) || 'failed'); setVal(null); }
    })();
  }, []);

  const fmt = function (v) {
    if (v == null) return '—';
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toLocaleString('en-US', { maximumFractionDigits: $p.fn === 'avg' ? 2 : 0 });
  };
  const title = $p.label || $p.collection || '';
  const num = ($p.prefix || '') + fmt(val) + ($p.suffix ? ' ' + $p.suffix : '');
  const icon = $p.icon || '📊';
  if (err) return <div style={{ padding: 12, color: '#cf1322', fontSize: 12 }}>{err}</div>;

  const v = $p.variant || 'minimal';

  if (v === 'gradient') {
    return (
      <div style={{ padding: '16px 18px', background: T.gradient, borderRadius: 10, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -24, top: -24, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{num}</div>
      </div>
    );
  }
  if (v === 'icon') {
    return (
      <div style={{ padding: '14px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>
          {icon}
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 12, color: T.sub }}>{title}</span>
          <span style={{ display: 'block', fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1.15 }}>{num}</span>
        </span>
      </div>
    );
  }
  if (v === 'outline') {
    return (
      <div style={{ padding: '14px 18px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.primary }}>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.primary, lineHeight: 1 }}>{num}</div>
      </div>
    );
  }
  if (v === 'bigNumber') {
    return (
      <div style={{ padding: '14px 18px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{num}</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
      </div>
    );
  }
  if (v === 'sparkline') {
    const pts = [0.45, 0.3, 0.55, 0.4, 0.7, 0.6, 0.92];
    const W = 120, H = 34, n = pts.length;
    const path = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + (i / (n - 1) * W).toFixed(1) + ' ' + ((1 - p) * H).toFixed(1); }).join(' ');
    const area = path + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    return (
      <div style={{ padding: '14px 18px 10px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 4 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1 }}>{num}</div>
          <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} style={{ flexShrink: 0 }}>
            <path d={area} fill={T.primary} opacity={0.12} />
            <path d={path} fill="none" stroke={T.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={W} cy={(1 - pts[n - 1]) * H} r={3} fill={T.primary} />
          </svg>
        </div>
      </div>
    );
  }
  if (v === 'ring') {
    const pct = 0.72, R = 26, C = 2 * Math.PI * R;
    return (
      <div style={{ padding: '14px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
          <svg width={64} height={64}>
            <circle cx={32} cy={32} r={R} fill="none" stroke={T.card} strokeWidth={7} />
            <circle cx={32} cy={32} r={R} fill="none" stroke={T.primary} strokeWidth={7} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 32 32)" />
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: T.primary }}>72%</span>
        </div>
        <span>
          <span style={{ display: 'block', fontSize: 12, color: T.sub }}>{title}</span>
          <span style={{ display: 'block', fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1.15 }}>{num}</span>
        </span>
      </div>
    );
  }
  if (v === 'badge') {
    return (
      <div style={{ padding: '16px 18px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: 10, background: T.gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 17 }}>{icon}</span>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 6, paddingRight: 40 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1 }}>{num}</div>
      </div>
    );
  }
  if (v === 'splitAccent') {
    return (
      <div style={{ display: 'flex', alignItems: 'stretch', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, overflow: 'hidden' }}>
        <div style={{ width: 56, background: T.gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0 }}>{icon}</div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1 }}>{num}</div>
        </div>
      </div>
    );
  }
  if (v === 'glass') {
    return (
      <div style={{ padding: 2, borderRadius: 14, background: T.gradient }}>
        <div style={{ padding: '16px 18px', borderRadius: 12, background: T.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.62)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid ' + (T.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)') }}>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1 }}>{num}</div>
        </div>
      </div>
    );
  }
  // minimal (default)
  return (
    <div style={{ padding: '16px 18px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1 }}>{num}</div>
      <div style={{ marginTop: 10, height: 3, width: 44, borderRadius: 2, background: T.primary }} />
    </div>
  );
}

ctx.render(<ClickWrap><Kpi /></ClickWrap>);
`,
};

// ═══════════════════════════════════════════════════════════════════════════
// Variant thumbnails + a variant-following gallery preview.
//
// ⚠️ This is a `.ts` file (esbuild .ts loader = no JSX). Every React node below
// is built with `h` (= React.createElement). The JSX-looking markup inside the
// `body` string above is fine — it's a runtime string run by the sandbox, not
// compiled here.
//
// Registered as a side-effect on import so adding these variants never touches
// any core/ file. The four legacy thumbs (minimal/gradient/icon/outline) stay
// registered in core/styleThumbs.tsx; here we only add the six new ones.
// ═══════════════════════════════════════════════════════════════════════════

const h = React.createElement;
type ThumbFC = React.FC<{ T: ThemeTokens }>;

const KpiBigNumber: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px', textAlign: 'center' } },
    h('div', { style: { fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.02em' } }, '128k'),
    h('div', { style: { fontSize: 7, color: T.sub, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Sales'),
  );

const KpiSparkline: ThumbFC = ({ T }) => {
  const pts = [0.4, 0.25, 0.5, 0.35, 0.7, 0.92];
  const W = 44, H = 16, n = pts.length;
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + (i / (n - 1) * W).toFixed(1) + ' ' + ((1 - p) * H).toFixed(1)).join(' ');
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px' } },
    h('div', { style: { fontSize: 7, color: T.sub } }, 'Sales'),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5 } },
      h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.1 } }, '128k'),
      h(
        'svg',
        { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { flexShrink: 0 } },
        h('path', { d: path, fill: 'none', stroke: T.primary, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      ),
    ),
  );
};

const KpiRing: ThumbFC = ({ T }) => {
  const R = 11, C = 2 * Math.PI * R;
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8 } },
    h(
      'div',
      { style: { position: 'relative', width: 30, height: 30, flexShrink: 0 } },
      h(
        'svg',
        { width: 30, height: 30 },
        h('circle', { cx: 15, cy: 15, r: R, fill: 'none', stroke: T.card, strokeWidth: 4 }),
        h('circle', { cx: 15, cy: 15, r: R, fill: 'none', stroke: T.primary, strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * 0.28, transform: 'rotate(-90 15 15)' }),
      ),
    ),
    h(
      'span',
      null,
      h('span', { style: { display: 'block', fontSize: 7, color: T.sub } }, 'Sales'),
      h('span', { style: { display: 'block', fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1.1 } }, '128k'),
    ),
  );
};

const KpiBadge: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px', position: 'relative', overflow: 'hidden' } },
    h('span', { style: { position: 'absolute', right: 6, top: 6, width: 16, height: 16, borderRadius: 5, background: T.gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9 } }, '📊'),
    h('div', { style: { fontSize: 7, color: T.sub, paddingRight: 18 } }, 'Sales'),
    h('div', { style: { fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.1 } }, '128k'),
  );

const KpiSplitAccent: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { display: 'flex', alignItems: 'stretch', background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, overflow: 'hidden' } },
    h('div', { style: { width: 22, background: T.gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, flexShrink: 0 } }, '📊'),
    h(
      'div',
      { style: { padding: '7px 9px' } },
      h('div', { style: { fontSize: 7, color: T.sub } }, 'Sales'),
      h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.1 } }, '128k'),
    ),
  );

const KpiGlass: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { padding: 1.5, borderRadius: 8, background: T.gradient } },
    h(
      'div',
      { style: { padding: '6px 9px', borderRadius: 6.5, background: T.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)', border: '1px solid ' + (T.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.65)') } },
      h('div', { style: { fontSize: 7, color: T.sub } }, 'Sales'),
      h('div', { style: { fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.1 } }, '128k'),
    ),
  );

registerStyleThumbs('kpi', {
  bigNumber: KpiBigNumber,
  sparkline: KpiSparkline,
  ring: KpiRing,
  badge: KpiBadge,
  splitAccent: KpiSplitAccent,
  glass: KpiGlass,
});

// ── gallery preview — follows the selected variant (override core default) ───

type PreviewProps = { params?: any; ctx?: any };

const PFrame: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  h(
    'div',
    {
      style: {
        background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: 12,
        minHeight: 118, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      },
    },
    children,
  );

const KpiPreviewV: React.FC<PreviewProps> = ({ params, ctx }) => {
  const { useEffect, useState } = React;
  const T = resolveThemeTokens(params?.theme);
  const src = params?.valueSource || 'aggregate';
  const needRows = !!(params && src === 'aggregate' && params.collection && params.fn && params.fn !== 'count');

  // live fetch for aggregate sources, mirroring the core preview's behaviour
  const [live, setLive] = useState<{ rows: any[]; count: number | null }>({ rows: [], count: null });
  useEffect(() => {
    let alive = true;
    if (!ctx?.api || src !== 'aggregate' || !params?.collection) {
      setLive({ rows: [], count: null });
      return;
    }
    ctx.api
      .request({ url: params.collection + ':list', params: { pageSize: needRows ? 100 : 1 } })
      .then((res: any) => {
        if (!alive) return;
        setLive({ rows: res?.data?.data || [], count: res?.data?.meta?.count ?? (res?.data?.data || []).length });
      })
      .catch(() => alive && setLive({ rows: [], count: null }));
    return () => {
      alive = false;
    };
  }, [ctx, params?.collection, src, needRows]);

  // value: mock 128600 until a data source is picked — switching only the
  // theme/style must never blank the number
  let value: any = 128600;
  if (params && src === 'aggregate' && params.collection) {
    value = '—';
    if (!params.fn || params.fn === 'count') value = live.count ?? '—';
    else if (params.field) {
      const nums = live.rows.map((r) => Number(r[params.field])).filter((n) => !isNaN(n));
      if (params.fn === 'sum') value = nums.reduce((a, b) => a + b, 0);
      else if (params.fn === 'avg') value = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
      else if (params.fn === 'max') value = nums.length ? Math.max(...nums) : 0;
      else if (params.fn === 'min') value = nums.length ? Math.min(...nums) : 0;
    }
  }

  const numStr = typeof value === 'number' ? value.toLocaleString() : String(value);
  const display = (params?.prefix ?? (params ? '' : '¥')) + numStr + (params?.suffix ? ' ' + params.suffix : '');
  const title = params?.label || params?.collection || 'Revenue';
  const icon = params?.icon || '📊';
  const variant = params?.variant || 'minimal';

  let card: React.ReactNode;
  if (variant === 'gradient') {
    card = h(
      'div',
      { style: { background: T.gradient, borderRadius: 10, padding: '12px 14px', color: '#fff', position: 'relative', overflow: 'hidden' } },
      h('div', { style: { position: 'absolute', right: -18, top: -18, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' } }),
      h('div', { style: { fontSize: 12, opacity: 0.85, marginBottom: 4 } }, title),
      h('div', { style: { fontSize: 22, fontWeight: 700, lineHeight: 1 } }, display),
    );
  } else if (variant === 'icon') {
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 } },
      h('span', { style: { width: 38, height: 38, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, display: 'grid', placeItems: 'center', fontSize: 19, flexShrink: 0 } }, icon),
      h(
        'span',
        null,
        h('span', { style: { display: 'block', fontSize: 11, color: T.sub } }, title),
        h('span', { style: { display: 'block', fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.15 } }, display),
      ),
    );
  } else if (variant === 'outline') {
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.primary, padding: '10px 14px' } },
      h('div', { style: { fontSize: 12, color: T.sub, marginBottom: 4 } }, title),
      h('div', { style: { fontSize: 22, fontWeight: 700, color: T.primary, lineHeight: 1 } }, display),
    );
  } else if (variant === 'bigNumber') {
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 14px', textAlign: 'center' } },
      h('div', { style: { fontSize: 34, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.02em' } }, display),
      h('div', { style: { fontSize: 11, color: T.sub, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' } }, title),
    );
  } else if (variant === 'sparkline') {
    const pts = [0.45, 0.3, 0.55, 0.4, 0.7, 0.6, 0.92];
    const W = 110, H = 30, n = pts.length;
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + (i / (n - 1) * W).toFixed(1) + ' ' + ((1 - p) * H).toFixed(1)).join(' ');
    const area = path + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 14px 8px', overflow: 'hidden' } },
      h('div', { style: { fontSize: 12, color: T.sub, marginBottom: 4 } }, title),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 } },
        h('div', { style: { fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 } }, display),
        h(
          'svg',
          { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { flexShrink: 0 } },
          h('path', { d: area, fill: T.primary, opacity: 0.12 }),
          h('path', { d: path, fill: 'none', stroke: T.primary, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          h('circle', { cx: W, cy: (1 - pts[n - 1]) * H, r: 3, fill: T.primary }),
        ),
      ),
    );
  } else if (variant === 'ring') {
    const pct = 0.72, R = 24, C = 2 * Math.PI * R;
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 14 } },
      h(
        'div',
        { style: { position: 'relative', width: 58, height: 58, flexShrink: 0 } },
        h(
          'svg',
          { width: 58, height: 58 },
          h('circle', { cx: 29, cy: 29, r: R, fill: 'none', stroke: T.card, strokeWidth: 7 }),
          h('circle', { cx: 29, cy: 29, r: R, fill: 'none', stroke: T.primary, strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * (1 - pct), transform: 'rotate(-90 29 29)' }),
        ),
        h('span', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: T.primary } }, '72%'),
      ),
      h(
        'span',
        null,
        h('span', { style: { display: 'block', fontSize: 11, color: T.sub } }, title),
        h('span', { style: { display: 'block', fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.15 } }, display),
      ),
    );
  } else if (variant === 'badge') {
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 14px', position: 'relative', overflow: 'hidden' } },
      h('span', { style: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 9, background: T.gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16 } }, icon),
      h('div', { style: { fontSize: 12, color: T.sub, marginBottom: 4, paddingRight: 36 } }, title),
      h('div', { style: { fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 } }, display),
    );
  } else if (variant === 'splitAccent') {
    card = h(
      'div',
      { style: { display: 'flex', alignItems: 'stretch', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, overflow: 'hidden' } },
      h('div', { style: { width: 48, background: T.gradient, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 } }, icon),
      h(
        'div',
        { style: { padding: '10px 14px' } },
        h('div', { style: { fontSize: 12, color: T.sub, marginBottom: 4 } }, title),
        h('div', { style: { fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 } }, display),
      ),
    );
  } else if (variant === 'glass') {
    card = h(
      'div',
      { style: { padding: 2, borderRadius: 12, background: T.gradient } },
      h(
        'div',
        { style: { padding: '12px 14px', borderRadius: 10, background: T.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.62)', border: '1px solid ' + (T.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.6)') } },
        h('div', { style: { fontSize: 12, color: T.sub, marginBottom: 4 } }, title),
        h('div', { style: { fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 } }, display),
      ),
    );
  } else {
    card = h(
      'div',
      { style: { background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 14px' } },
      h('div', { style: { fontSize: 12, color: T.sub, marginBottom: 4 } }, title),
      h('div', { style: { fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 } }, display),
      h('div', { style: { marginTop: 8, height: 3, width: 36, borderRadius: 2, background: T.primary } }),
    );
  }

  return h(PFrame, null, card);
};

registerPreview('kpiStat', KpiPreviewV);
