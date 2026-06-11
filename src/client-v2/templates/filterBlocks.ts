import { themeParam } from '../core/themes';
import { Template } from '../core/types';
import { TARGETS_APPLY_SNIPPET, targetsParam } from './shared';

/**
 * Standalone filter blocks (appslib-distilled): facet checkbox groups, a
 * segmented single-select, quick date-range pills and a search box — all
 * driving one or more target data blocks via addFilterGroup.
 */

/** 勾选筛选组 — sidebar facets: per-field checkbox sections with live counts */
export const facetFilter: Template = {
  key: 'facetFilter',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Facet checkbox filter',
  description: 'Sidebar checkbox groups (multi-select per field, live counts) filtering target blocks',
  icon: '☑️',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 832,
  params: [
    targetsParam,
    {
      name: 'facetFields',
      type: 'fields',
      label: 'Facet fields',
      collectionFrom: 'target:targets',
      required: true,
      hint: 'Each field becomes a checkbox section (select fields get native labels; others use observed values)',
    },
    { name: 'showCounts', type: 'boolean', label: 'Show counts', default: true },
    { name: 'label', type: 'text', label: 'Title' },
    themeParam,
  ],
  body:
    TARGETS_APPLY_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const ENUMS = $p.facetFields__enums || {};

function Comp() {
  const [counts, setCounts] = useState(null);
  const [sel, setSel] = useState(ctx.model.__fsel || {});

  useEffect(function () {
    (async function () {
      try {
        const t = __targets()[0];
        const coll = (t && t.collection && t.collection.name) || null;
        if (!coll || !$p.showCounts) { setCounts({}); return; }
        const res = await ctx.api.request({ url: coll + ':list', params: { pageSize: 500 } });
        const rows = (res && res.data && res.data.data) || [];
        const c = {};
        ($p.facetFields || []).forEach(function (f) {
          c[f] = {};
          rows.forEach(function (r) { const v = r[f]; if (v != null && v !== '') c[f][String(v)] = (c[f][String(v)] || 0) + 1; });
        });
        setCounts(c);
      } catch (e) { setCounts({}); }
    })();
  }, []);

  const toggle = function (field, value) {
    const v = String(value);
    const cur = sel[field] || [];
    const nextArr = cur.indexOf(v) >= 0 ? cur.filter(function (x) { return x !== v; }) : cur.concat([v]);
    const next = Object.assign({}, sel); next[field] = nextArr;
    setSel(next); ctx.model.__fsel = next;
    if (!nextArr.length) applyFilter(null, field);
    else { const f = {}; f[field] = { $in: nextArr }; applyFilter(f, field); }
  };
  const clearAll = function () {
    Object.keys(sel).forEach(function (f) { applyFilter(null, f); });
    setSel({}); ctx.model.__fsel = {};
  };
  const total = Object.keys(sel).reduce(function (a, f) { return a + (sel[f] || []).length; }, 0);

  if (counts == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;

  return (
    <div style={{ padding: '12px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{$p.label || 'Filters'}</span>
        {total ? <a onClick={clearAll} style={{ fontSize: 12, color: T.primary }}>✕ Clear ({total})</a> : null}
      </div>
      {($p.facetFields || []).map(function (field) {
        const opts = Array.isArray(ENUMS[field]) && ENUMS[field].length
          ? ENUMS[field]
          : Object.keys((counts[field] || {})).map(function (k) { return { value: k, label: k }; });
        const cur = sel[field] || [];
        return (
          <div key={field} style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{field}</div>
            {opts.map(function (o, i) {
              const v = String(o.value);
              const active = cur.indexOf(v) >= 0;
              const n = (counts[field] && counts[field][v]) || 0;
              return (
                <div key={i} onClick={function () { toggle(field, o.value); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{
                    width: 15, height: 15, borderRadius: 4, flexShrink: 0, display: 'grid', placeItems: 'center',
                    border: '1.5px solid ' + (active ? T.primary : T.border),
                    background: active ? T.primary : T.bg, color: '#fff', fontSize: 10, fontWeight: 800,
                  }}>{active ? '✓' : ''}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: active ? T.text : T.sub, fontWeight: active ? 600 : 400 }}>{o.label || v}</span>
                  {$p.showCounts ? <span style={{ fontSize: 11, color: T.sub }}>{n}</span> : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 分段单选筛选 — segmented control: All | option | option … */
export const segmentedFilter: Template = {
  key: 'segmentedFilter',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Segmented filter',
  description: 'A segmented single-select (All / options) filtering target blocks',
  icon: '🚥',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 833,
  params: [
    targetsParam,
    {
      name: 'field',
      type: 'field',
      label: 'Filter field',
      collectionFrom: 'target:targets',
      required: true,
      hint: 'Select fields use native options; plain fields use observed values',
    },
    themeParam,
  ],
  body:
    TARGETS_APPLY_SNIPPET +
    `
const { useState } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const { useEffect } = ctx.React;

function Comp() {
  const [sel, setSel] = useState(ctx.model.__sel != null ? ctx.model.__sel : null);
  const [opts, setOpts] = useState(enumOpts);
  useEffect(function () {
    if (enumOpts.length) return;
    (async function () {
      try {
        const t = __targets()[0];
        const coll = t && t.collection && t.collection.name;
        if (!coll) return;
        const res = await ctx.api.request({ url: coll + ':list', params: { pageSize: 500 } });
        const rows = (res && res.data && res.data.data) || [];
        const seen = [];
        rows.forEach(function (r) { const v = r[$p.field]; if (v != null && v !== '' && seen.indexOf(String(v)) < 0) seen.push(String(v)); });
        setOpts(seen.slice(0, 12).map(function (v) { return { value: v, label: v }; }));
      } catch (e) {}
    })();
  }, []);
  const choose = function (value) {
    const next = value != null && sel === String(value) ? null : (value == null ? null : String(value));
    setSel(next); ctx.model.__sel = next;
    if (next == null) applyFilter(null);
    else { const f = {}; f[$p.field] = { $eq: next }; applyFilter(f); }
  };
  const all = [{ value: null, label: 'All' }].concat(opts);
  return (
    <div style={{ display: 'inline-flex', padding: 3, background: T.card, borderRadius: 9, border: '1px solid ' + T.border, gap: 2, flexWrap: 'wrap' }}>
      {all.map(function (o, i) {
        const active = o.value == null ? sel == null : sel === String(o.value);
        return (
          <span key={i} onClick={function () { choose(o.value); }}
            style={{
              cursor: 'pointer', fontSize: 12.5, padding: '4px 14px', borderRadius: 7, userSelect: 'none',
              background: active ? T.bg : 'transparent', color: active ? T.primary : T.sub,
              fontWeight: active ? 700 : 400, boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
            {o.label || String(o.value)}
          </span>
        );
      })}
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 日期快捷筛选 — Today / 7d / 30d / This month pills on a date field */
export const dateRangeFilter: Template = {
  key: 'dateRangeFilter',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Date quick filter',
  description: 'Today / 7 days / 30 days / This month pills filtering target blocks by a date field',
  icon: '🗓️',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 834,
  params: [
    targetsParam,
    {
      name: 'dateField',
      type: 'field',
      label: 'Date field',
      collectionFrom: 'target:targets',
      accepts: 'date',
      required: true,
      hint: 'Defaults to createdAt if the targets have it',
    },
    themeParam,
  ],
  body:
    TARGETS_APPLY_SNIPPET +
    `
const { useState } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const PRESETS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'month', label: 'This month' },
];

function rangeOf(key) {
  const now = new Date();
  const end = new Date(now.getTime() + 86400000); // include today
  let start = null;
  if (key === 'today') { start = new Date(now); start.setHours(0, 0, 0, 0); }
  else if (key === '7d') start = new Date(now.getTime() - 7 * 86400000);
  else if (key === '30d') start = new Date(now.getTime() - 30 * 86400000);
  else if (key === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  return start ? [start.toISOString(), end.toISOString()] : null;
}

function Comp() {
  const [sel, setSel] = useState(ctx.model.__sel || 'all');
  const choose = function (key) {
    setSel(key); ctx.model.__sel = key;
    const r = rangeOf(key);
    if (!r) applyFilter(null);
    else { const f = {}; f[$p.dateField] = { $dateBetween: r }; applyFilter(f); }
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {PRESETS.map(function (p2) {
        const active = sel === p2.key;
        return (
          <span key={p2.key} onClick={function () { choose(p2.key); }}
            style={{
              cursor: 'pointer', fontSize: 12.5, padding: '4px 14px', borderRadius: 16, userSelect: 'none',
              border: '1px solid ' + (active ? T.primary : T.border),
              background: active ? T.primary : T.bg, color: active ? '#fff' : T.sub, fontWeight: active ? 600 : 400,
            }}>
            {p2.label}
          </span>
        );
      })}
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 搜索框区块 — standalone keyword search across chosen fields of the targets */
export const searchFilter: Template = {
  key: 'searchFilter',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Search box',
  description: 'A standalone search box — keyword $or-matches chosen fields of target blocks',
  icon: '🔍',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 835,
  params: [
    targetsParam,
    {
      name: 'searchFields',
      type: 'fields',
      label: 'Search in fields',
      collectionFrom: 'target:targets',
      required: true,
    },
    { name: 'placeholder', type: 'text', label: 'Placeholder', default: 'Search…' },
    themeParam,
  ],
  body:
    TARGETS_APPLY_SNIPPET +
    `
const { Input } = ctx.antd;
const { useState } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function Comp() {
  const [q, setQ] = useState(ctx.model.__q || '');
  const run = function (value) {
    setQ(value); ctx.model.__q = value;
    if (ctx.model.__t) clearTimeout(ctx.model.__t);
    ctx.model.__t = setTimeout(function () {
      const v = String(value || '').trim();
      if (!v) { applyFilter(null); return; }
      const or = ($p.searchFields || []).map(function (f) { const c = {}; c[f] = { $includes: v }; return c; });
      applyFilter(or.length === 1 ? or[0] : { $or: or });
    }, 350);
  };
  return (
    <Input
      allowClear
      value={q}
      onChange={function (e) { run(e.target.value); }}
      placeholder={$p.placeholder || 'Search…'}
      prefix={<span style={{ color: T.sub }}>🔍</span>}
      style={{ maxWidth: 360 }}
    />
  );
}

ctx.render(<Comp />);
`,
};
