import React from 'react';
import { Template } from '../core/types';
import { targetsParam } from './shared';
import { themeParam, resolveThemeTokens, ThemeTokens } from '../core/themes';
import { registerStyleThumbs, ThumbFC } from '../core/styleThumbs';
import { registerPreview } from '../core/previews';

/**
 * Multi-condition filter family — components whose options are USER-BUILT
 * condition sets (native Data Scope editor / SQL / JS, see FilterOptionsBuilder)
 * and which filter TARGET blocks on click:
 *
 *   customFilter   — inline bar: pills / buttons / segmented / underline / chips / dropdown
 *   conditionCards — card row, one card per option, live record counts
 *   conditionMenu  — vertical side menu with count badges
 *
 * All three share the same option runtime (resolve builder/sql/js → native
 * filter JSON → resource.addFilterGroup on each target).
 */

const THEME_FALLBACK = `
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0', gradient: 'linear-gradient(135deg,#1677ff,#13c2c2)' };
`;

/** shared option runtime — expects a FILTER_KEY const defined by the body */
const OPTION_RUNTIME = `
const options = (Array.isArray($p.options) ? $p.options : []).filter(function (o) { return o && o.label; });

function targetsOf() {
  return (Array.isArray($p.targets) ? $p.targets : [])
    .map(function (u) { return ctx.getModel(u); })
    .filter(function (m) { return m && m.resource; });
}

// resolve an option to a native filter JSON, honoring its mode:
//   builder → precompiled o.filter (runtime-resolve {{ ctx.* }} variables)
//   sql     → runById ids → id $in ; js → eval, filter JSON or id array
async function resolveFilter(o) {
  const mode = o.mode || 'builder';
  if (mode === 'sql') {
    if (!o.sqlUid) return null;
    const idf = o.idField || 'id';
    const rows = await ctx.sql.runById(o.sqlUid, { type: 'selectRows' });
    const arr = Array.isArray(rows) ? rows : [];
    const ids = arr.map(function (r) {
      if (r && typeof r === 'object') return r[idf] != null ? r[idf] : Object.values(r)[0];
      return r;
    }).filter(function (v) { return v != null; });
    const f = {}; f[idf] = { $in: ids.length ? ids : [null] }; return f;
  }
  if (mode === 'js') {
    const fn = new Function('ctx', 'return (async function(){\\n' + (o.js || 'return null;') + '\\n})()');
    let f = await fn(ctx);
    if (Array.isArray(f)) { const idf = o.idField || 'id'; const w = {}; w[idf] = { $in: f }; return w; }
    return f || null;
  }
  let f = o.filter || null;
  if (f && ctx.resolveJsonTemplate) {
    try { f = await ctx.resolveJsonTemplate(f); } catch (e) { /* keep literal */ }
  }
  return f;
}

async function applyFilter(idx) {
  let filter = null;
  if (idx !== -1) {
    try { filter = await resolveFilter(options[idx]); }
    catch (e) { ctx.message && ctx.message.error('Filter failed: ' + ((e && e.message) || e)); return; }
  }
  targetsOf().forEach(function (t) {
    if (filter) { t.resource.addFilterGroup && t.resource.addFilterGroup(FILTER_KEY, filter); }
    else { t.resource.removeFilterGroup && t.resource.removeFilterGroup(FILTER_KEY); }
    t.resource.setPage && t.resource.setPage(1);
    t.resource.refresh && t.resource.refresh();
  });
}
`;

/** live per-option record counts (first target's collection), cached on the model */
const COUNTS_RUNTIME = `
function useOptionCounts(enabled) {
  const [counts, setCounts] = ctx.React.useState(ctx.model.__cfCounts || null);
  ctx.React.useEffect(function () {
    if (!enabled || ctx.model.__cfCounts) return;
    (async function () {
      const t = targetsOf()[0];
      const coll = t && t.collection && t.collection.name;
      if (!coll) return;
      const out = { all: null, byIdx: [] };
      try {
        const r0 = await ctx.api.request({ url: coll + ':list', params: { pageSize: 1 } });
        out.all = (r0.data && r0.data.meta && r0.data.meta.count) || 0;
      } catch (e) {}
      for (let i = 0; i < options.length; i++) {
        try {
          const f = await resolveFilter(options[i]);
          const r = await ctx.api.request({ url: coll + ':list', params: { filter: f || {}, pageSize: 1 } });
          out.byIdx[i] = (r.data && r.data.meta && r.data.meta.count) || 0;
        } catch (e) { out.byIdx[i] = null; }
      }
      ctx.model.__cfCounts = out;
      setCounts(out);
    })();
  }, []);
  return counts;
}
`;

/**
 * 自定义筛选组 — inline bar (item / block): every option is a USER-BUILT
 * condition set (native Data Scope / SQL / JS). Clicking an option filters the
 * chosen TARGET blocks. Six visual variants + theme.
 */
