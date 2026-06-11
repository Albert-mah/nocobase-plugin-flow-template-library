import { themeParam } from '../core/themes';
import { BLOCK_POPUP_SNIPPET, popupParams, ROW_POPUP_SNIPPET } from './shared';
import { RESOLVE_VALUE_SNIPPET, valueSourceOnSave, valueSourceParams } from './valueSource';
import { Template } from '../core/types';
import { registerStyleThumbs } from '../core/styleThumbs';
import { registerPreview } from '../core/previews';
import { ThemeTokens, resolveThemeTokens } from '../core/themes';
import React from 'react';

/** 分布条形图 — group rows by a field, show top-N horizontal bars with counts */
export const distribution: Template = {
  key: 'distribution',
  scope: 'collection',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Distribution bars',
  description: 'Group records by a field and show bars / pills / columns / donut (top N)',
  icon: '📊',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 810,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    {
      name: 'field',
      type: 'field',
      label: 'Group-by field',
      collectionFrom: 'collection',
      required: true,
      hint: 'Rows are grouped by this field (enum / select / text).',
    },
    { name: 'limit', type: 'number', label: 'Max bars (top N)', default: 8 },
    { name: 'label', type: 'text', label: 'Block title' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'dist',
      label: 'Style',
      default: 'bars',
      options: [
        { label: 'Bars', value: 'bars' },
        { label: 'Pills', value: 'pills' },
        { label: 'Columns', value: 'columns' },
        { label: 'Donut', value: 'donut' },
        { label: 'Stacked 100%', value: 'stacked' },
        { label: 'Radial', value: 'radial' },
        { label: 'Lollipop', value: 'lollipop' },
      ],
    },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

// native option labels/colors of the chosen field, captured at insert time
const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const ANTD_COLORS = { blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1', magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d', default: T.primary };
function optOf(rawKey) {
  return enumOpts.find(function (o) { return String(o.value) === rawKey; });
}

function Distribution() {
  const [items, setItems] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(500);
        await ctx.resource.refresh();
        const rows = ctx.resource.getData() || [];
        const counts = {};
        rows.forEach(function (r) {
          let v = r[$p.field];
          if (v == null || v === '') v = '(empty)';
          v = String(v);
          counts[v] = (counts[v] || 0) + 1;
        });
        let arr = Object.keys(counts).map(function (k) {
          const o = optOf(k);
          return {
            label: (o && o.label) || k,
            color: (o && o.color && (ANTD_COLORS[o.color] || o.color)) || T.primary,
            count: counts[k],
          };
        });
        arr.sort(function (a, b) { return b.count - a.count; });
        const limit = Number($p.limit) > 0 ? Number($p.limit) : 8;
        arr = arr.slice(0, limit);
        setItems(arr);
      } catch (e) { setItems([]); }
    })();
  }, []);

  if (items == null) return <div style={{ padding: '12px', color: T.sub, background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>Loading…</div>;
  if (!items.length) return <div style={{ padding: '12px', color: T.sub, background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>No data.</div>;

  const max = items.reduce(function (m, it) { return it.count > m ? it.count : m; }, 0) || 1;
  const total = items.reduce(function (s, it) { return s + it.count; }, 0) || 1;
  const v = $p.variant || 'bars';
  const titleEl = $p.label ? (<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div>) : null;

  if (v === 'pills') {
    return (
      <div style={{ padding: '10px 12px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(function (it, i) {
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 14, background: T.card, border: '1px solid ' + T.border, fontSize: 12, color: T.text }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{it.label}</span>
                <b style={{ color: T.text }}>{it.count}</b>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (v === 'columns') {
    return (
      <div style={{ padding: '10px 12px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110, paddingTop: 6 }}>
          {items.map(function (it, i) {
            const h = Math.max(6, Math.round(it.count / max * 84));
            return (
              <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <b style={{ fontSize: 11, color: T.text, marginBottom: 3 }}>{it.count}</b>
                <div style={{ width: '100%', height: h, background: it.color, borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 11, color: T.sub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{it.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (v === 'donut') {
    const R = 52, SW = 18, C = 2 * Math.PI * R;
    let off = 0;
    const segs = items.map(function (it) {
      const frac = it.count / total;
      const seg = { frac: frac, color: it.color, off: off };
      off += frac;
      return seg;
    });
    return (
      <div style={{ padding: '10px 12px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <svg width="130" height="130">
              {segs.map(function (s, i) {
                return (
                  <circle key={i} cx="65" cy="65" r={R} fill="none" stroke={s.color} strokeWidth={SW}
                    strokeDasharray={(s.frac * C) + ' ' + C} strokeDashoffset={-s.off * C} transform="rotate(-90 65 65)" />
                );
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700, color: T.text }}>{total}</div>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            {items.map(function (it, i) {
              const pct = Math.round(it.count / total * 100);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                  <b style={{ color: T.text }}>{it.count}</b>
                  <span style={{ color: T.sub, width: 36, textAlign: 'right' }}>{pct + '%'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (v === 'stacked') {
    return (
      <div style={{ padding: '12px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', background: T.card }}>
          {items.map(function (it, i) {
            const pct = it.count / total * 100;
            return (
              <div key={i} title={it.label} style={{ width: pct + '%', background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, overflow: 'hidden' }}>
                {pct >= 9 ? Math.round(pct) + '%' : ''}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {items.map(function (it, i) {
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.sub }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: it.color, flexShrink: 0 }} />
                <span style={{ color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{it.label}</span>
                <b style={{ color: T.text }}>{it.count}</b>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (v === 'radial') {
    const rings = items.slice(0, 5);
    const SW = 11, GAP = 4, base = 16;
    const maxR = base + (rings.length - 1) * (SW + GAP);
    const size = (maxR + SW / 2 + 4) * 2;
    const cx = size / 2;
    return (
      <div style={{ padding: '10px 12px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size}>
              {rings.map(function (it, i) {
                const r = base + i * (SW + GAP);
                const C = 2 * Math.PI * r;
                const frac = it.count / max;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cx} r={r} fill="none" stroke={T.card} strokeWidth={SW} />
                    <circle cx={cx} cy={cx} r={r} fill="none" stroke={it.color} strokeWidth={SW} strokeLinecap="round"
                      strokeDasharray={(frac * C) + ' ' + C} transform={'rotate(-90 ' + cx + ' ' + cx + ')'} />
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            {rings.map(function (it, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: it.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                  <b style={{ color: T.text }}>{it.count}</b>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (v === 'lollipop') {
    return (
      <div style={{ padding: '10px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        {items.map(function (it, i) {
          const w = Math.max(4, it.count / max * 100);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <span style={{ width: '32%', fontSize: 12, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{it.label}</span>
              <div style={{ flex: 1, position: 'relative', height: 14, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: 0, width: w + '%', height: 3, background: it.color, borderRadius: 2 }} />
                <span style={{ position: 'absolute', left: 'calc(' + w + '% - 6px)', width: 12, height: 12, borderRadius: '50%', background: it.color, boxShadow: '0 0 0 3px ' + T.bg }} />
              </div>
              <b style={{ width: 38, textAlign: 'right', fontSize: 12, color: T.text, flexShrink: 0 }}>{it.count}</b>
            </div>
          );
        })}
      </div>
    );
  }

  // bars (default)
  return (
    <div style={{ padding: '10px 12px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {titleEl}
      {items.map(function (it, i) {
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: T.sub }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{it.label}</span>
              <b style={{ color: T.text }}>{it.count}</b>
            </div>
            <div style={{ background: T.card, borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{ width: (it.count / max * 100) + '%', height: '100%', background: it.color, borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

ctx.render(<Distribution />);
`,
};

/** 目标进度 — aggregate over a collection vs a target number, as a progress bar */
export const progressGoal: Template = {
  key: 'progressGoal',
  scope: 'collection',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Progress toward goal',
  description: 'Progress vs a target: bar / ring / gauge / segments',
  icon: '🎯',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 811,
  params: [
    ...valueSourceParams(),
    { name: 'target', type: 'number', label: 'Target value', required: true },
    ...popupParams(['records', 'view']),
    { name: 'label', type: 'text', label: 'Block title' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'goal',
      label: 'Style',
      default: 'bar',
      options: [
        { label: 'Bar', value: 'bar' },
        { label: 'Ring', value: 'ring' },
        { label: 'Gauge', value: 'gauge' },
        { label: 'Segments', value: 'segments' },
        { label: 'Thermometer', value: 'thermometer' },
        { label: 'Steps dots', value: 'steps' },
        { label: 'Arc', value: 'arc' },
      ],
    },
    themeParam,
  ],
  onSave: valueSourceOnSave,
  body:
    RESOLVE_VALUE_SNIPPET +
    BLOCK_POPUP_SNIPPET +
    `
const { Progress } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function ProgressGoal() {
  const [current, setCurrent] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const v = await __resolveValue();
        setCurrent(v == null ? 0 : v);
      } catch (e) { setCurrent(0); }
    })();
  }, []);

  const target = Number($p.target) || 0;
  const cur = current == null ? 0 : current;
  const pct = target > 0 ? Math.round(cur / target * 100) : 0;
  const clamped = Math.min(pct, 100);
  const done = pct >= 100;
  const accent = done ? '#52c41a' : T.primary;
  const fmt = function (n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  const v = $p.variant || 'bar';
  const titleEl = $p.label ? (<div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: T.text }}>{$p.label}</div>) : null;
  const caption = (
    <div style={{ marginTop: 6, fontSize: 13, color: T.sub }}>
      <b style={{ color: T.text }}>{current == null ? '—' : fmt(cur)}</b>
      {' / '}{fmt(target)}{'  ('}{pct}{'%)'}
    </div>
  );

  if (v === 'ring') {
    const R = 46, SW = 12, C = 2 * Math.PI * R;
    return (
      <div style={{ padding: '12px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 116, height: 116, flexShrink: 0 }}>
            <svg width="116" height="116">
              <circle cx="58" cy="58" r={R} fill="none" stroke={T.card} strokeWidth={SW} />
              <circle cx="58" cy="58" r={R} fill="none" stroke={accent} strokeWidth={SW} strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - clamped / 100)} transform="rotate(-90 58 58)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, color: accent }}>{pct + '%'}</div>
          </div>
          <div style={{ fontSize: 13, color: T.sub }}>
            <b style={{ color: T.text, fontSize: 18, display: 'block' }}>{current == null ? '—' : fmt(cur)}</b>
            <span>{'of ' + fmt(target)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (v === 'gauge') {
    const R = 54, SW = 14, C = Math.PI * R; // half circle
    return (
      <div style={{ padding: '12px 16px 6px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ position: 'relative', width: 150, height: 84, margin: '0 auto' }}>
          <svg width="150" height="84" viewBox="0 0 150 84">
            <path d={'M 16 75 A ' + R + ' ' + R + ' 0 0 1 134 75'} fill="none" stroke={T.card} strokeWidth={SW} strokeLinecap="round" />
            <path d={'M 16 75 A ' + R + ' ' + R + ' 0 0 1 134 75'} fill="none" stroke={accent} strokeWidth={SW} strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - clamped / 100)} />
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center', fontSize: 22, fontWeight: 700, color: accent }}>{pct + '%'}</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: T.sub, marginTop: 2 }}>
          <b style={{ color: T.text }}>{current == null ? '—' : fmt(cur)}</b>{' / ' + fmt(target)}
        </div>
      </div>
    );
  }

  if (v === 'segments') {
    const N = 10;
    const filled = Math.round(clamped / 100 * N);
    return (
      <div style={{ padding: '12px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: N }).map(function (_, i) {
            return <div key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: i < filled ? accent : T.card }} />;
          })}
        </div>
        {caption}
      </div>
    );
  }

  if (v === 'thermometer') {
    return (
      <div style={{ padding: '12px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ position: 'relative', width: 18, height: 96, flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: 4, top: 0, width: 10, height: 80, borderRadius: 5, background: T.card }} />
            <div style={{ position: 'absolute', left: 4, bottom: 16, width: 10, height: Math.max(4, clamped / 100 * 80), borderRadius: 5, background: accent }} />
            <div style={{ position: 'absolute', left: 0, bottom: 0, width: 18, height: 18, borderRadius: '50%', background: accent }} />
          </div>
          <div style={{ flex: 1, fontSize: 13, color: T.sub }}>
            <b style={{ color: accent, fontSize: 24, display: 'block', lineHeight: 1 }}>{pct + '%'}</b>
            <span style={{ display: 'block', marginTop: 6 }}><b style={{ color: T.text }}>{current == null ? '—' : fmt(cur)}</b>{' / ' + fmt(target)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (v === 'steps') {
    const N = 5;
    const filled = clamped / 100 * N;
    return (
      <div style={{ padding: '14px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {Array.from({ length: N }).map(function (_, i) {
            const on = i < Math.round(filled);
            return (
              <ctx.React.Fragment key={i}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: on ? accent : T.bg, border: on ? 'none' : '2px solid ' + T.border, color: '#fff', fontSize: 10, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                {i < N - 1 ? <span style={{ flex: 1, height: 3, borderRadius: 2, background: i < Math.round(filled) - 1 ? accent : T.card }} /> : null}
              </ctx.React.Fragment>
            );
          })}
        </div>
        {caption}
      </div>
    );
  }

  if (v === 'arc') {
    const R = 50, SW = 12;
    const sweep = 270; // degrees of the open arc
    const C = 2 * Math.PI * R;
    const arcLen = C * (sweep / 360);
    return (
      <div style={{ padding: '12px 16px 6px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {titleEl}
        <div style={{ position: 'relative', width: 128, height: 128, margin: '0 auto' }}>
          <svg width="128" height="128">
            <circle cx="64" cy="64" r={R} fill="none" stroke={T.card} strokeWidth={SW} strokeLinecap="round"
              strokeDasharray={arcLen + ' ' + C} transform="rotate(135 64 64)" />
            <circle cx="64" cy="64" r={R} fill="none" stroke={accent} strokeWidth={SW} strokeLinecap="round"
              strokeDasharray={(arcLen * clamped / 100) + ' ' + C} transform="rotate(135 64 64)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>{pct + '%'}</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{current == null ? '—' : fmt(cur)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // bar (default)
  return (
    <div style={{ padding: '12px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {titleEl}
      <Progress percent={clamped} status={done ? 'success' : 'active'} strokeColor={T.primary} />
      {caption}
    </div>
  );
}

ctx.render(<ClickWrap><ProgressGoal /></ClickWrap>);
`,
};

/** 最近记录 — most recent N records of a collection as a feed */
export const recentList: Template = {
  key: 'recentList',
  scope: 'collection',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Recent records feed',
  description: 'Most recent N records as list / timeline / cards / compact',
  icon: '🕒',
  category: 'Data',
  scenes: ['Dashboard'],
  sort: 812,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'titleField', type: 'field', label: 'Title field', collectionFrom: 'collection' },
    { name: 'subtitleField', type: 'field', label: 'Subtitle field', collectionFrom: 'collection' },
    {
      name: 'timeField',
      type: 'field',
      label: 'Time field',
      collectionFrom: 'collection',
      hint: 'Sort newest-first by this field. Defaults to createdAt.',
    },
    { name: 'limit', type: 'number', label: 'How many', default: 8 },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'recent',
      label: 'Style',
      default: 'list',
      options: [
        { label: 'List', value: 'list' },
        { label: 'Timeline', value: 'timeline' },
        { label: 'Cards', value: 'cards' },
        { label: 'Compact', value: 'compact' },
        { label: 'Avatar rows', value: 'avatar' },
        { label: 'Numbered', value: 'numbered' },
        { label: 'Feed', value: 'feed' },
      ],
    },
    ...popupParams(['detail', 'view']),
    themeParam,
  ],
  body:
    ROW_POPUP_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function RecentList() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const timeField = $p.timeField || 'createdAt';
        const limit = Number($p.limit) > 0 ? Number($p.limit) : 8;
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(limit);
        if (ctx.resource.setSort) ctx.resource.setSort(['-' + timeField]);
        await ctx.resource.refresh();
        setRows(ctx.resource.getData() || []);
      } catch (e) { setRows([]); }
    })();
  }, []);

  const fmtTime = function (v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (rows == null) return <div style={{ padding: '12px', color: T.sub, background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>Loading…</div>;
  if (!rows.length) return <div style={{ padding: '12px', color: T.sub, background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>No records.</div>;

  const v = $p.variant || 'list';
  const rowOf = function (r, i) {
    const title = $p.titleField ? r[$p.titleField] : (r.title || r.name || ('#' + (r.id != null ? r.id : i)));
    const subtitle = $p.subtitleField ? r[$p.subtitleField] : '';
    const time = fmtTime(r[$p.timeField || 'createdAt']);
    return { title: title, subtitle: subtitle, time: time };
  };
  const initials = function (s) {
    const t = (s == null ? '' : String(s)).trim();
    return t ? t.slice(0, 1).toUpperCase() : '·';
  };

  if (v === 'timeline') {
    return (
      <div style={{ padding: '10px 14px 2px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const d = rowOf(r, i);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.primary, marginTop: 4, flexShrink: 0 }} />
                {i < rows.length - 1 ? <span style={{ flex: 1, width: 2, background: T.border, minHeight: 14 }} /> : null}
              </div>
              <div style={{ paddingBottom: 12, minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: T.sub }}>{d.time}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title == null || d.title === '' ? '—' : String(d.title)}
                </div>
                {d.subtitle ? <div style={{ fontSize: 12, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(d.subtitle)}</div> : null}
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'cards') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {rows.map(function (r, i) {
          const d = rowOf(r, i);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, borderTop: '3px solid ' + T.primary, padding: '10px 12px', height: '100%' }}>
              <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{d.time}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.title == null || d.title === '' ? '—' : String(d.title)}
              </div>
              {d.subtitle ? <div style={{ fontSize: 12, color: T.sub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(d.subtitle)}</div> : null}
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'compact') {
    return (
      <div style={{ padding: '2px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const d = rowOf(r, i);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: T.card, color: T.primary, fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{initials(d.title)}</span>
              <span style={{ flex: 1, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.title == null || d.title === '' ? '—' : String(d.title)}
              </span>
              <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap', flexShrink: 0 }}>{d.time}</span>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  const AV_COLORS = ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
  const avColor = function (s) {
    const t = (s == null ? '' : String(s));
    let n = 0;
    for (let k = 0; k < t.length; k++) n = (n + t.charCodeAt(k)) % AV_COLORS.length;
    return AV_COLORS[n];
  };

  if (v === 'avatar') {
    return (
      <div style={{ padding: '2px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const d = rowOf(r, i);
          const c = avColor(d.title);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: c, color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{initials(d.title)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title == null || d.title === '' ? '—' : String(d.title)}
                </div>
                {d.subtitle ? <div style={{ fontSize: 12, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(d.subtitle)}</div> : null}
              </div>
              <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap', flexShrink: 0 }}>{d.time}</span>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'numbered') {
    return (
      <div style={{ padding: '2px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const d = rowOf(r, i);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.primary, opacity: 0.5, width: 26, textAlign: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title == null || d.title === '' ? '—' : String(d.title)}
                </div>
                {d.subtitle ? <div style={{ fontSize: 12, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(d.subtitle)}</div> : null}
              </div>
              <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap', flexShrink: 0 }}>{d.time}</span>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'feed') {
    return (
      <div style={{ padding: '10px 12px 2px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const d = rowOf(r, i);
          const c = avColor(d.title);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{initials(d.title)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: T.sub, marginBottom: 2 }}>{d.time}</div>
                <div style={{ background: T.card, borderRadius: '2px 10px 10px 10px', padding: '7px 10px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title == null || d.title === '' ? '—' : String(d.title)}
                  </div>
                  {d.subtitle ? <div style={{ fontSize: 12, color: T.sub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(d.subtitle)}</div> : null}
                </div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  // list (default)
  return (
    <div style={{ padding: '4px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {rows.map(function (r, i) {
        const d = rowOf(r, i);
        return (
          <RowClick rec={r} key={r.id != null ? r.id : i}>
          <div style={{ padding: '8px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                {d.title == null || d.title === '' ? '—' : String(d.title)}
              </span>
              <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap', marginLeft: 8 }}>{d.time}</span>
            </div>
            {d.subtitle ? (
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {String(d.subtitle)}
              </div>
            ) : null}
          </div>
          </RowClick>
        );
      })}
    </div>
  );
}

ctx.render(<RecentList />);
`,
};

/** 通知横幅 — static styled callout (Alert) */
export const noticeBanner: Template = {
  key: 'noticeBanner',
  scope: 'any',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Notice banner',
  description: 'A static styled callout — alert / outline / left-accent / icon tile',
  icon: '📢',
  category: 'Style',
  scenes: ['Dashboard', 'Popup'],
  sort: 813,
  params: [
    { name: 'title', type: 'text', label: 'Title' },
    { name: 'text', type: 'text', label: 'Body text' },
    {
      name: 'type',
      type: 'select',
      label: 'Severity',
      default: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
      ],
    },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'notice',
      label: 'Style',
      default: 'alert',
      options: [
        { label: 'Alert', value: 'alert' },
        { label: 'Outline', value: 'outline' },
        { label: 'Left accent', value: 'leftAccent' },
        { label: 'Icon tile', value: 'iconTile' },
        { label: 'Gradient', value: 'gradient' },
        { label: 'Ribbon', value: 'ribbon' },
        { label: 'Minimal inline', value: 'minimal' },
      ],
    },
    themeParam,
  ],
  body: `
const { Alert } = ctx.antd;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const SEV = {
  info: { color: '#1677ff', icon: 'ℹ️' },
  success: { color: '#52c41a', icon: '✅' },
  warning: { color: '#faad14', icon: '⚠️' },
  error: { color: '#ff4d4f', icon: '⛔' },
};

function hexToRgba(hex, a) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function NoticeBanner() {
  const sev = SEV[$p.type || 'info'] || SEV.info;
  const v = $p.variant || 'alert';
  const title = $p.title || '';
  const text = $p.text || '';

  if (v === 'outline') {
    return (
      <div style={{ padding: '12px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + sev.color }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 16, lineHeight: 1.3 }}>{sev.icon}</span>
          <span style={{ minWidth: 0 }}>
            {title ? <div style={{ fontSize: 13, fontWeight: 600, color: sev.color }}>{title}</div> : null}
            {text ? <div style={{ fontSize: 12, color: T.sub, marginTop: title ? 2 : 0 }}>{text}</div> : null}
          </span>
        </div>
      </div>
    );
  }

  if (v === 'leftAccent') {
    return (
      <div style={{ padding: '12px 14px', background: hexToRgba(sev.color, 0.08), borderRadius: 10, borderLeft: '4px solid ' + sev.color }}>
        {title ? <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</div> : null}
        {text ? <div style={{ fontSize: 12, color: T.sub, marginTop: title ? 2 : 0 }}>{text}</div> : null}
      </div>
    );
  }

  if (v === 'iconTile') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: hexToRgba(sev.color, 0.14), color: sev.color, display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>{sev.icon}</span>
        <span style={{ minWidth: 0 }}>
          {title ? <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</div> : null}
          {text ? <div style={{ fontSize: 12, color: T.sub, marginTop: title ? 2 : 0 }}>{text}</div> : null}
        </span>
      </div>
    );
  }

  if (v === 'gradient') {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(135deg,' + sev.color + ',' + hexToRgba(sev.color, 0.7) + ')', color: '#fff' }}>
        <div style={{ position: 'absolute', right: -24, top: -24, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{sev.icon}</span>
          <span style={{ minWidth: 0 }}>
            {title ? <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div> : null}
            {text ? <div style={{ fontSize: 12, opacity: 0.9, marginTop: title ? 2 : 0 }}>{text}</div> : null}
          </span>
        </div>
      </div>
    );
  }

  if (v === 'ribbon') {
    return (
      <div style={{ display: 'flex', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, overflow: 'hidden' }}>
        <div style={{ width: 8, background: sev.color, flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minWidth: 0 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{sev.icon}</span>
          <span style={{ minWidth: 0 }}>
            {title ? <div style={{ fontSize: 13, fontWeight: 700, color: T.text, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {title}
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: sev.color, background: hexToRgba(sev.color, 0.12), borderRadius: 4, padding: '1px 6px' }}>{$p.type || 'info'}</span>
            </div> : null}
            {text ? <div style={{ fontSize: 12, color: T.sub, marginTop: title ? 2 : 0 }}>{text}</div> : null}
          </span>
        </div>
      </div>
    );
  }

  if (v === 'minimal') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 13 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
        {title ? <b style={{ color: T.text, whiteSpace: 'nowrap' }}>{title}</b> : null}
        {text ? <span style={{ color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span> : null}
      </div>
    );
  }

  // alert (default)
  return (
    <div style={{ padding: '8px 12px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      <Alert showIcon type={$p.type || 'info'} message={title} description={text} />
    </div>
  );
}

ctx.render(<NoticeBanner />);
`,
};

/** 排行榜 — top N records ranked by a numeric field */
export const leaderboard: Template = {
  key: 'leaderboard',
  scope: 'collection',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Leaderboard',
  description: 'Top N records by a numeric field: list / podium / bars / medal cards',
  icon: '🏆',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 814,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'labelField', type: 'field', label: 'Label field', collectionFrom: 'collection' },
    {
      name: 'valueField',
      type: 'field',
      label: 'Value field (numeric)',
      collectionFrom: 'collection',
      accepts: 'numeric',
      required: true,
      hint: 'Records are ranked descending by this field.',
    },
    { name: 'limit', type: 'number', label: 'How many', default: 5 },
    { name: 'prefix', type: 'text', label: 'Value prefix (e.g. ¥)' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'board',
      label: 'Style',
      default: 'list',
      options: [
        { label: 'List', value: 'list' },
        { label: 'Podium', value: 'podium' },
        { label: 'Bars', value: 'bars' },
        { label: 'Medal cards', value: 'medalCards' },
        { label: 'Numbered rows', value: 'numbered' },
        { label: 'Top-3 highlight', value: 'top3' },
        { label: 'Avatar rank', value: 'avatar' },
      ],
    },
    ...popupParams(['detail', 'view']),
    themeParam,
  ],
  body:
    ROW_POPUP_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function Leaderboard() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const limit = Number($p.limit) > 0 ? Number($p.limit) : 5;
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(limit);
        if (ctx.resource.setSort) ctx.resource.setSort(['-' + $p.valueField]);
        await ctx.resource.refresh();
        setRows(ctx.resource.getData() || []);
      } catch (e) { setRows([]); }
    })();
  }, []);

  const medal = function (i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return String(i + 1);
  };
  const fmt = function (v) {
    const n = Number(v);
    if (isNaN(n)) return v == null ? '' : String(v);
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  const labelOf = function (r, i) {
    const label = $p.labelField ? r[$p.labelField] : (r.title || r.name || ('#' + (r.id != null ? r.id : i)));
    return label == null || label === '' ? '—' : String(label);
  };
  const hexFade = function (hex) {
    const hx = String(hex).replace('#', '');
    if (hx.length !== 6) return T.card;
    const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',0.1)';
  };

  if (rows == null) return <div style={{ padding: '12px', color: T.sub, background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>Loading…</div>;
  if (!rows.length) return <div style={{ padding: '12px', color: T.sub, background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>No records.</div>;

  const v = $p.variant || 'list';
  const prefix = $p.prefix || '';

  if (v === 'podium') {
    const top = rows.slice(0, 3);
    const order = top.length === 3 ? [1, 0, 2] : top.map(function (_, i) { return i; });
    const heights = { 0: 64, 1: 44, 2: 32 };
    const medalColor = { 0: '#faad14', 1: '#bfbfbf', 2: '#d48806' };
    return (
      <div style={{ padding: '14px 12px 10px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
          {order.map(function (idx) {
            const r = top[idx];
            if (!r) return null;
            return (
              <RowClick rec={r} key={idx}>
              <div style={{ flex: 1, maxWidth: 110, textAlign: 'center' }}>
                <div style={{ fontSize: 20 }}>{medal(idx)}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0' }}>{labelOf(r, idx)}</div>
                <b style={{ fontSize: 12, color: T.text }}>{prefix + fmt(r[$p.valueField])}</b>
                <div style={{ height: heights[idx], borderRadius: '6px 6px 0 0', marginTop: 6, background: medalColor[idx], opacity: 0.9 }} />
              </div>
              </RowClick>
            );
          })}
        </div>
        {rows.slice(3).map(function (r, j) {
          const i = j + 3;
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderTop: '1px solid ' + T.border }}>
              <span style={{ width: 26, textAlign: 'center', fontSize: 12, color: T.sub, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 8px' }}>{labelOf(r, i)}</span>
              <b style={{ fontSize: 12, color: T.text, flexShrink: 0 }}>{prefix + fmt(r[$p.valueField])}</b>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'bars') {
    const max = rows.reduce(function (m, r) { const n = Number(r[$p.valueField]); return (!isNaN(n) && n > m) ? n : m; }, 0) || 1;
    return (
      <div style={{ padding: '10px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const n = Number(r[$p.valueField]);
          const w = isNaN(n) ? 0 : Math.max(2, Math.round(n / max * 100));
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 18, textAlign: 'center', fontSize: i < 3 ? 14 : 11, flexShrink: 0 }}>{medal(i)}</span>
                  <span style={{ color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(r, i)}</span>
                </span>
                <b style={{ color: T.text, flexShrink: 0, marginLeft: 8 }}>{prefix + fmt(r[$p.valueField])}</b>
              </div>
              <div style={{ background: T.card, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ width: w + '%', height: '100%', background: T.primary, borderRadius: 4 }} />
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'medalCards') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {rows.map(function (r, i) {
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 10px', textAlign: 'center', height: '100%' }}>
              <div style={{ fontSize: i < 3 ? 22 : 15, fontWeight: 600, color: T.sub }}>{medal(i)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(r, i)}</div>
              <b style={{ fontSize: 15, color: T.primary }}>{prefix + fmt(r[$p.valueField])}</b>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  const AV_COLORS = ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
  const avColor = function (s) {
    const t = (s == null ? '' : String(s));
    let n = 0;
    for (let k = 0; k < t.length; k++) n = (n + t.charCodeAt(k)) % AV_COLORS.length;
    return AV_COLORS[n];
  };
  const initials = function (s) {
    const t = (s == null ? '' : String(s)).trim();
    return t ? t.slice(0, 1).toUpperCase() : '·';
  };

  if (v === 'numbered') {
    return (
      <div style={{ padding: '4px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.primary, opacity: 0.55, width: 26, textAlign: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(r, i)}</span>
              <b style={{ fontSize: 13, color: T.text, whiteSpace: 'nowrap', flexShrink: 0 }}>{prefix + fmt(r[$p.valueField])}</b>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'top3') {
    const medalColor = { 0: '#faad14', 1: '#bfbfbf', 2: '#d48806' };
    return (
      <div style={{ padding: '4px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const top = i < 3;
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: top ? '9px 14px' : '7px 14px', background: top ? hexFade(medalColor[i]) : 'transparent', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 26, textAlign: 'center', fontSize: top ? 18 : 13, fontWeight: 700, color: T.sub, flexShrink: 0 }}>{medal(i)}</span>
              <span style={{ flex: 1, fontSize: top ? 14 : 13, fontWeight: top ? 700 : 400, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(r, i)}</span>
              <b style={{ fontSize: top ? 15 : 13, color: top ? T.primary : T.text, whiteSpace: 'nowrap', flexShrink: 0 }}>{prefix + fmt(r[$p.valueField])}</b>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (v === 'avatar') {
    return (
      <div style={{ padding: '2px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
        {rows.map(function (r, i) {
          const label = labelOf(r, i);
          const c = i < 3 ? ['#faad14', '#bfbfbf', '#d48806'][i] : avColor(label);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ position: 'relative', flexShrink: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: c, color: '#fff', fontSize: 14, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{initials(label)}</span>
                <span style={{ position: 'absolute', right: -3, bottom: -3, width: 17, height: 17, borderRadius: '50%', background: T.bg, color: T.sub, fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', border: '1px solid ' + T.border }}>{i + 1}</span>
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
              <b style={{ fontSize: 13, color: T.text, whiteSpace: 'nowrap', flexShrink: 0 }}>{prefix + fmt(r[$p.valueField])}</b>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  // list (default)
  return (
    <div style={{ padding: '4px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {rows.map(function (r, i) {
        return (
          <RowClick rec={r} key={r.id != null ? r.id : i}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
            <span style={{ width: 26, textAlign: 'center', fontSize: i < 3 ? 16 : 13, fontWeight: 600, color: T.sub, flexShrink: 0 }}>{medal(i)}</span>
            <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 8px' }}>
              {labelOf(r, i)}
            </span>
            <b style={{ fontSize: 13, color: T.text, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {prefix + fmt(r[$p.valueField])}
            </b>
          </div>
          </RowClick>
        );
      })}
    </div>
  );
}

ctx.render(<Leaderboard />);
`,
};

// ═══════════════════════════════════════════════════════════════════════════
// Style thumbnails + gallery previews for the 5 templates above.
//
// NOTE: this file is `.ts`, whose esbuild loader does NOT parse JSX — so every
// React node below is built with `h` (= React.createElement). (The JSX-looking
// markup inside the template `body` strings above is fine: it's a runtime
// string executed by the plugin sandbox, not compiled here.)
//
// Registered as a side-effect on import via registerStyleThumbs / registerPreview
// so adding this family never touches any core/ file.
// ═══════════════════════════════════════════════════════════════════════════

const h = React.createElement;

type ThumbFC = React.FC<{ T: ThemeTokens }>;

// ---- distribution thumbnails -----------------------------------------------

const DistBars: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px' } },
    [0.95, 0.6, 0.35].map((w, i) =>
      h(
        'div',
        { key: i, style: { marginBottom: i < 2 ? 4 : 0 } },
        h(
          'div',
          { style: { background: T.card, borderRadius: 3, height: 5 } },
          h('div', { style: { width: w * 100 + '%', height: '100%', background: T.primary, borderRadius: 3 } }),
        ),
      ),
    ),
  );

const DistPills: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px', display: 'flex', flexWrap: 'wrap', gap: 4 } },
    ['42', '28', '13', '8'].map((n, i) =>
      h(
        'span',
        { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9, background: T.card, border: '1px solid ' + T.border, fontSize: 8, color: T.text } },
        h('span', { style: { width: 5, height: 5, borderRadius: '50%', background: T.primary } }),
        n,
      ),
    ),
  );

const DistColumns: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px', display: 'flex', alignItems: 'flex-end', gap: 5, height: 46 } },
    [0.9, 0.55, 0.7, 0.3].map((hh, i) =>
      h('div', { key: i, style: { flex: 1, height: hh * 30 + 4, background: T.primary, borderRadius: '2px 2px 0 0' } }),
    ),
  );

const DistDonut: ThumbFC = ({ T }) => {
  const C = 2 * Math.PI * 14;
  const parts = [{ c: T.primary, f: 0.5 }, { c: T.sub, f: 0.3 }, { c: T.border, f: 0.2 }];
  let off = 0;
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px', display: 'grid', placeItems: 'center' } },
    h(
      'svg',
      { width: 40, height: 40 },
      parts.map((p, i) => {
        const el = h('circle', {
          key: i, cx: 20, cy: 20, r: 14, fill: 'none', stroke: p.c, strokeWidth: 7,
          strokeDasharray: p.f * C + ' ' + C, strokeDashoffset: -off * C, transform: 'rotate(-90 20 20)',
        });
        off += p.f;
        return el;
      }),
    ),
  );
};

const DistStacked: ThumbFC = ({ T }) => {
  const parts = [{ c: T.primary, w: 0.45 }, { c: T.sub, w: 0.32 }, { c: T.border, w: 0.23 }];
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '11px 9px' } },
    h(
      'div',
      { style: { display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', background: T.card } },
      parts.map((p, i) => h('div', { key: i, style: { width: p.w * 100 + '%', background: p.c } })),
    ),
    h(
      'div',
      { style: { display: 'flex', gap: 6, marginTop: 6 } },
      parts.map((p, i) => h('span', { key: i, style: { width: 6, height: 6, borderRadius: 1, background: p.c } })),
    ),
  );
};

const DistRadial: ThumbFC = ({ T }) => {
  const rings = [{ c: T.primary, f: 0.85 }, { c: T.sub, f: 0.55 }, { c: T.border, f: 0.3 }];
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px', display: 'grid', placeItems: 'center' } },
    h(
      'svg',
      { width: 40, height: 40 },
      rings.map((p, i) => {
        const r = 7 + i * 6;
        const C = 2 * Math.PI * r;
        return h(
          'g',
          { key: i },
          h('circle', { cx: 20, cy: 20, r, fill: 'none', stroke: T.card, strokeWidth: 4 }),
          h('circle', { cx: 20, cy: 20, r, fill: 'none', stroke: p.c, strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: p.f * C + ' ' + C, transform: 'rotate(-90 20 20)' }),
        );
      }),
    ),
  );
};

const DistLollipop: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 8px' } },
    [0.9, 0.55, 0.32].map((w, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', marginBottom: i < 2 ? 6 : 0 } },
        h(
          'div',
          { style: { flex: 1, position: 'relative', height: 9, display: 'flex', alignItems: 'center' } },
          h('div', { style: { position: 'absolute', left: 0, width: w * 100 + '%', height: 2, background: T.primary, borderRadius: 1 } }),
          h('span', { style: { position: 'absolute', left: 'calc(' + w * 100 + '% - 4px)', width: 8, height: 8, borderRadius: '50%', background: T.primary } }),
        ),
      ),
    ),
  );

// ---- progressGoal thumbnails -----------------------------------------------

const GoalBar: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '9px 9px' } },
    h('div', { style: { fontSize: 8, color: T.sub, marginBottom: 5 } }, 'Q3 goal'),
    h(
      'div',
      { style: { background: T.card, borderRadius: 4, height: 7 } },
      h('div', { style: { width: '68%', height: '100%', background: T.primary, borderRadius: 4 } }),
    ),
    h('div', { style: { fontSize: 7, color: T.sub, marginTop: 4 } }, '68%'),
  );

const GoalRing: ThumbFC = ({ T }) => {
  const C = 2 * Math.PI * 13;
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px', display: 'grid', placeItems: 'center', position: 'relative' } },
    h(
      'svg',
      { width: 40, height: 40 },
      h('circle', { cx: 20, cy: 20, r: 13, fill: 'none', stroke: T.card, strokeWidth: 6 }),
      h('circle', { cx: 20, cy: 20, r: 13, fill: 'none', stroke: T.primary, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * 0.32, transform: 'rotate(-90 20 20)' }),
    ),
    h('span', { style: { position: 'absolute', fontSize: 9, fontWeight: 700, color: T.primary } }, '68%'),
  );
};

const GoalGauge: ThumbFC = ({ T }) => {
  const C = Math.PI * 16;
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 6px 4px', display: 'grid', placeItems: 'center', position: 'relative' } },
    h(
      'svg',
      { width: 48, height: 28, viewBox: '0 0 48 28' },
      h('path', { d: 'M 6 24 A 16 16 0 0 1 42 24', fill: 'none', stroke: T.card, strokeWidth: 6, strokeLinecap: 'round' }),
      h('path', { d: 'M 6 24 A 16 16 0 0 1 42 24', fill: 'none', stroke: T.primary, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * 0.32 }),
    ),
    h('span', { style: { fontSize: 8, fontWeight: 700, color: T.primary, marginTop: -4 } }, '68%'),
  );
};

const GoalSegments: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '11px 9px' } },
    h(
      'div',
      { style: { display: 'flex', gap: 2 } },
      Array.from({ length: 8 }).map((_, i) =>
        h('div', { key: i, style: { flex: 1, height: 10, borderRadius: 2, background: i < 5 ? T.primary : T.card } }),
      ),
    ),
    h('div', { style: { fontSize: 7, color: T.sub, marginTop: 4 } }, '68%'),
  );

const GoalThermometer: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px', display: 'flex', alignItems: 'flex-end', gap: 8 } },
    h(
      'div',
      { style: { position: 'relative', width: 12, height: 40, flexShrink: 0 } },
      h('div', { style: { position: 'absolute', left: 3, top: 0, width: 6, height: 33, borderRadius: 3, background: T.card } }),
      h('div', { style: { position: 'absolute', left: 3, bottom: 7, width: 6, height: 22, borderRadius: 3, background: T.primary } }),
      h('div', { style: { position: 'absolute', left: 0, bottom: 0, width: 12, height: 12, borderRadius: '50%', background: T.primary } }),
    ),
    h(
      'div',
      null,
      h('div', { style: { fontSize: 13, fontWeight: 700, color: T.primary, lineHeight: 1 } }, '68%'),
      h('div', { style: { fontSize: 7, color: T.sub, marginTop: 3 } }, '68k / 100k'),
    ),
  );

const GoalSteps: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '12px 9px', display: 'flex', alignItems: 'center' } },
    Array.from({ length: 5 }).map((_, i) => {
      const on = i < 3;
      return [
        h('span', { key: 'd' + i, style: { width: 11, height: 11, borderRadius: '50%', background: on ? T.primary : T.bg, border: on ? 'none' : '1.5px solid ' + T.border, flexShrink: 0 } }),
        i < 4 ? h('span', { key: 'l' + i, style: { flex: 1, height: 2, background: i < 2 ? T.primary : T.card } }) : null,
      ];
    }),
  );

const GoalArc: ThumbFC = ({ T }) => {
  const R = 14, C = 2 * Math.PI * R, arc = C * 0.75;
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px', display: 'grid', placeItems: 'center', position: 'relative' } },
    h(
      'svg',
      { width: 40, height: 40 },
      h('circle', { cx: 20, cy: 20, r: R, fill: 'none', stroke: T.card, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: arc + ' ' + C, transform: 'rotate(135 20 20)' }),
      h('circle', { cx: 20, cy: 20, r: R, fill: 'none', stroke: T.primary, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: arc * 0.68 + ' ' + C, transform: 'rotate(135 20 20)' }),
    ),
    h('span', { style: { position: 'absolute', fontSize: 9, fontWeight: 700, color: T.primary } }, '68%'),
  );
};

// ---- recentList thumbnails -------------------------------------------------

const recentLines = (T: ThemeTokens, w: number) => [
  h('div', { key: 'a', style: { height: 5, width: w + '%', background: T.card, borderRadius: 3, marginBottom: 3 } }),
  h('div', { key: 'b', style: { height: 4, width: w * 0.6 + '%', background: T.border, borderRadius: 3 } }),
];

const RecentListT: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px' } },
    [0, 1, 2].map((i) =>
      h('div', { key: i, style: { padding: '4px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } }, recentLines(T, 80)),
    ),
  );

const RecentTimeline: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 9px' } },
    [0, 1, 2].map((i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', gap: 6 } },
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
          h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: T.primary, marginTop: 2, flexShrink: 0 } }),
          i < 2 ? h('span', { style: { flex: 1, width: 2, background: T.border, minHeight: 8 } }) : null,
        ),
        h('div', { style: { flex: 1, paddingBottom: 6 } }, recentLines(T, 85)),
      ),
    ),
  );

const RecentCards: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 } },
    [0, 1, 2, 3].map((i) =>
      h('div', { key: i, style: { background: T.bg, border: '1px solid ' + T.border, borderTop: '2px solid ' + T.primary, borderRadius: 5, padding: '6px 7px' } }, recentLines(T, 90)),
    ),
  );

const RecentCompact: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px 8px' } },
    [0, 1, 2, 3].map((i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', borderBottom: i < 3 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { width: 12, height: 12, borderRadius: '50%', background: T.card, flexShrink: 0 } }),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 3 } }),
      ),
    ),
  );

const RecentAvatar: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px 8px' } },
    [T.primary, '#52c41a', '#faad14'].map((c, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { width: 16, height: 16, borderRadius: '50%', background: c, flexShrink: 0 } }),
        h('div', { style: { flex: 1 } }, recentLines(T, 80)),
      ),
    ),
  );

const RecentNumbered: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px 8px' } },
    [1, 2, 3].map((n, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { fontSize: 11, fontWeight: 700, color: T.primary, opacity: 0.5, flexShrink: 0 } }, n),
        h('div', { style: { flex: 1 } }, recentLines(T, 80)),
      ),
    ),
  );

const RecentFeed: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px' } },
    [T.primary, '#52c41a'].map((c, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', gap: 6, marginBottom: i < 1 ? 6 : 0 } },
        h('span', { style: { width: 14, height: 14, borderRadius: '50%', background: c, flexShrink: 0 } }),
        h('div', { style: { flex: 1, background: T.card, borderRadius: '1px 5px 5px 5px', padding: '4px 6px' } }, recentLines(T, 85)),
      ),
    ),
  );

// ---- noticeBanner thumbnails -----------------------------------------------

const NoticeAlert: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px' } },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 6, background: T.card, border: '1px solid ' + T.border, borderRadius: 5, padding: '6px 8px' } },
      h('span', { style: { fontSize: 11 } }, 'ℹ️'),
      h(
        'div',
        { style: { flex: 1 } },
        h('div', { style: { height: 4, width: '50%', background: T.primary, borderRadius: 2, marginBottom: 3 } }),
        h('div', { style: { height: 3, width: '80%', background: T.border, borderRadius: 2 } }),
      ),
    ),
  );

const NoticeOutline: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1.5px solid ' + T.primary, borderRadius: 6, padding: '8px 9px', display: 'flex', gap: 6, alignItems: 'center' } },
    h('span', { style: { fontSize: 11 } }, 'ℹ️'),
    h(
      'div',
      { style: { flex: 1 } },
      h('div', { style: { height: 4, width: '55%', background: T.primary, borderRadius: 2, marginBottom: 3 } }),
      h('div', { style: { height: 3, width: '85%', background: T.border, borderRadius: 2 } }),
    ),
  );

const NoticeLeftAccent: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.card, borderRadius: 6, borderLeft: '4px solid ' + T.primary, padding: '8px 9px' } },
    h('div', { style: { height: 4, width: '50%', background: T.text, opacity: 0.7, borderRadius: 2, marginBottom: 3 } }),
    h('div', { style: { height: 3, width: '80%', background: T.sub, opacity: 0.5, borderRadius: 2 } }),
  );

const NoticeIconTile: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', display: 'flex', alignItems: 'center', gap: 8 } },
    h('span', { style: { width: 26, height: 26, borderRadius: 7, background: T.card, color: T.primary, display: 'grid', placeItems: 'center', fontSize: 13, flexShrink: 0 } }, 'ℹ️'),
    h(
      'div',
      { style: { flex: 1 } },
      h('div', { style: { height: 4, width: '60%', background: T.text, opacity: 0.7, borderRadius: 2, marginBottom: 3 } }),
      h('div', { style: { height: 3, width: '85%', background: T.border, borderRadius: 2 } }),
    ),
  );

const NoticeGradient: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.gradient, borderRadius: 6, padding: '8px 9px', display: 'flex', alignItems: 'center', gap: 7, color: '#fff', position: 'relative', overflow: 'hidden' } },
    h('div', { style: { position: 'absolute', right: -8, top: -8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' } }),
    h('span', { style: { fontSize: 13 } }, 'ℹ️'),
    h(
      'div',
      { style: { flex: 1 } },
      h('div', { style: { height: 4, width: '55%', background: 'rgba(255,255,255,0.9)', borderRadius: 2, marginBottom: 3 } }),
      h('div', { style: { height: 3, width: '80%', background: 'rgba(255,255,255,0.5)', borderRadius: 2 } }),
    ),
  );

const NoticeRibbon: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, display: 'flex', overflow: 'hidden' } },
    h('div', { style: { width: 6, background: T.primary, flexShrink: 0 } }),
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 9px', flex: 1 } },
      h('span', { style: { fontSize: 12 } }, 'ℹ️'),
      h(
        'div',
        { style: { flex: 1 } },
        h('div', { style: { height: 4, width: '55%', background: T.text, opacity: 0.7, borderRadius: 2, marginBottom: 3 } }),
        h('div', { style: { height: 3, width: '80%', background: T.border, borderRadius: 2 } }),
      ),
    ),
  );

const NoticeMinimal: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '13px 9px', display: 'flex', alignItems: 'center', gap: 6 } },
    h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: T.primary, flexShrink: 0 } }),
    h('div', { style: { height: 4, width: '35%', background: T.text, opacity: 0.7, borderRadius: 2 } }),
    h('div', { style: { height: 3, width: '45%', background: T.border, borderRadius: 2 } }),
  );

// ---- leaderboard thumbnails ------------------------------------------------

const BoardList: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px 8px' } },
    ['🥇', '🥈', '🥉'].map((m, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { fontSize: 11 } }, m),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 3 } }),
        h('div', { style: { width: 16, height: 4, background: T.primary, borderRadius: 3 } }),
      ),
    ),
  );

const BoardPodium: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 50 } },
    [{ h: 22, c: '#bfbfbf', m: '🥈' }, { h: 34, c: '#faad14', m: '🥇' }, { h: 16, c: '#d48806', m: '🥉' }].map((b, i) =>
      h(
        'div',
        { key: i, style: { flex: 1, maxWidth: 22, textAlign: 'center' } },
        h('div', { style: { fontSize: 10 } }, b.m),
        h('div', { style: { height: b.h, background: b.c, opacity: 0.9, borderRadius: '3px 3px 0 0', marginTop: 2 } }),
      ),
    ),
  );

const BoardBars: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px' } },
    [{ m: '🥇', w: 0.95 }, { m: '🥈', w: 0.65 }, { m: '🥉', w: 0.4 }].map((b, i) =>
      h(
        'div',
        { key: i, style: { marginBottom: i < 2 ? 5 : 0 } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 } },
          h('span', { style: { fontSize: 8 } }, b.m),
          h('div', { style: { flex: 1, height: 3, background: T.border, borderRadius: 2 } }),
        ),
        h(
          'div',
          { style: { background: T.card, borderRadius: 3, height: 5 } },
          h('div', { style: { width: b.w * 100 + '%', height: '100%', background: T.primary, borderRadius: 3 } }),
        ),
      ),
    ),
  );

const BoardMedalCards: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 } },
    ['🥇', '🥈', '🥉', '4'].map((m, i) =>
      h(
        'div',
        { key: i, style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 5, padding: '6px 4px', textAlign: 'center' } },
        h('div', { style: { fontSize: 12, color: T.sub } }, m),
        h('div', { style: { height: 4, width: '70%', margin: '3px auto', background: T.card, borderRadius: 2 } }),
        h('div', { style: { height: 5, width: '50%', margin: '0 auto', background: T.primary, borderRadius: 2 } }),
      ),
    ),
  );

const BoardNumbered: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '6px 8px' } },
    [1, 2, 3].map((n, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { fontSize: 11, fontWeight: 700, color: T.primary, opacity: 0.55, width: 10, textAlign: 'center' } }, n),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 3 } }),
        h('div', { style: { width: 16, height: 4, background: T.primary, borderRadius: 3 } }),
      ),
    ),
  );

const BoardTop3: ThumbFC = ({ T }) => {
  const rows = [{ m: '🥇', c: 'rgba(250,173,20,0.12)', top: true }, { m: '🥈', c: 'rgba(191,191,191,0.12)', top: true }, { m: '3', c: 'transparent', top: false }];
  return h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '4px 0', overflow: 'hidden' } },
    rows.map((r, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: r.c, borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { fontSize: r.top ? 12 : 9, width: 12, textAlign: 'center' } }, r.m),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 3 } }),
        h('div', { style: { width: 14, height: 4, background: r.top ? T.primary : T.sub, borderRadius: 3 } }),
      ),
    ),
  );
};

const BoardAvatar: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px 8px' } },
    [{ c: '#faad14', n: 1 }, { c: '#bfbfbf', n: 2 }, { c: T.primary, n: 3 }].map((a, i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { width: 16, height: 16, borderRadius: '50%', background: a.c, color: '#fff', fontSize: 8, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a.n),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 3 } }),
        h('div', { style: { width: 16, height: 4, background: T.primary, borderRadius: 3 } }),
      ),
    ),
  );

registerStyleThumbs('dist', { bars: DistBars, pills: DistPills, columns: DistColumns, donut: DistDonut, stacked: DistStacked, radial: DistRadial, lollipop: DistLollipop });
registerStyleThumbs('goal', { bar: GoalBar, ring: GoalRing, gauge: GoalGauge, segments: GoalSegments, thermometer: GoalThermometer, steps: GoalSteps, arc: GoalArc });
registerStyleThumbs('recent', { list: RecentListT, timeline: RecentTimeline, cards: RecentCards, compact: RecentCompact, avatar: RecentAvatar, numbered: RecentNumbered, feed: RecentFeed });
registerStyleThumbs('notice', { alert: NoticeAlert, outline: NoticeOutline, leftAccent: NoticeLeftAccent, iconTile: NoticeIconTile, gradient: NoticeGradient, ribbon: NoticeRibbon, minimal: NoticeMinimal });
registerStyleThumbs('board', { list: BoardList, podium: BoardPodium, bars: BoardBars, medalCards: BoardMedalCards, numbered: BoardNumbered, top3: BoardTop3, avatar: BoardAvatar });

// ═══════════════════════════════════════════════════════════════════════════
// Gallery previews — follow the selected `variant` live; mock data when no
// params. Registered side-effect on import (override the core defaults).
// ═══════════════════════════════════════════════════════════════════════════

type PreviewProps = { params?: any; ctx?: any };

const tokensOf = (theme?: string): ThemeTokens => resolveThemeTokens(theme);

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

const ANTD_HEX: Record<string, string> = {
  blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1',
  magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d',
};

// ---- distribution preview --------------------------------------------------

const DistributionPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = tokensOf(params?.theme);
  const mock = [
    { label: 'Confirmed', count: 42, color: T.primary },
    { label: 'Pending', count: 28, color: '#52c41a' },
    { label: 'Draft', count: 13, color: '#faad14' },
  ];
  const enumOpts: any[] = Array.isArray(params?.field__enum) ? params.field__enum : [];
  const bars =
    enumOpts.length && params
      ? enumOpts.slice(0, 4).map((o, i) => ({
          label: o.label || String(o.value),
          count: [42, 28, 13, 8][i] ?? 5,
          color: (o.color && (ANTD_HEX[o.color] || o.color)) || T.primary,
        }))
      : mock;
  const max = bars.reduce((m, b) => Math.max(m, b.count), 0) || 1;
  const total = bars.reduce((s, b) => s + b.count, 0) || 1;
  const variant = params?.variant || 'bars';

  let body: React.ReactNode;
  if (variant === 'pills') {
    body = h(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      bars.map((b, i) =>
        h(
          'span',
          { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: T.card, border: '1px solid ' + T.border, fontSize: 11, color: T.text } },
          h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: b.color } }),
          b.label,
          h('b', null, b.count),
        ),
      ),
    );
  } else if (variant === 'columns') {
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 78 } },
      bars.map((b, i) =>
        h(
          'div',
          { key: i, style: { flex: 1, textAlign: 'center' } },
          h('b', { style: { fontSize: 10, color: T.text } }, b.count),
          h('div', { style: { height: Math.max(5, (b.count / max) * 54), background: b.color, borderRadius: '3px 3px 0 0', marginTop: 2 } }),
          h('div', { style: { fontSize: 9, color: T.sub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.label),
        ),
      ),
    );
  } else if (variant === 'donut') {
    const R = 26, C = 2 * Math.PI * R;
    let off = 0;
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' } },
      h(
        'div',
        { style: { position: 'relative', width: 70, height: 70 } },
        h(
          'svg',
          { width: 70, height: 70 },
          bars.map((b, i) => {
            const f = b.count / total;
            const el = h('circle', { key: i, cx: 35, cy: 35, r: R, fill: 'none', stroke: b.color, strokeWidth: 11, strokeDasharray: f * C + ' ' + C, strokeDashoffset: -off * C, transform: 'rotate(-90 35 35)' });
            off += f;
            return el;
          }),
        ),
        h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: T.text } }, total),
      ),
      h(
        'div',
        { style: { fontSize: 11 } },
        bars.map((b, i) =>
          h(
            'div',
            { key: i, style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 } },
            h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: b.color } }),
            h('span', { style: { color: T.sub } }, b.label),
            h('b', { style: { color: T.text } }, b.count),
          ),
        ),
      ),
    );
  } else if (variant === 'stacked') {
    body = h(
      'div',
      null,
      h(
        'div',
        { style: { display: 'flex', height: 22, borderRadius: 5, overflow: 'hidden', background: T.card } },
        bars.map((b, i) => {
          const pct = (b.count / total) * 100;
          return h('div', { key: i, style: { width: pct + '%', background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 600 } }, pct >= 12 ? Math.round(pct) + '%' : '');
        }),
      ),
      h(
        'div',
        { style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 } },
        bars.map((b, i) =>
          h(
            'span',
            { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.sub } },
            h('span', { style: { width: 8, height: 8, borderRadius: 2, background: b.color } }),
            h('span', { style: { color: T.text } }, b.label),
          ),
        ),
      ),
    );
  } else if (variant === 'radial') {
    const rings = bars.slice(0, 3);
    const SW = 9, GAP = 3, base = 12;
    const maxR = base + (rings.length - 1) * (SW + GAP);
    const size = (maxR + SW / 2 + 2) * 2;
    const c = size / 2;
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' } },
      h(
        'svg',
        { width: size, height: size },
        rings.map((b, i) => {
          const r = base + i * (SW + GAP);
          const C = 2 * Math.PI * r;
          const frac = b.count / max;
          return h(
            'g',
            { key: i },
            h('circle', { cx: c, cy: c, r, fill: 'none', stroke: T.card, strokeWidth: SW }),
            h('circle', { cx: c, cy: c, r, fill: 'none', stroke: b.color, strokeWidth: SW, strokeLinecap: 'round', strokeDasharray: frac * C + ' ' + C, transform: 'rotate(-90 ' + c + ' ' + c + ')' }),
          );
        }),
      ),
      h(
        'div',
        { style: { fontSize: 11 } },
        rings.map((b, i) =>
          h(
            'div',
            { key: i, style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 } },
            h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: b.color } }),
            h('span', { style: { color: T.sub } }, b.label),
            h('b', { style: { color: T.text } }, b.count),
          ),
        ),
      ),
    );
  } else if (variant === 'lollipop') {
    body = bars.map((b, i) => {
      const w = Math.max(4, (b.count / max) * 100);
      return h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 } },
        h('span', { style: { width: '30%', fontSize: 11, color: T.sub, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.label),
        h(
          'div',
          { style: { flex: 1, position: 'relative', height: 12, display: 'flex', alignItems: 'center' } },
          h('div', { style: { position: 'absolute', left: 0, width: w + '%', height: 3, background: b.color, borderRadius: 2 } }),
          h('span', { style: { position: 'absolute', left: 'calc(' + w + '% - 5px)', width: 10, height: 10, borderRadius: '50%', background: b.color } }),
        ),
        h('b', { style: { width: 28, textAlign: 'right', fontSize: 11, color: T.text } }, b.count),
      );
    });
  } else {
    body = bars.map((b, i) =>
      h(
        'div',
        { key: i, style: { marginBottom: 6 } },
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2, color: T.sub } },
          h('span', null, b.label),
          h('b', { style: { color: T.text } }, b.count),
        ),
        h(
          'div',
          { style: { background: T.card, borderRadius: 4, height: 7 } },
          h('div', { style: { width: (b.count / max) * 100 + '%', height: '100%', background: b.color, borderRadius: 4 } }),
        ),
      ),
    );
  }
  return h(PFrame, null, h('div', { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '8px 10px' } }, body));
};

// ---- progressGoal preview --------------------------------------------------

const ProgressGoalPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = tokensOf(params?.theme);
  const pct = 68;
  const variant = params?.variant || 'bar';
  const title = params?.label || 'Q3 sales goal';
  const caption = h(
    'div',
    { style: { marginTop: 4, fontSize: 11, color: T.sub } },
    h('b', { style: { color: T.text } }, '68,000'),
    ' / 100,000 (68%)',
  );

  let body: React.ReactNode;
  if (variant === 'ring') {
    const C = 2 * Math.PI * 26;
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 14 } },
      h(
        'div',
        { style: { position: 'relative', width: 70, height: 70 } },
        h(
          'svg',
          { width: 70, height: 70 },
          h('circle', { cx: 35, cy: 35, r: 26, fill: 'none', stroke: T.card, strokeWidth: 8 }),
          h('circle', { cx: 35, cy: 35, r: 26, fill: 'none', stroke: T.primary, strokeWidth: 8, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * (1 - pct / 100), transform: 'rotate(-90 35 35)' }),
        ),
        h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, color: T.primary } }, pct + '%'),
      ),
      h(
        'div',
        { style: { fontSize: 11, color: T.sub } },
        h('b', { style: { color: T.text, fontSize: 16, display: 'block' } }, '68,000'),
        'of 100,000',
      ),
    );
  } else if (variant === 'gauge') {
    const C = Math.PI * 32;
    body = h(
      'div',
      { style: { textAlign: 'center' } },
      h(
        'div',
        { style: { position: 'relative', width: 110, height: 60, margin: '0 auto' } },
        h(
          'svg',
          { width: 110, height: 60, viewBox: '0 0 110 60' },
          h('path', { d: 'M 12 54 A 32 32 0 0 1 98 54', fill: 'none', stroke: T.card, strokeWidth: 10, strokeLinecap: 'round' }),
          h('path', { d: 'M 12 54 A 32 32 0 0 1 98 54', fill: 'none', stroke: T.primary, strokeWidth: 10, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * (1 - pct / 100) }),
        ),
        h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 2, fontSize: 16, fontWeight: 700, color: T.primary } }, pct + '%'),
      ),
      caption,
    );
  } else if (variant === 'segments') {
    body = h(
      'div',
      null,
      h(
        'div',
        { style: { display: 'flex', gap: 3 } },
        Array.from({ length: 10 }).map((_, i) =>
          h('div', { key: i, style: { flex: 1, height: 13, borderRadius: 3, background: i < 7 ? T.primary : T.card } }),
        ),
      ),
      caption,
    );
  } else if (variant === 'thermometer') {
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', gap: 14 } },
      h(
        'div',
        { style: { position: 'relative', width: 18, height: 76 } },
        h('div', { style: { position: 'absolute', left: 4, top: 0, width: 10, height: 62, borderRadius: 5, background: T.card } }),
        h('div', { style: { position: 'absolute', left: 4, bottom: 14, width: 10, height: (pct / 100) * 62, borderRadius: 5, background: T.primary } }),
        h('div', { style: { position: 'absolute', left: 0, bottom: 0, width: 18, height: 18, borderRadius: '50%', background: T.primary } }),
      ),
      h(
        'div',
        { style: { fontSize: 11, color: T.sub } },
        h('b', { style: { color: T.primary, fontSize: 22, display: 'block', lineHeight: 1 } }, pct + '%'),
        h('span', { style: { display: 'block', marginTop: 6 } }, h('b', { style: { color: T.text } }, '68,000'), ' / 100,000'),
      ),
    );
  } else if (variant === 'steps') {
    const N = 5;
    body = h(
      'div',
      null,
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center' } },
        Array.from({ length: N }).map((_, i) => {
          const on = i < Math.round((pct / 100) * N);
          return [
            h('span', { key: 'd' + i, style: { width: 18, height: 18, borderRadius: '50%', background: on ? T.primary : T.bg, border: on ? 'none' : '2px solid ' + T.border, color: '#fff', fontSize: 10, display: 'grid', placeItems: 'center', flexShrink: 0 } }, on ? '✓' : ''),
            i < N - 1 ? h('span', { key: 'l' + i, style: { flex: 1, height: 3, borderRadius: 2, background: i < Math.round((pct / 100) * N) - 1 ? T.primary : T.card } }) : null,
          ];
        }),
      ),
      caption,
    );
  } else if (variant === 'arc') {
    const R = 30, SW = 9, C = 2 * Math.PI * R, arc = C * 0.75;
    body = h(
      'div',
      { style: { position: 'relative', width: 78, height: 78, margin: '0 auto' } },
      h(
        'svg',
        { width: 78, height: 78 },
        h('circle', { cx: 39, cy: 39, r: R, fill: 'none', stroke: T.card, strokeWidth: SW, strokeLinecap: 'round', strokeDasharray: arc + ' ' + C, transform: 'rotate(135 39 39)' }),
        h('circle', { cx: 39, cy: 39, r: R, fill: 'none', stroke: T.primary, strokeWidth: SW, strokeLinecap: 'round', strokeDasharray: (arc * pct) / 100 + ' ' + C, transform: 'rotate(135 39 39)' }),
      ),
      h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, color: T.primary } }, pct + '%'),
    );
  } else {
    body = h(
      'div',
      null,
      h(
        'div',
        { style: { background: T.card, borderRadius: 6, height: 9, overflow: 'hidden' } },
        h('div', { style: { width: pct + '%', height: '100%', background: T.primary, borderRadius: 6 } }),
      ),
      caption,
    );
  }
  return h(
    PFrame,
    null,
    h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '10px 12px' } },
      h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 6, color: T.text } }, title),
      body,
    ),
  );
};

// ---- recentList preview ----------------------------------------------------

const RECENT_MOCK: [string, string, string][] = [
  ['Order #1042 confirmed', 'ACME · ¥12,000', 'Jun 9'],
  ['New lead added', 'Globex Inc', 'Jun 9'],
  ['Invoice #88 paid', 'Initech', 'Jun 8'],
];

const AV_COLORS = ['#1677ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
const avColorOf = (s: string) => {
  let n = 0;
  for (let k = 0; k < s.length; k++) n = (n + s.charCodeAt(k)) % AV_COLORS.length;
  return AV_COLORS[n];
};

const RecentListPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = tokensOf(params?.theme);
  const variant = params?.variant || 'list';
  const rows = RECENT_MOCK;

  let body: React.ReactNode;
  if (variant === 'timeline') {
    body = h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '8px 12px 0' } },
      rows.map(([title, sub, time], i) =>
        h(
          'div',
          { key: i, style: { display: 'flex', gap: 8 } },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
            h('span', { style: { width: 9, height: 9, borderRadius: '50%', background: T.primary, marginTop: 3, flexShrink: 0 } }),
            i < 2 ? h('span', { style: { flex: 1, width: 2, background: T.border, minHeight: 10 } }) : null,
          ),
          h(
            'div',
            { style: { paddingBottom: 8, minWidth: 0 } },
            h('div', { style: { fontSize: 10, color: T.sub } }, time),
            h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text } }, title),
            h('div', { style: { fontSize: 11, color: T.sub } }, sub),
          ),
        ),
      ),
    );
  } else if (variant === 'cards') {
    body = h(
      'div',
      { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
      rows.map(([title, sub, time], i) =>
        h(
          'div',
          { key: i, style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, borderTop: '3px solid ' + T.primary, padding: '8px 10px' } },
          h('div', { style: { fontSize: 10, color: T.sub, marginBottom: 2 } }, time),
          h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
          h('div', { style: { fontSize: 11, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sub),
        ),
      ),
    );
  } else if (variant === 'compact') {
    body = h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '2px 10px' } },
      rows.map(([title, , time], i) =>
        h(
          'div',
          { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
          h('span', { style: { width: 20, height: 20, borderRadius: '50%', background: T.card, color: T.primary, fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' } }, title.slice(0, 1)),
          h('span', { style: { flex: 1, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
          h('span', { style: { fontSize: 10, color: T.sub } }, time),
        ),
      ),
    );
  } else if (variant === 'avatar') {
    body = h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '2px 10px' } },
      rows.map(([title, sub, time], i) => {
        const c = avColorOf(title);
        return h(
          'div',
          { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
          h('span', { style: { width: 28, height: 28, borderRadius: '50%', background: c, color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, title.slice(0, 1).toUpperCase()),
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
            h('div', { style: { fontSize: 11, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sub),
          ),
          h('span', { style: { fontSize: 10, color: T.sub, flexShrink: 0 } }, time),
        );
      }),
    );
  } else if (variant === 'numbered') {
    body = h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '2px 10px' } },
      rows.map(([title, sub, time], i) =>
        h(
          'div',
          { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
          h('span', { style: { fontSize: 16, fontWeight: 700, color: T.primary, opacity: 0.5, width: 18, textAlign: 'center', flexShrink: 0 } }, i + 1),
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
            h('div', { style: { fontSize: 11, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sub),
          ),
          h('span', { style: { fontSize: 10, color: T.sub, flexShrink: 0 } }, time),
        ),
      ),
    );
  } else if (variant === 'feed') {
    body = h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '8px 10px 0' } },
      rows.map(([title, sub, time], i) => {
        const c = avColorOf(title);
        return h(
          'div',
          { key: i, style: { display: 'flex', gap: 8, marginBottom: 8 } },
          h('span', { style: { width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, title.slice(0, 1).toUpperCase()),
          h(
            'div',
            { style: { minWidth: 0, flex: 1 } },
            h('div', { style: { fontSize: 10, color: T.sub, marginBottom: 2 } }, time),
            h(
              'div',
              { style: { background: T.card, borderRadius: '2px 8px 8px 8px', padding: '5px 8px' } },
              h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
              h('div', { style: { fontSize: 11, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sub),
            ),
          ),
        );
      }),
    );
  } else {
    body = h(
      'div',
      { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '4px 10px' } },
      rows.map(([title, sub, time], i) =>
        h(
          'div',
          { key: i, style: { padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
          h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
            h('span', { style: { fontSize: 12, fontWeight: 600, color: T.text } }, title),
            h('span', { style: { fontSize: 10, color: T.sub, marginLeft: 8 } }, time),
          ),
          h('div', { style: { fontSize: 11, color: T.sub } }, sub),
        ),
      ),
    );
  }
  return h(PFrame, null, h('div', { style: { width: '100%' } }, body));
};

// ---- noticeBanner preview --------------------------------------------------

const NOTICE_SEV: Record<string, { color: string; icon: string }> = {
  info: { color: '#1677ff', icon: 'ℹ️' },
  success: { color: '#52c41a', icon: '✅' },
  warning: { color: '#faad14', icon: '⚠️' },
  error: { color: '#ff4d4f', icon: '⛔' },
};
function noticeRgba(hex: string, a: number) {
  const hx = hex.replace('#', '');
  if (hx.length !== 6) return hex;
  const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

const NoticeBannerPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = tokensOf(params?.theme);
  const sev = NOTICE_SEV[params?.type || 'info'] || NOTICE_SEV.info;
  const variant = params?.variant || 'alert';
  const title = params?.title || 'Heads up';
  const text = params?.text || 'Month-end close is on the 30th.';

  let body: React.ReactNode;
  if (variant === 'outline') {
    body = h(
      'div',
      { style: { padding: '10px 12px', background: T.bg, borderRadius: 8, border: '1px solid ' + sev.color, display: 'flex', gap: 8, alignItems: 'flex-start' } },
      h('span', { style: { fontSize: 15 } }, sev.icon),
      h(
        'span',
        null,
        h('div', { style: { fontSize: 12, fontWeight: 600, color: sev.color } }, title),
        h('div', { style: { fontSize: 11, color: T.sub } }, text),
      ),
    );
  } else if (variant === 'leftAccent') {
    body = h(
      'div',
      { style: { padding: '10px 12px', background: noticeRgba(sev.color, 0.08), borderRadius: 8, borderLeft: '4px solid ' + sev.color } },
      h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text } }, title),
      h('div', { style: { fontSize: 11, color: T.sub } }, text),
    );
  } else if (variant === 'iconTile') {
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: T.bg, borderRadius: 8, border: '1px solid ' + T.border } },
      h('span', { style: { width: 40, height: 40, borderRadius: 10, background: noticeRgba(sev.color, 0.14), color: sev.color, display: 'grid', placeItems: 'center', fontSize: 19, flexShrink: 0 } }, sev.icon),
      h(
        'span',
        null,
        h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text } }, title),
        h('div', { style: { fontSize: 11, color: T.sub } }, text),
      ),
    );
  } else if (variant === 'gradient') {
    body = h(
      'div',
      { style: { position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, background: 'linear-gradient(135deg,' + sev.color + ',' + noticeRgba(sev.color, 0.7) + ')', color: '#fff' } },
      h('div', { style: { position: 'absolute', right: -18, top: -18, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' } }),
      h('span', { style: { fontSize: 19, flexShrink: 0 } }, sev.icon),
      h(
        'span',
        { style: { minWidth: 0, position: 'relative' } },
        h('div', { style: { fontSize: 13, fontWeight: 700 } }, title),
        h('div', { style: { fontSize: 11, opacity: 0.9 } }, text),
      ),
    );
  } else if (variant === 'ribbon') {
    body = h(
      'div',
      { style: { display: 'flex', background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, overflow: 'hidden' } },
      h('div', { style: { width: 8, background: sev.color, flexShrink: 0 } }),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', minWidth: 0 } },
        h('span', { style: { fontSize: 16, flexShrink: 0 } }, sev.icon),
        h(
          'span',
          { style: { minWidth: 0 } },
          h(
            'div',
            { style: { fontSize: 12, fontWeight: 700, color: T.text, display: 'inline-flex', alignItems: 'center', gap: 8 } },
            title,
            h('span', { style: { fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: sev.color, background: noticeRgba(sev.color, 0.12), borderRadius: 4, padding: '1px 6px' } }, params?.type || 'info'),
          ),
          h('div', { style: { fontSize: 11, color: T.sub } }, text),
        ),
      ),
    );
  } else if (variant === 'minimal') {
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 12 } },
      h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: sev.color, flexShrink: 0 } }),
      h('b', { style: { color: T.text, whiteSpace: 'nowrap' } }, title),
      h('span', { style: { color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, text),
    );
  } else {
    body = h(
      'div',
      { style: { display: 'flex', gap: 8, alignItems: 'flex-start', background: noticeRgba(sev.color, 0.1), border: '1px solid ' + noticeRgba(sev.color, 0.3), borderRadius: 8, padding: '8px 12px' } },
      h('span', { style: { fontSize: 14 } }, sev.icon),
      h(
        'span',
        null,
        h('div', { style: { fontSize: 12, fontWeight: 600, color: T.text } }, title),
        h('div', { style: { fontSize: 11, color: T.sub } }, text),
      ),
    );
  }
  return h(PFrame, null, h('div', { style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: 8 } }, body));
};

// ---- leaderboard preview ---------------------------------------------------

const BOARD_MOCK: [string, string, number][] = [
  ['🥇', 'ACME Corp', 128600],
  ['🥈', 'Globex Inc', 94200],
  ['🥉', 'Initech', 71800],
];

const LeaderboardPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = tokensOf(params?.theme);
  const variant = params?.variant || 'list';
  const prefix = params?.prefix ?? '¥';
  const rows = BOARD_MOCK;
  const fmt = (n: number) => prefix + n.toLocaleString();

  let body: React.ReactNode;
  if (variant === 'podium') {
    const order = [1, 0, 2];
    const heights: Record<number, number> = { 0: 46, 1: 30, 2: 22 };
    const colors: Record<number, string> = { 0: '#faad14', 1: '#bfbfbf', 2: '#d48806' };
    body = h(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 } },
      order.map((idx) =>
        h(
          'div',
          { key: idx, style: { flex: 1, maxWidth: 90, textAlign: 'center' } },
          h('div', { style: { fontSize: 16 } }, rows[idx][0]),
          h('div', { style: { fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, rows[idx][1]),
          h('b', { style: { fontSize: 11, color: T.text } }, fmt(rows[idx][2])),
          h('div', { style: { height: heights[idx], background: colors[idx], opacity: 0.9, borderRadius: '4px 4px 0 0', marginTop: 4 } }),
        ),
      ),
    );
  } else if (variant === 'bars') {
    const max = rows.reduce((m, r) => Math.max(m, r[2]), 0) || 1;
    body = rows.map(([m, name, val], i) =>
      h(
        'div',
        { key: i, style: { marginBottom: 6 } },
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 2 } },
          h('span', { style: { display: 'flex', gap: 5 } }, h('span', null, m), h('span', { style: { color: T.text } }, name)),
          h('b', { style: { color: T.text } }, fmt(val)),
        ),
        h(
          'div',
          { style: { background: T.card, borderRadius: 4, height: 7 } },
          h('div', { style: { width: (val / max) * 100 + '%', height: '100%', background: T.primary, borderRadius: 4 } }),
        ),
      ),
    );
  } else if (variant === 'medalCards') {
    body = h(
      'div',
      { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
      rows.map(([m, name, val], i) =>
        h(
          'div',
          { key: i, style: { background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '10px 6px', textAlign: 'center' } },
          h('div', { style: { fontSize: 18 } }, m),
          h('div', { style: { fontSize: 11, fontWeight: 600, color: T.text, margin: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
          h('b', { style: { fontSize: 12, color: T.primary } }, fmt(val)),
        ),
      ),
    );
  } else if (variant === 'numbered') {
    body = rows.map(([, name, val], i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { fontSize: 16, fontWeight: 700, color: T.primary, opacity: 0.55, width: 20, textAlign: 'center' } }, i + 1),
        h('span', { style: { flex: 1, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
        h('b', { style: { fontSize: 12, color: T.text } }, fmt(val)),
      ),
    );
  } else if (variant === 'top3') {
    const fade: Record<number, string> = { 0: 'rgba(250,173,20,0.12)', 1: 'rgba(191,191,191,0.12)', 2: 'rgba(212,136,6,0.12)' };
    body = rows.map(([m, name, val], i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: fade[i], borderRadius: 6, marginBottom: 3 } },
        h('span', { style: { width: 22, textAlign: 'center', fontSize: 16 } }, m),
        h('span', { style: { flex: 1, fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
        h('b', { style: { fontSize: 13, color: T.primary } }, fmt(val)),
      ),
    );
  } else if (variant === 'avatar') {
    const ac: Record<number, string> = { 0: '#faad14', 1: '#bfbfbf', 2: '#d48806' };
    body = rows.map(([, name, val], i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h(
          'span',
          { style: { position: 'relative', flexShrink: 0 } },
          h('span', { style: { width: 30, height: 30, borderRadius: '50%', background: ac[i], color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center' } }, name.slice(0, 1).toUpperCase()),
          h('span', { style: { position: 'absolute', right: -3, bottom: -3, width: 15, height: 15, borderRadius: '50%', background: T.bg, color: T.sub, fontSize: 8, fontWeight: 700, display: 'grid', placeItems: 'center', border: '1px solid ' + T.border } }, i + 1),
        ),
        h('span', { style: { flex: 1, fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
        h('b', { style: { fontSize: 12, color: T.text } }, fmt(val)),
      ),
    );
  } else {
    body = rows.map(([m, name, val], i) =>
      h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { width: 24, textAlign: 'center', fontSize: 14 } }, m),
        h('span', { style: { flex: 1, fontSize: 12, margin: '0 8px', color: T.text } }, name),
        h('b', { style: { fontSize: 12, color: T.text } }, fmt(val)),
      ),
    );
  }
  return h(
    PFrame,
    null,
    h('div', { style: { width: '100%', background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '8px 10px' } }, body),
  );
};

registerPreview('distribution', DistributionPreview);
registerPreview('progressGoal', ProgressGoalPreview);
registerPreview('recentList', RecentListPreview);
registerPreview('noticeBanner', NoticeBannerPreview);
registerPreview('leaderboard', LeaderboardPreview);
