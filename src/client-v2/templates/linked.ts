import { themeParam } from '../core/themes';
import { Template } from '../core/types';
import { TARGETS_APPLY_SNIPPET, targetsParam } from './shared';

/**
 * Cross-block linkage family — clicking INSIDE these components filters other
 * data blocks on the page (master→detail, click-a-segment-to-drill…).
 * appslib pattern: addFilterGroup per source + "All" to clear.
 */

/** 点选列表联动 — a master list; clicking a row filters target blocks to it */
export const linkedList: Template = {
  key: 'linkedList',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Linked master list',
  description: 'Click a row → target blocks filter to that record (master / detail)',
  icon: '🧲',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 830,
  params: [
    { name: 'collection', type: 'collection', label: 'List collection', required: true, hint: 'The master records shown in this list' },
    { name: 'titleField', type: 'field', label: 'Title field', collectionFrom: 'collection', required: true },
    { name: 'subtitleField', type: 'field', label: 'Subtitle field', collectionFrom: 'collection' },
    targetsParam,
    {
      name: 'targetField',
      type: 'field',
      label: 'Match field on targets',
      collectionFrom: 'target:targets',
      required: true,
      hint: 'The target-side field that stores this record’s id (e.g. customer_id) — applied to every target by name',
    },
    { name: 'limit', type: 'number', label: 'Max items', default: 10 },
    { name: 'label', type: 'text', label: 'Title' },
    themeParam,
  ],
  body:
    TARGETS_APPLY_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function Comp() {
  const [rows, setRows] = useState(null);
  const [sel, setSel] = useState(ctx.model.__sel != null ? ctx.model.__sel : null);

  useEffect(function () {
    (async function () {
      try {
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: Number($p.limit) || 10, sort: ['-id'] } });
        setRows((res && res.data && res.data.data) || []);
      } catch (e) { setRows([]); }
    })();
  }, []);

  const choose = function (rec) {
    const next = sel != null && rec && String(sel) === String(rec.id) ? null : (rec ? rec.id : null);
    setSel(next);
    ctx.model.__sel = next; // survive remounts
    if (next == null) applyFilter(null);
    else { const f = {}; f[$p.targetField] = { $eq: next }; applyFilter(f); }
  };

  if (rows == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;

  return (
    <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px 8px' }}>
        <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{$p.label || $p.collection}</span>
        {sel != null ? (
          <a onClick={function () { choose(null); }} style={{ fontSize: 12, color: T.primary }}>✕ Clear</a>
        ) : (
          <span style={{ fontSize: 11, color: T.sub }}>click to filter</span>
        )}
      </div>
      {rows.map(function (r, i) {
        const active = sel != null && String(sel) === String(r.id);
        const title = $p.titleField ? r[$p.titleField] : ('#' + r.id);
        const sub = $p.subtitleField ? r[$p.subtitleField] : null;
        return (
          <div
            key={r.id != null ? r.id : i}
            onClick={function () { choose(r); }}
            style={{
              padding: '8px 14px', cursor: 'pointer',
              borderLeft: active ? '3px solid ' + T.primary : '3px solid transparent',
              background: active ? T.card : 'transparent',
              borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? T.primary : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title == null || title === '' ? '—' : String(title)}
              </span>
              {active ? <span style={{ color: T.primary, fontSize: 12, marginLeft: 8 }}>✓</span> : null}
            </div>
            {sub != null && sub !== '' ? (
              <div style={{ fontSize: 11.5, color: T.sub, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(sub)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 点击分布联动 — enum counts as bars/pills; clicking toggles a filter on targets */
export const clickDistribution: Template = {
  key: 'clickDistribution',
  kind: 'block',
  alsoKinds: ['item'],
  logicOnly: true,
  scope: 'collection',
  label: 'Click-to-filter distribution',
  description: 'Value counts as bars / pills — clicking filters target blocks ($in multi-select)',
  icon: '🎯',
  category: 'Filter',
  scenes: ['Dashboard'],
  sort: 831,
  params: [
    { name: 'collection', type: 'collection', label: 'Count collection', required: true, hint: 'Usually the same collection as the targets' },
    {
      name: 'field',
      type: 'field',
      label: 'Group-by field',
      collectionFrom: 'collection',
      required: true,
      hint: 'Select fields get native colors/order; plain text fields work too (observed values)',
    },
    targetsParam,
    {
      name: 'display',
      type: 'select',
      label: 'Display',
      default: 'bars',
      options: [
        { label: 'Bars with counts', value: 'bars' },
        { label: 'Pills with counts', value: 'pills' },
      ],
    },
    { name: 'label', type: 'text', label: 'Title' },
    themeParam,
  ],
  body:
    TARGETS_APPLY_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const COLOR = { blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1', magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d' };

function Comp() {
  const [counts, setCounts] = useState(null);
  const [sel, setSel] = useState(Array.isArray(ctx.model.__sel) ? ctx.model.__sel : []);

  useEffect(function () {
    (async function () {
      try {
        const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 500 } });
        const rows = (res && res.data && res.data.data) || [];
        const c = {};
        rows.forEach(function (r) { const v = r[$p.field]; if (v != null && v !== '') c[String(v)] = (c[String(v)] || 0) + 1; });
        setCounts(c);
      } catch (e) { setCounts({}); }
    })();
  }, []);

  const toggle = function (value) {
    const v = String(value);
    const next = sel.indexOf(v) >= 0 ? sel.filter(function (x) { return x !== v; }) : sel.concat([v]);
    setSel(next);
    ctx.model.__sel = next;
    if (!next.length) applyFilter(null);
    else { const f = {}; f[$p.field] = { $in: next }; applyFilter(f); }
  };
  const clearAll = function () { setSel([]); ctx.model.__sel = []; applyFilter(null); };

  if (counts == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;

  const opts = enumOpts.length
    ? enumOpts
    : Object.keys(counts).map(function (k) { return { value: k, label: k }; });
  const max = opts.reduce(function (m, o) { return Math.max(m, counts[String(o.value)] || 0); }, 0) || 1;

  return (
    <div style={{ padding: '12px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: T.text, flex: 1 }}>{$p.label || ''}</span>
        {sel.length ? <a onClick={clearAll} style={{ fontSize: 12, color: T.primary }}>✕ Clear ({sel.length})</a> : <span style={{ fontSize: 11, color: T.sub }}>click to filter</span>}
      </div>
      {$p.display === 'pills' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {opts.map(function (o, i) {
            const v = String(o.value);
            const active = sel.indexOf(v) >= 0;
            const color = (o.color && COLOR[o.color]) || T.primary;
            return (
              <span
                key={i}
                onClick={function () { toggle(o.value); }}
                style={{
                  cursor: 'pointer', fontSize: 12.5, padding: '4px 12px', borderRadius: 16, userSelect: 'none',
                  border: '1px solid ' + (active ? color : T.border),
                  background: active ? color : T.card, color: active ? '#fff' : T.text, fontWeight: active ? 600 : 400,
                }}
              >
                {(o.label || v) + ' · ' + (counts[v] || 0)}
              </span>
            );
          })}
        </div>
      ) : (
        opts.map(function (o, i) {
          const v = String(o.value);
          const n = counts[v] || 0;
          const active = sel.indexOf(v) >= 0;
          const color = (o.color && COLOR[o.color]) || T.primary;
          return (
            <div key={i} onClick={function () { toggle(o.value); }} style={{ marginBottom: 7, cursor: 'pointer', opacity: sel.length && !active ? 0.45 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                <span style={{ color: active ? color : T.sub, fontWeight: active ? 700 : 400 }}>
                  {(o.label || v)}{active ? ' ✓' : ''}
                </span>
                <b style={{ color: T.text }}>{n}</b>
              </div>
              <div style={{ background: T.card, borderRadius: 4, height: 8 }}>
                <div style={{ width: Math.max(4, (n / max) * 100) + '%', height: '100%', background: color, borderRadius: 4, transition: 'width .3s' }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

ctx.render(<Comp />);
`,
};