export const customFilter: Template = {
  key: 'customFilter',
  kind: 'item',
  alsoKinds: ['block'],
  logicOnly: true,
  scope: 'collection',
  label: 'Custom filter group',
  description: 'Pills / buttons / segmented / tabs / chips / dropdown — each option a condition set (or SQL / JS) filtering target blocks',
  icon: '🎛️',
  category: 'Filter',
  scenes: ['Dashboard', 'Form', 'Table'],
  sort: 809,
  params: [
    targetsParam,
    {
      name: 'options',
      type: 'filterOptions',
      label: 'Filter options',
      collectionFrom: 'target:targets',
      required: true,
      hint: 'Each option = one entry. Mode per option: native Data Scope conditions (relation paths, variables, nested groups), SQL (returns ids), or JS (returns a filter). Conditions are built on the target block’s collection. ▶ Test previews matching rows.',
    },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'cfilter',
      label: 'Style',
      default: 'pills',
      options: [
        { label: 'Pills', value: 'pills' },
        { label: 'Buttons', value: 'buttons' },
        { label: 'Segmented', value: 'segmented' },
        { label: 'Underline tabs', value: 'underline' },
        { label: 'Chips', value: 'chips' },
        { label: 'Dropdown', value: 'dropdown' },
      ],
    },
    { name: 'allLabel', type: 'text', label: '“All” label', default: 'All' },
    themeParam,
  ],
  body: `
const { Select } = ctx.antd;
const { useState } = ctx.React;
${THEME_FALLBACK}
const FILTER_KEY = 'jsTplCustomFilter:' + (ctx.model && ctx.model.uid);
${OPTION_RUNTIME}
async function apply(idx, setSel) {
  setSel(idx);
  ctx.model.__cfSel = idx;
  await applyFilter(idx);
}

function CustomFilter() {
  const [sel, setSel] = useState(ctx.model.__cfSel != null ? ctx.model.__cfSel : -1);
  // legacy configs saved before the style param carried display: buttons|dropdown
  const variant = $p.variant || ($p.display === 'dropdown' ? 'dropdown' : 'pills');
  const items = [{ label: $p.allLabel || 'All', idx: -1 }].concat(
    options.map(function (o, i) { return { label: o.label, idx: i }; })
  );

  if (variant === 'dropdown') {
    const selectOpts = items.map(function (o) { return { value: o.idx, label: o.label }; });
    return <Select size="small" style={{ minWidth: 160 }} value={sel} onChange={function (v) { apply(v, setSel); }} options={selectOpts} />;
  }

  function itemStyle(active) {
    const base = { cursor: 'pointer', fontSize: 12, userSelect: 'none', transition: 'all .15s' };
    if (variant === 'buttons') return Object.assign(base, {
      padding: '3px 14px', borderRadius: 6,
      border: '1px solid ' + (active ? T.primary : T.border),
      background: active ? T.primary : T.bg,
      color: active ? '#fff' : T.text,
    });
    if (variant === 'segmented') return Object.assign(base, {
      padding: '3px 14px', borderRadius: 6,
      background: active ? T.bg : 'transparent',
      color: active ? T.primary : T.sub,
      fontWeight: active ? 600 : 400,
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
    });
    if (variant === 'underline') return Object.assign(base, {
      padding: '4px 2px 6px', margin: '0 10px 0 0',
      borderBottom: '2px solid ' + (active ? T.primary : 'transparent'),
      color: active ? T.primary : T.sub,
      fontWeight: active ? 600 : 400,
    });
    if (variant === 'chips') return Object.assign(base, {
      padding: '2px 12px', borderRadius: 5,
      border: '1px solid ' + (active ? T.primary : T.border),
      background: active ? T.primary + '1a' : T.card,
      color: active ? T.primary : T.text,
      fontWeight: active ? 600 : 400,
    });
    // pills (default)
    return Object.assign(base, {
      padding: '2px 12px', borderRadius: 14,
      border: '1px solid ' + (active ? T.primary : T.border),
      background: active ? T.primary : T.bg,
      color: active ? '#fff' : T.text,
    });
  }

  const wrapStyle =
    variant === 'segmented'
      ? { display: 'inline-flex', gap: 2, padding: 3, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, alignItems: 'center' }
      : variant === 'underline'
        ? { display: 'inline-flex', gap: 4, borderBottom: '1px solid ' + T.border, alignItems: 'center' }
        : { display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' };

  return (
    <span style={wrapStyle}>
      {items.map(function (o) {
        return (
          <span key={o.idx} onClick={function () { apply(o.idx, setSel); }} style={itemStyle(sel === o.idx)}>
            {o.label}
          </span>
        );
      })}
    </span>
  );
}

ctx.render(<CustomFilter />);
`,
};

/**
 * 条件统计卡片组 — block: one card per condition set with a LIVE record count;
 * clicking a card filters the target blocks. Six visual variants + theme.
 */
export const conditionCards: Template = {
  key: 'conditionCards',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Condition stat cards',
  description: 'One card per condition set with a live record count — click to filter target blocks',
  icon: '🗂️',
  category: 'Filter',
  scenes: ['Dashboard', 'Table'],
  sort: 812,
  params: [
    targetsParam,
    {
      name: 'options',
      type: 'filterOptions',
      label: 'Filter options',
      collectionFrom: 'target:targets',
      required: true,
      hint: 'Each option = one card. Native Data Scope conditions / SQL / JS per option; the card shows how many records match.',
    },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'cfcards',
      label: 'Style',
      default: 'stat',
      options: [
        { label: 'Stat card', value: 'stat' },
        { label: 'Accent tile', value: 'tile' },
        { label: 'Gradient active', value: 'gradient' },
        { label: 'Outline', value: 'outline' },
        { label: 'Count chips', value: 'chip' },
        { label: 'Ranked bars', value: 'bars' },
      ],
    },
    { name: 'allLabel', type: 'text', label: '“All” label', default: 'All' },
    { name: 'showCounts', type: 'boolean', label: 'Show live counts', default: true },
    themeParam,
  ],
  body: `
const { useState } = ctx.React;
${THEME_FALLBACK}
const FILTER_KEY = 'jsTplCondCards:' + (ctx.model && ctx.model.uid);
${OPTION_RUNTIME}
${COUNTS_RUNTIME}
async function apply(idx, setSel) {
  setSel(idx);
  ctx.model.__ccSel = idx;
  await applyFilter(idx);
}

function ConditionCards() {
  const [sel, setSel] = useState(ctx.model.__ccSel != null ? ctx.model.__ccSel : -1);
  const variant = $p.variant || 'stat';
  const counts = useOptionCounts($p.showCounts !== false);
  const items = [{ label: $p.allLabel || 'All', idx: -1 }].concat(
    options.map(function (o, i) { return { label: o.label, idx: i }; })
  );
  const countOf = function (idx) {
    if (!counts) return null;
    return idx === -1 ? counts.all : counts.byIdx[idx];
  };

  if (variant === 'bars') {
    const max = items.reduce(function (m, o) { const c = countOf(o.idx); return c != null && c > m ? c : m; }, 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 4 }}>
        {items.map(function (o) {
          const active = sel === o.idx;
          const c = countOf(o.idx);
          const pct = c != null ? Math.max(4, Math.round((c / max) * 100)) : 0;
          return (
            <div key={o.idx} onClick={function () { apply(o.idx, setSel); }}
              style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: 6, background: active ? T.primary + '14' : T.bg, border: '1px solid ' + (active ? T.primary : T.border) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: active ? T.primary : T.text, fontWeight: active ? 600 : 400 }}>{o.label}</span>
                <b style={{ color: active ? T.primary : T.sub }}>{c != null ? c : ''}</b>
              </div>
              {c != null ? <div style={{ height: 5, borderRadius: 3, background: T.card, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', borderRadius: 3, background: active ? T.gradient : T.primary, opacity: active ? 1 : 0.55 }} />
              </div> : null}
            </div>
          );
        })}
      </div>
    );
  }

  function cardStyle(active) {
    const base = { cursor: 'pointer', transition: 'all .15s', userSelect: 'none' };
    if (variant === 'tile') return Object.assign(base, {
      padding: '8px 12px', borderRadius: 6, minWidth: 110,
      background: active ? T.primary + '10' : T.bg,
      border: '1px solid ' + (active ? T.primary : T.border),
      borderLeft: '3px solid ' + (active ? T.primary : T.border),
    });
    if (variant === 'gradient') return Object.assign(base, {
      padding: '10px 14px', borderRadius: 8, minWidth: 110,
      background: active ? T.gradient : T.bg,
      border: active ? 'none' : '1px solid ' + T.border,
      color: active ? '#fff' : T.text,
    });
    if (variant === 'outline') return Object.assign(base, {
      padding: '8px 12px', borderRadius: 8, minWidth: 100,
      background: 'transparent',
      border: '1.5px solid ' + (active ? T.primary : T.border),
    });
    if (variant === 'chip') return Object.assign(base, {
      padding: '3px 6px 3px 12px', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
      background: active ? T.primary : T.card,
      border: '1px solid ' + (active ? T.primary : T.border),
    });
    // stat (default)
    return Object.assign(base, {
      padding: '10px 14px', borderRadius: 8, minWidth: 110,
      background: active ? T.card : T.bg,
      border: '1px solid ' + (active ? T.primary : T.border),
      boxShadow: active ? '0 0 0 2px ' + T.primary + '22' : 'none',
    });
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 4 }}>
      {items.map(function (o) {
        const active = sel === o.idx;
        const c = countOf(o.idx);
        if (variant === 'chip') {
          return (
            <span key={o.idx} onClick={function () { apply(o.idx, setSel); }} style={cardStyle(active)}>
              <span style={{ fontSize: 12, color: active ? '#fff' : T.text }}>{o.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '0 7px', borderRadius: 10, background: active ? 'rgba(255,255,255,0.25)' : T.bg, color: active ? '#fff' : T.sub, border: active ? 'none' : '1px solid ' + T.border }}>
                {c != null ? c : '—'}
              </span>
            </span>
          );
        }
        const onGradient = variant === 'gradient' && active;
        return (
          <div key={o.idx} onClick={function () { apply(o.idx, setSel); }} style={cardStyle(active)}>
            <div style={{ fontSize: 11, color: onGradient ? 'rgba(255,255,255,0.85)' : T.sub }}>{o.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: onGradient ? '#fff' : active ? T.primary : T.text }}>
              {c != null ? c : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

ctx.render(<ConditionCards />);
`,
};

/**
 * 条件侧边菜单 — block: a vertical menu of condition sets with count badges;
 * clicking an entry filters the target blocks. Six visual variants + theme.
 */
export const conditionMenu: Template = {
  key: 'conditionMenu',
  kind: 'block',
  logicOnly: true,
  scope: 'collection',
  label: 'Condition side menu',
  description: 'A vertical menu of condition sets with count badges — click to filter target blocks',
  icon: '📑',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 813,
  params: [
    targetsParam,
    {
      name: 'options',
      type: 'filterOptions',
      label: 'Filter options',
      collectionFrom: 'target:targets',
      required: true,
      hint: 'Each option = one menu entry. Native Data Scope conditions / SQL / JS per option.',
    },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'cfmenu',
      label: 'Style',
      default: 'list',
      options: [
        { label: 'List', value: 'list' },
        { label: 'Accent rail', value: 'rail' },
        { label: 'Pills', value: 'pills' },
        { label: 'Boxed', value: 'boxed' },
        { label: 'Numbered', value: 'numbered' },
        { label: 'Dots', value: 'dots' },
      ],
    },
    { name: 'title', type: 'text', label: 'Title' },
    { name: 'allLabel', type: 'text', label: '“All” label', default: 'All' },
    { name: 'showCounts', type: 'boolean', label: 'Show live counts', default: true },
    themeParam,
  ],
  body: `
const { useState } = ctx.React;
${THEME_FALLBACK}
const FILTER_KEY = 'jsTplCondMenu:' + (ctx.model && ctx.model.uid);
${OPTION_RUNTIME}
${COUNTS_RUNTIME}
async function apply(idx, setSel) {
  setSel(idx);
  ctx.model.__cmSel = idx;
  await applyFilter(idx);
}

function ConditionMenu() {
  const [sel, setSel] = useState(ctx.model.__cmSel != null ? ctx.model.__cmSel : -1);
  const variant = $p.variant || 'list';
  const counts = useOptionCounts($p.showCounts !== false);
  const items = [{ label: $p.allLabel || 'All', idx: -1 }].concat(
    options.map(function (o, i) { return { label: o.label, idx: i }; })
  );
  const countOf = function (idx) {
    if (!counts) return null;
    return idx === -1 ? counts.all : counts.byIdx[idx];
  };

  function rowStyle(active) {
    const base = {
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', fontSize: 13, userSelect: 'none', transition: 'all .15s',
      color: active ? T.primary : T.text, fontWeight: active ? 600 : 400,
    };
    if (variant === 'rail') return Object.assign(base, {
      borderLeft: '3px solid ' + (active ? T.primary : 'transparent'),
      background: active ? T.primary + '0d' : 'transparent',
    });
    if (variant === 'pills') return Object.assign(base, {
      borderRadius: 16, margin: '2px 0',
      background: active ? T.primary : 'transparent',
      color: active ? '#fff' : T.text,
    });
    if (variant === 'boxed') return Object.assign(base, {
      borderRadius: 6, margin: '3px 0',
      border: '1px solid ' + (active ? T.primary : T.border),
      background: active ? T.primary + '10' : T.bg,
    });
    // list / numbered / dots
    return Object.assign(base, {
      borderRadius: 6,
      background: active ? T.card : 'transparent',
    });
  }

  return (
    <div style={{ padding: '8px 6px', background: variant === 'boxed' ? 'transparent' : T.bg }}>
      {$p.title ? <div style={{ fontSize: 13, fontWeight: 700, color: T.text, padding: '0 10px 8px' }}>{$p.title}</div> : null}
      {items.map(function (o, pos) {
        const active = sel === o.idx;
        const c = countOf(o.idx);
        const pillActive = variant === 'pills' && active;
        return (
          <div key={o.idx} onClick={function () { apply(o.idx, setSel); }} style={rowStyle(active)}>
            {variant === 'numbered' ? (
              <span style={{ width: 18, height: 18, borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', background: active ? T.primary : T.card, color: active ? '#fff' : T.sub, border: active ? 'none' : '1px solid ' + T.border, flexShrink: 0 }}>{pos}</span>
            ) : variant === 'dots' ? (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? T.primary : T.border, flexShrink: 0 }} />
            ) : null}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            {c != null ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '0 7px', borderRadius: 10, background: pillActive ? 'rgba(255,255,255,0.25)' : active ? T.primary + '1a' : T.card, color: pillActive ? '#fff' : active ? T.primary : T.sub, border: pillActive || active ? 'none' : '1px solid ' + T.border }}>
                {c}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

ctx.render(<ConditionMenu />);
`,
};

/**
 * 按钮筛选组 — toolbar action: pill buttons (from the field's own options)
 * that filter THIS table. Selection survives remounts via ctx.model.
 */
export const pillFilter: Template = {
  key: 'pillFilter',
  scope: 'collection',
  kind: 'action',
  label: 'Button filter group',
  description: 'Pill buttons from a field’s options that filter the table',
  icon: '🔘',
  category: 'Filter',
  scenes: ['Table'],
  sort: 811,
  params: [
    {
      name: 'field',
      type: 'field',
      label: 'Filter field',
      required: true,
      accepts: 'enum',
      hint: 'A select/enum field of this table — buttons come from its options',
    },
    { name: 'multiple', type: 'boolean', label: 'Multi-select ($in combine)', default: false },
    { name: 'allLabel', type: 'text', label: '“All” label', default: 'All' },
  ],
  body: `
const { useState } = ctx.React;

const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const FILTER_KEY = 'jsTplPillFilter:' + $p.field;
const COLOR = { blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1', magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d' };

function PillFilter() {
  const multi = !!$p.multiple;
  // survive remounts (the toolbar remounts on each table refresh)
  const [sel, setSel] = useState(ctx.model.__pillSel != null ? ctx.model.__pillSel : (multi ? [] : '__all__'));

  function push(values) {
    if (!ctx.resource) return;
    if (!values.length) {
      ctx.resource.removeFilterGroup && ctx.resource.removeFilterGroup(FILTER_KEY);
    } else {
      var flt = {};
      flt[$p.field] = values.length === 1 ? { $eq: values[0] } : { $in: values };
      ctx.resource.addFilterGroup && ctx.resource.addFilterGroup(FILTER_KEY, flt);
    }
    ctx.resource.setPage && ctx.resource.setPage(1);
    ctx.resource.refresh && ctx.resource.refresh();
  }

  const apply = function (next) {
    if (multi) {
      let arr;
      if (next === '__all__') arr = [];
      else {
        const cur = Array.isArray(sel) ? sel : [];
        arr = cur.indexOf(next) >= 0 ? cur.filter(function (v) { return v !== next; }) : cur.concat([next]);
      }
      setSel(arr); ctx.model.__pillSel = arr;
      push(arr);
      return;
    }
    setSel(next);
    ctx.model.__pillSel = next;
    push(next === '__all__' ? [] : [next]);
  };

  const pills = [{ value: '__all__', label: $p.allLabel || 'All', color: null }].concat(enumOpts);

  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {pills.map(function (o) {
        const active = multi
          ? (o.value === '__all__' ? (Array.isArray(sel) && sel.length === 0) : Array.isArray(sel) && sel.indexOf(o.value) >= 0)
          : sel === o.value;
        const accent = (o.color && COLOR[o.color]) || '#1677ff';
        return (
          <span
            key={String(o.value)}
            onClick={function () { apply(o.value); }}
            style={{
              cursor: 'pointer', padding: '2px 12px', borderRadius: 14, fontSize: 12, userSelect: 'none',
              border: '1px solid ' + (active ? accent : '#d9d9d9'),
              background: active ? accent : '#fff',
              color: active ? '#fff' : 'rgba(0,0,0,0.72)',
            }}
          >
            {o.label || String(o.value)}
          </span>
        );
      })}
    </span>
  );
}

ctx.render(<PillFilter />);
`,
};

/**
 * 树筛选 — standalone block: a tree of a field's options (of a TARGET block's
 * collection); clicking a node filters that target block.
 */
export const treeFilter: Template = {
  key: 'treeFilter',
  scope: 'collection',
  kind: 'block',
  label: 'Tree filter',
  description: 'A side tree of a field’s options that filters a target block',
  icon: '🌳',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 845,
  params: [
    { name: 'targetUid', type: 'targetBlock', label: 'Target block to filter', required: true },
    {
      name: 'field',
      type: 'field',
      label: 'Filter field',
      collectionFrom: 'target:targetUid',
      required: true,
      hint: 'A field of the target block’s collection; its options become tree nodes',
    },
    { name: 'title', type: 'text', label: 'Title' },
  ],
  body: `
const { Tree, Empty } = ctx.antd;
const { useState, useEffect } = ctx.React;

const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const FILTER_KEY = 'jsTplTreeFilter:' + (ctx.model && ctx.model.uid);

function target() { return $p.targetUid ? ctx.getModel($p.targetUid) : null; }

function applyValue(v) {
  const t = target();
  if (!t || !t.resource) { ctx.message && ctx.message.warning('Target block not found'); return; }
  if (v == null || v === '__all__') {
    t.resource.removeFilterGroup && t.resource.removeFilterGroup(FILTER_KEY);
  } else {
    var flt = {}; flt[$p.field] = { $eq: v };
    t.resource.addFilterGroup && t.resource.addFilterGroup(FILTER_KEY, flt);
  }
  t.resource.setPage && t.resource.setPage(1);
  t.resource.refresh && t.resource.refresh();
}

function TreeFilter() {
  // options: prefer the field's native enum; otherwise build from live distinct values
  const [nodes, setNodes] = useState(enumOpts.length ? enumOpts.map(function (o) { return { title: o.label || String(o.value), key: String(o.value) }; }) : null);
  useEffect(function () {
    if (nodes != null) return;
    (async function () {
      try {
        const t = target();
        const coll = t && t.collection && t.collection.name;
        if (!coll) { setNodes([]); return; }
        const res = await ctx.api.request({ url: coll + ':list', params: { pageSize: 200, fields: [$p.field] } });
        const rows = (res && res.data && res.data.data) || [];
        const seen = {};
        rows.forEach(function (r) { const v = r[$p.field]; if (v != null && v !== '') seen[String(v)] = true; });
        setNodes(Object.keys(seen).sort().map(function (v) { return { title: v, key: v }; }));
      } catch (e) { setNodes([]); }
    })();
  }, []);

  if (nodes == null) return <div style={{ padding: 12, color: '#999' }}>Loading…</div>;
  if (!nodes.length) return <Empty description="No options" />;

  const data = [{ title: '📂 ' + ($p.title || 'All'), key: '__all__', children: nodes }];

  return (
    <div style={{ padding: '8px 4px' }}>
      <Tree
        defaultExpandAll
        blockNode
        selectable
        treeData={data}
        onSelect={function (keys) { applyValue(keys && keys.length ? keys[0] : '__all__'); }}
      />
    </div>
  );
}

ctx.render(<TreeFilter />);
`,
};

// ─── style thumbnails + gallery previews (family-registered, English samples) ──
// .ts file: top-level components must use React.createElement — no JSX here.

const h = React.createElement;

const SAMPLE = ['High value', 'New this month', 'Stalled'];

// — customFilter thumbs: a row of two mini items per variant —
const miniRow = (kids: React.ReactNode[], style?: React.CSSProperties) =>
  h('div', { style: { display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center', padding: '12px 4px', ...style } }, ...kids);

const CfPills: ThumbFC = ({ T }) =>
  miniRow([
    h('span', { key: 'a', style: { padding: '1px 9px', borderRadius: 10, fontSize: 8, background: T.primary, color: '#fff' } }, 'All'),
    h('span', { key: 'b', style: { padding: '1px 9px', borderRadius: 10, fontSize: 8, background: T.bg, color: T.text, border: '1px solid ' + T.border } }, 'VIP'),
  ]);
const CfButtons: ThumbFC = ({ T }) =>
  miniRow([
    h('span', { key: 'a', style: { padding: '1px 9px', borderRadius: 4, fontSize: 8, background: T.primary, color: '#fff' } }, 'All'),
    h('span', { key: 'b', style: { padding: '1px 9px', borderRadius: 4, fontSize: 8, background: T.bg, color: T.text, border: '1px solid ' + T.border } }, 'VIP'),
  ]);
const CfSegmented: ThumbFC = ({ T }) =>
  miniRow([
    h(
      'span',
      { key: 's', style: { display: 'inline-flex', gap: 2, padding: 2, borderRadius: 6, background: T.card, border: '1px solid ' + T.border } },
      h('span', { key: 'a', style: { padding: '1px 8px', borderRadius: 4, fontSize: 8, background: T.bg, color: T.primary, fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' } }, 'All'),
      h('span', { key: 'b', style: { padding: '1px 8px', fontSize: 8, color: T.sub } }, 'VIP'),
    ),
  ]);
const CfUnderline: ThumbFC = ({ T }) =>
  miniRow([
    h('span', { key: 'a', style: { padding: '2px 2px 3px', fontSize: 8, color: T.primary, fontWeight: 600, borderBottom: '2px solid ' + T.primary } }, 'All'),
    h('span', { key: 'b', style: { padding: '2px 2px 3px', fontSize: 8, color: T.sub, borderBottom: '2px solid transparent' } }, 'VIP'),
  ], { borderBottom: undefined });
const CfChips: ThumbFC = ({ T }) =>
  miniRow([
    h('span', { key: 'a', style: { padding: '1px 8px', borderRadius: 3, fontSize: 8, background: T.primary + '1a', color: T.primary, border: '1px solid ' + T.primary, fontWeight: 600 } }, 'All'),
    h('span', { key: 'b', style: { padding: '1px 8px', borderRadius: 3, fontSize: 8, background: T.card, color: T.text, border: '1px solid ' + T.border } }, 'VIP'),
  ]);
const CfDropdown: ThumbFC = ({ T }) =>
  miniRow([
    h(
      'span',
      { key: 'a', style: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 8px', borderRadius: 4, fontSize: 8, background: T.bg, color: T.text, border: '1px solid ' + T.border, minWidth: 56, justifyContent: 'space-between' } },
      'All',
      h('span', { key: 'c', style: { color: T.sub, fontSize: 7 } }, '▾'),
    ),
  ]);

registerStyleThumbs('cfilter', {
  pills: CfPills,
  buttons: CfButtons,
  segmented: CfSegmented,
  underline: CfUnderline,
  chips: CfChips,
  dropdown: CfDropdown,
});

// — conditionCards thumbs —
const miniCard = (T: ThemeTokens, label: string, num: string, active: boolean, style: React.CSSProperties) =>
  h(
    'span',
    { style: { display: 'inline-flex', flexDirection: 'column' as const, padding: '4px 7px', borderRadius: 5, ...style } },
    h('span', { key: 'l', style: { fontSize: 6, color: (style.color as string) || T.sub } }, label),
    h('span', { key: 'n', style: { fontSize: 11, fontWeight: 700, lineHeight: 1.1, color: (style.color as string) || (active ? T.primary : T.text) } }, num),
  );

const CcStat: ThumbFC = ({ T }) =>
  miniRow([
    miniCard(T, 'All', '24', true, { key: 'a', background: T.card, border: '1px solid ' + T.primary, boxShadow: '0 0 0 1px ' + T.primary + '33' } as any),
    miniCard(T, 'VIP', '8', false, { key: 'b', background: T.bg, border: '1px solid ' + T.border } as any),
  ]);
const CcTile: ThumbFC = ({ T }) =>
  miniRow([
    miniCard(T, 'All', '24', true, { key: 'a', background: T.primary + '10', border: '1px solid ' + T.primary, borderLeft: '3px solid ' + T.primary } as any),
    miniCard(T, 'VIP', '8', false, { key: 'b', background: T.bg, border: '1px solid ' + T.border, borderLeft: '3px solid ' + T.border } as any),
  ]);
const CcGradient: ThumbFC = ({ T }) =>
  miniRow([
    miniCard(T, 'All', '24', true, { key: 'a', background: T.gradient, color: '#fff' } as any),
    miniCard(T, 'VIP', '8', false, { key: 'b', background: T.bg, border: '1px solid ' + T.border } as any),
  ]);
const CcOutline: ThumbFC = ({ T }) =>
  miniRow([
    miniCard(T, 'All', '24', true, { key: 'a', background: 'transparent', border: '1.5px solid ' + T.primary } as any),
    miniCard(T, 'VIP', '8', false, { key: 'b', background: 'transparent', border: '1.5px solid ' + T.border } as any),
  ]);
const CcChip: ThumbFC = ({ T }) =>
  miniRow([
    h(
      'span',
      { key: 'a', style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 4px 1px 8px', borderRadius: 10, fontSize: 7, background: T.primary, color: '#fff' } },
      'All',
      h('span', { key: 'n', style: { padding: '0 4px', borderRadius: 6, fontSize: 6, fontWeight: 700, background: 'rgba(255,255,255,0.3)' } }, '24'),
    ),
    h(
      'span',
      { key: 'b', style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 4px 1px 8px', borderRadius: 10, fontSize: 7, background: T.card, color: T.text, border: '1px solid ' + T.border } },
      'VIP',
      h('span', { key: 'n', style: { padding: '0 4px', borderRadius: 6, fontSize: 6, fontWeight: 700, background: T.bg, color: T.sub, border: '1px solid ' + T.border } }, '8'),
    ),
  ]);
const CcBars: ThumbFC = ({ T }) =>
  h(
    'div',
    { style: { display: 'flex', flexDirection: 'column' as const, gap: 3, padding: '10px 8px' } },
    [24, 8].map((n, i) =>
      h(
        'div',
        { key: i, style: { padding: '2px 5px', borderRadius: 4, border: '1px solid ' + (i === 0 ? T.primary : T.border), background: i === 0 ? T.primary + '14' : T.bg } },
        h('div', { key: 't', style: { display: 'flex', justifyContent: 'space-between', fontSize: 6, color: i === 0 ? T.primary : T.text } }, h('span', { key: 'l' }, i === 0 ? 'All' : 'VIP'), h('b', { key: 'n' }, String(n))),
        h('div', { key: 'b', style: { height: 3, borderRadius: 2, background: T.card, marginTop: 2 } }, h('div', { style: { width: (n / 24) * 100 + '%', height: '100%', borderRadius: 2, background: T.primary, opacity: i === 0 ? 1 : 0.55 } })),
      ),
    ),
  );

registerStyleThumbs('cfcards', { stat: CcStat, tile: CcTile, gradient: CcGradient, outline: CcOutline, chip: CcChip, bars: CcBars });

// — conditionMenu thumbs —
const menuRows = (T: ThemeTokens, deco: (active: boolean, i: number) => React.CSSProperties, lead?: (active: boolean, i: number) => React.ReactNode) =>
  h(
    'div',
    { style: { display: 'flex', flexDirection: 'column' as const, gap: 2, padding: '8px 10px' } },
    ['All', 'High value', 'Stalled'].map((l, i) => {
      const active = i === 0;
      return h(
        'div',
        { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 7, color: active ? T.primary : T.text, fontWeight: active ? 600 : 400, ...deco(active, i) } },
        lead ? lead(active, i) : null,
        h('span', { key: 'l', style: { flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' as const } }, l),
        h('span', { key: 'c', style: { fontSize: 6, color: active ? T.primary : T.sub } }, ['24', '8', '5'][i]),
      );
    }),
  );

const CmList: ThumbFC = ({ T }) => menuRows(T, (a) => ({ borderRadius: 4, background: a ? T.card : 'transparent' }));
const CmRail: ThumbFC = ({ T }) => menuRows(T, (a) => ({ borderLeft: '2px solid ' + (a ? T.primary : 'transparent'), background: a ? T.primary + '0d' : 'transparent' }));
const CmPills: ThumbFC = ({ T }) => menuRows(T, (a) => ({ borderRadius: 10, background: a ? T.primary : 'transparent', color: a ? '#fff' : T.text }));
const CmBoxed: ThumbFC = ({ T }) => menuRows(T, (a) => ({ borderRadius: 4, border: '1px solid ' + (a ? T.primary : T.border), background: a ? T.primary + '10' : T.bg }));
const CmNumbered: ThumbFC = ({ T }) =>
  menuRows(
    T,
    (a) => ({ borderRadius: 4, background: a ? T.card : 'transparent' }),
    (a, i) => h('span', { key: 'n', style: { width: 9, height: 9, borderRadius: '50%', fontSize: 5, fontWeight: 700, display: 'grid', placeItems: 'center', background: a ? T.primary : T.card, color: a ? '#fff' : T.sub, border: a ? 'none' : '1px solid ' + T.border, flexShrink: 0 } }, String(i)),
  );
const CmDots: ThumbFC = ({ T }) =>
  menuRows(
    T,
    (a) => ({ borderRadius: 4, background: a ? T.card : 'transparent' }),
    (a) => h('span', { key: 'd', style: { width: 5, height: 5, borderRadius: '50%', background: a ? T.primary : T.border, flexShrink: 0 } }),
  );

registerStyleThumbs('cfmenu', { list: CmList, rail: CmRail, pills: CmPills, boxed: CmBoxed, numbered: CmNumbered, dots: CmDots });

// — gallery previews (English mock samples; follow variant + theme live) —

type PvProps = { params?: any; ctx?: any };

const PvFrame = (kids: React.ReactNode, T: ThemeTokens, footer?: string) =>
  h(
    'div',
    { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 6, padding: 12, minHeight: 118, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center' } },
    kids,
    footer ? h('div', { key: 'f', style: { textAlign: 'center' as const, fontSize: 11, color: T.sub, marginTop: 8 } }, footer) : null,
  );

const optionLabels = (params: any): string[] => {
  const opts: any[] = Array.isArray(params?.options) ? params.options.filter((o: any) => o?.label) : [];
  return [params?.allLabel || 'All', ...(opts.length ? opts.map((o) => o.label) : SAMPLE)];
};

const CustomFilterPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || (params?.display === 'dropdown' ? 'dropdown' : 'pills');
  const labels = optionLabels(params).slice(0, 4);

  if (variant === 'dropdown') {
    return PvFrame(
      h(
        'div',
        { key: 'd', style: { display: 'flex', justifyContent: 'center' } },
        h(
          'span',
          { style: { display: 'inline-flex', alignItems: 'center', gap: 16, padding: '3px 10px', borderRadius: 6, fontSize: 12, background: T.bg, color: T.text, border: '1px solid ' + T.border } },
          labels[0],
          h('span', { key: 'c', style: { color: T.sub, fontSize: 10 } }, '▾'),
        ),
      ),
      T,
      'each option = your own condition set',
    );
  }

  const itemStyle = (active: boolean): React.CSSProperties => {
    if (variant === 'buttons')
      return { padding: '2px 12px', borderRadius: 6, fontSize: 12, border: '1px solid ' + (active ? T.primary : T.border), background: active ? T.primary : T.bg, color: active ? '#fff' : T.text };
    if (variant === 'segmented')
      return { padding: '2px 12px', borderRadius: 5, fontSize: 12, background: active ? T.bg : 'transparent', color: active ? T.primary : T.sub, fontWeight: active ? 600 : 400, boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' };
    if (variant === 'underline')
      return { padding: '3px 2px 5px', fontSize: 12, color: active ? T.primary : T.sub, fontWeight: active ? 600 : 400, borderBottom: '2px solid ' + (active ? T.primary : 'transparent') };
    if (variant === 'chips')
      return { padding: '2px 12px', borderRadius: 5, fontSize: 12, border: '1px solid ' + (active ? T.primary : T.border), background: active ? T.primary + '1a' : T.card, color: active ? T.primary : T.text };
    return { padding: '2px 12px', borderRadius: 14, fontSize: 12, border: '1px solid ' + (active ? T.primary : T.border), background: active ? T.primary : T.bg, color: active ? '#fff' : T.text };
  };

  const wrapStyle: React.CSSProperties =
    variant === 'segmented'
      ? { display: 'inline-flex', gap: 2, padding: 3, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, margin: '0 auto' }
      : variant === 'underline'
        ? { display: 'inline-flex', gap: 10, borderBottom: '1px solid ' + T.border, margin: '0 auto' }
        : { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const };

  return PvFrame(
    h('div', { key: 'r', style: { display: 'flex', justifyContent: 'center' } }, h('span', { style: wrapStyle }, labels.map((l, i) => h('span', { key: i, style: itemStyle(i === 0) }, l)))),
    T,
    'each option = your own condition set',
  );
};

const MOCK_COUNTS = [24, 8, 5, 3];

const ConditionCardsPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'stat';
  const labels = optionLabels(params).slice(0, 3);

  if (variant === 'bars') {
    return PvFrame(
      h(
        'div',
        { key: 'b', style: { display: 'flex', flexDirection: 'column' as const, gap: 5 } },
        labels.map((l, i) =>
          h(
            'div',
            { key: i, style: { padding: '4px 8px', borderRadius: 6, border: '1px solid ' + (i === 0 ? T.primary : T.border), background: i === 0 ? T.primary + '14' : T.bg } },
            h('div', { key: 't', style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3, color: i === 0 ? T.primary : T.text } }, h('span', { key: 'l' }, l), h('b', { key: 'n' }, String(MOCK_COUNTS[i]))),
            h('div', { key: 'r', style: { height: 4, borderRadius: 2, background: T.card } }, h('div', { style: { width: (MOCK_COUNTS[i] / MOCK_COUNTS[0]) * 100 + '%', height: '100%', borderRadius: 2, background: T.primary, opacity: i === 0 ? 1 : 0.55 } })),
          ),
        ),
      ),
      T,
    );
  }

  const cardStyle = (active: boolean): React.CSSProperties => {
    if (variant === 'tile') return { padding: '6px 10px', borderRadius: 6, background: active ? T.primary + '10' : T.bg, border: '1px solid ' + (active ? T.primary : T.border), borderLeft: '3px solid ' + (active ? T.primary : T.border) };
    if (variant === 'gradient') return { padding: '7px 10px', borderRadius: 8, background: active ? T.gradient : T.bg, border: active ? 'none' : '1px solid ' + T.border };
    if (variant === 'outline') return { padding: '6px 10px', borderRadius: 8, background: 'transparent', border: '1.5px solid ' + (active ? T.primary : T.border) };
    return { padding: '7px 10px', borderRadius: 8, background: active ? T.card : T.bg, border: '1px solid ' + (active ? T.primary : T.border), boxShadow: active ? '0 0 0 2px ' + T.primary + '22' : 'none' };
  };

  if (variant === 'chip') {
    return PvFrame(
      h(
        'div',
        { key: 'c', style: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' as const } },
        labels.map((l, i) =>
          h(
            'span',
            { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 5px 2px 10px', borderRadius: 14, fontSize: 11, background: i === 0 ? T.primary : T.card, color: i === 0 ? '#fff' : T.text, border: '1px solid ' + (i === 0 ? T.primary : T.border) } },
            l,
            h('span', { key: 'n', style: { padding: '0 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: i === 0 ? 'rgba(255,255,255,0.3)' : T.bg, color: i === 0 ? '#fff' : T.sub } }, String(MOCK_COUNTS[i])),
          ),
        ),
      ),
      T,
      'live record count per condition set',
    );
  }

  return PvFrame(
    h(
      'div',
      { key: 'g', style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' as const } },
      labels.map((l, i) => {
        const onGrad = variant === 'gradient' && i === 0;
        return h(
          'div',
          { key: i, style: cardStyle(i === 0) },
          h('div', { key: 'l', style: { fontSize: 10, color: onGrad ? 'rgba(255,255,255,0.85)' : T.sub } }, l),
          h('div', { key: 'n', style: { fontSize: 17, fontWeight: 700, lineHeight: 1.2, color: onGrad ? '#fff' : i === 0 ? T.primary : T.text } }, String(MOCK_COUNTS[i])),
        );
      }),
    ),
    T,
    'live record count per condition set',
  );
};

const ConditionMenuPreview: React.FC<PvProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'list';
  const labels = optionLabels(params).slice(0, 4);

  const rowStyle = (active: boolean): React.CSSProperties => {
    const base: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 12, color: active ? T.primary : T.text, fontWeight: active ? 600 : 400 };
    if (variant === 'rail') return { ...base, borderLeft: '3px solid ' + (active ? T.primary : 'transparent'), background: active ? T.primary + '0d' : 'transparent' };
    if (variant === 'pills') return { ...base, borderRadius: 14, background: active ? T.primary : 'transparent', color: active ? '#fff' : T.text };
    if (variant === 'boxed') return { ...base, borderRadius: 6, margin: '2px 0', border: '1px solid ' + (active ? T.primary : T.border), background: active ? T.primary + '10' : T.bg };
    return { ...base, borderRadius: 6, background: active ? T.card : 'transparent' };
  };

  return PvFrame(
    h(
      'div',
      { key: 'm', style: { display: 'flex', flexDirection: 'column' as const, gap: 2, maxWidth: 190, margin: '0 auto', width: '100%' } },
      params?.title ? h('div', { key: 't', style: { fontSize: 12, fontWeight: 700, color: T.text, padding: '0 8px 4px' } }, params.title) : null,
      labels.map((l, i) => {
        const active = i === 0;
        return h(
          'div',
          { key: i, style: rowStyle(active) },
          variant === 'numbered'
            ? h('span', { key: 'n', style: { width: 15, height: 15, borderRadius: '50%', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', background: active ? T.primary : T.card, color: active ? '#fff' : T.sub, border: active ? 'none' : '1px solid ' + T.border, flexShrink: 0 } }, String(i))
            : variant === 'dots'
              ? h('span', { key: 'd', style: { width: 7, height: 7, borderRadius: '50%', background: active ? T.primary : T.border, flexShrink: 0 } })
              : null,
          h('span', { key: 'l', style: { flex: 1 } }, l),
          h('span', { key: 'c', style: { fontSize: 10, fontWeight: 600, padding: '0 6px', borderRadius: 8, background: variant === 'pills' && active ? 'rgba(255,255,255,0.25)' : active ? T.primary + '1a' : T.card, color: variant === 'pills' && active ? '#fff' : active ? T.primary : T.sub } }, String(MOCK_COUNTS[i])),
        );
      }),
    ),
    T,
  );
};

registerPreview('customFilter', CustomFilterPreview);
registerPreview('conditionCards', ConditionCardsPreview);
registerPreview('conditionMenu', ConditionMenuPreview);
