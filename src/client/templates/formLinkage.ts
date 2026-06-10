import { themeParam } from '../core/themes';
import { Template } from '../core/types';

/**
 * Form-linkage family — JS items that LISTEN to form value changes and drive
 * other parts of the page: hide/show blocks, filter a target block (the
 * "knowledge-base search" pattern), auto-fill sibling fields, or roll up a
 * sub-table column into a live total (the crmv2 expense-claim pattern).
 *
 * Hard-won rules baked in (zheneng/appslib lessons):
 * - de-dup the formValuesChange listener across re-runs (ctx.model.__h)
 * - GATE on the watched field actually changing (ctx.model.__last) so
 *   setFieldsValue / refresh loops can't feed back into themselves
 * - hide blocks via a rendered <style> on [data-grid-item-uid] — no DOM pokes
 */

/** 表单驱动显隐 — watch a form field, hide/show a target block */
export const formToggleBlocks: Template = {
  key: 'formToggleBlocks',
  logicOnly: true,
  kind: 'item',
  scope: 'collection',
  label: 'Show / hide block by value',
  description: 'Watch a form field and hide or show another block',
  icon: '👁️',
  category: 'Action',
  scenes: ['Form'],
  sort: 858,
  params: [
    { name: 'watchField', type: 'field', label: 'Watch field', required: true, hint: 'A field of this form' },
    { name: 'targetUid', type: 'targetBlock', label: 'Target block', required: true },
    {
      name: 'mode',
      type: 'select',
      label: 'Behavior',
      default: 'hideWhenSet',
      options: [
        { label: 'Hide target when field has a value', value: 'hideWhenSet' },
        { label: 'Show target only when field has a value', value: 'showWhenSet' },
        { label: 'Show target only when field equals…', value: 'showWhenEquals' },
      ],
    },
    {
      name: 'matchValue',
      type: 'fieldValue',
      label: 'Equals value',
      fieldFrom: 'watchField',
      showWhen: (p) => p.mode === 'showWhenEquals',
    },
  ],
  body: `
function hasVal(v) {
  if (v == null) return false;
  if (typeof v === 'object') return v.id != null || Object.keys(v).length > 0;
  return String(v).trim() !== '';
}

function render() {
  let v = null;
  try { v = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue()[$p.watchField] : null; } catch (e) {}
  let hide = false;
  if ($p.mode === 'showWhenSet') hide = !hasVal(v);
  else if ($p.mode === 'showWhenEquals') {
    const cur = (v && typeof v === 'object' && v.id != null) ? v.id : v;
    hide = String(cur) !== String($p.matchValue);
  } else hide = hasVal(v); // hideWhenSet
  // hide via a rendered <style> on the grid item — no DOM manipulation needed
  ctx.render(hide
    ? <style>{'[data-grid-item-uid="' + $p.targetUid + '"]{display:none!important;}'}</style>
    : null);
}

render();
const bm = ctx.blockModel;
if (bm && bm.on) { if (bm.__h && bm.off) bm.off('formValuesChange', bm.__h); bm.__h = render; bm.on('formValuesChange', render); }
`,
};

/** 表单值驱动过滤 — the knowledge-base search pattern: form input filters a target block */
export const formDrivenFilter: Template = {
  key: 'formDrivenFilter',
  logicOnly: true,
  kind: 'item',
  scope: 'collection',
  label: 'Form value → filter block',
  description: 'Form input live-filters a target block (search-box pattern)',
  icon: '🔎',
  category: 'Filter',
  scenes: ['Form'],
  sort: 859,
  params: [
    { name: 'watchField', type: 'field', label: 'Watch field', required: true, hint: 'The form field whose value drives the filter' },
    { name: 'targetUid', type: 'targetBlock', label: 'Target block to filter', required: true },
    {
      name: 'targetFields',
      type: 'fields',
      label: 'Search in fields',
      collectionFrom: 'target:targetUid',
      required: true,
      hint: 'Fields of the target block’s collection to match against',
    },
    {
      name: 'operator',
      type: 'select',
      label: 'Match',
      default: '$includes',
      options: [
        { label: 'contains', value: '$includes' },
        { label: 'equals', value: '$eq' },
      ],
    },
  ],
  body: `
const FILTER_KEY = 'jsTplFormFilter:' + (ctx.model && ctx.model.uid);

function apply() {
  let v = null;
  try { v = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue()[$p.watchField] : null; } catch (e) {}
  if (v && typeof v === 'object' && v.id != null) v = v.id;
  // GATE: only act when the watched value actually changed (prevents loops)
  if (v === ctx.model.__last) return;
  ctx.model.__last = v;

  const t = $p.targetUid ? ctx.getModel($p.targetUid) : null;
  if (!t || !t.resource) return;
  // debounce keystrokes
  if (ctx.model.__t) clearTimeout(ctx.model.__t);
  ctx.model.__t = setTimeout(function () {
    if (v == null || String(v).trim() === '') {
      t.resource.removeFilterGroup && t.resource.removeFilterGroup(FILTER_KEY);
    } else {
      const or = ($p.targetFields || []).map(function (f) {
        var c = {}; c[f] = {}; c[f][$p.operator || '$includes'] = v; return c;
      });
      t.resource.addFilterGroup && t.resource.addFilterGroup(FILTER_KEY, or.length === 1 ? or[0] : { $or: or });
    }
    t.resource.setPage && t.resource.setPage(1);
    t.resource.refresh && t.resource.refresh();
  }, 350);
}

function render() {
  apply();
  ctx.render(
    <span style={{ fontSize: 11, color: '#bbb' }}>{'🔎 filtering → ' + (($p.targetFields || []).join(', ') || '—')}</span>
  );
}

render();
const bm = ctx.blockModel;
if (bm && bm.on) { if (bm.__h && bm.off) bm.off('formValuesChange', bm.__h); bm.__h = render; bm.on('formValuesChange', render); }
`,
};

/** 表单自动填充 — when a trigger field changes, look up a record and fill sibling fields */
export const formAutoFill: Template = {
  key: 'formAutoFill',
  logicOnly: true,
  kind: 'item',
  scope: 'record',
  label: 'Auto-fill from lookup',
  description: 'When a field changes, look up a record and fill sibling fields',
  icon: '🪄',
  category: 'Action',
  scenes: ['Form'],
  sort: 860,
  params: [
    { name: 'watchField', type: 'field', label: 'Trigger field', required: true, hint: 'When this form field changes…' },
    { name: 'lookupCollection', type: 'collection', label: 'Look up in', required: true },
    {
      name: 'matchField',
      type: 'field',
      label: 'Match against',
      collectionFrom: 'lookupCollection',
      required: true,
      hint: '…find the record where this field equals the trigger value',
    },
    {
      name: 'copyFields',
      type: 'fields',
      label: 'Fields to copy',
      collectionFrom: 'lookupCollection',
      required: true,
      hint: 'Copied into same-named form fields',
    },
  ],
  body: `
const { useState } = ctx.React;

async function maybeFill() {
  let v = null;
  try { v = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue()[$p.watchField] : null; } catch (e) {}
  if (v && typeof v === 'object' && v.id != null) v = v.id;
  // GATE: only when the trigger value actually changed — setFieldsValue below
  // re-fires formValuesChange, but the trigger value is unchanged then, so we exit.
  if (v === ctx.model.__last) return;
  ctx.model.__last = v;
  if (v == null || String(v).trim() === '') { renderNote(''); return; }
  try {
    var flt = {}; flt[$p.matchField] = { $eq: v };
    const res = await ctx.api.request({ url: $p.lookupCollection + ':list', params: { filter: flt, pageSize: 1 } });
    const rec = ((res && res.data && res.data.data) || [])[0];
    if (!rec) { renderNote('no match'); return; }
    var patch = {};
    ($p.copyFields || []).forEach(function (f) { if (rec[f] !== undefined) patch[f] = rec[f]; });
    if (Object.keys(patch).length && ctx.form && ctx.form.setFieldsValue) ctx.form.setFieldsValue(patch);
    renderNote('filled ' + Object.keys(patch).length + ' field(s)');
  } catch (e) {
    renderNote('lookup failed');
  }
}

function renderNote(txt) {
  ctx.render(<span style={{ fontSize: 11, color: '#bbb' }}>{'🪄 ' + (txt || 'auto-fill ready')}</span>);
}

function onChange() { maybeFill(); }

renderNote('');
maybeFill();
const bm = ctx.blockModel;
if (bm && bm.on) { if (bm.__h && bm.off) bm.off('formValuesChange', bm.__h); bm.__h = onChange; bm.on('formValuesChange', onChange); }
`,
};

/** 子表字段汇总 — roll up a sub-table column into a live total (crmv2 pattern) */
export const formSubtotal: Template = {
  key: 'formSubtotal',
  logicOnly: true,
  kind: 'item',
  scope: 'collection',
  label: 'Sub-table total',
  description: 'Sum / avg / count a sub-table column live — show it or write it back to a field',
  icon: '🧮',
  category: 'Stats',
  scenes: ['Form'],
  sort: 861,
  params: [
    {
      name: 'subtable',
      type: 'association',
      label: 'Sub-table',
      required: true,
      hint: 'A one-/many-related sub-table edited inside this form',
    },
    {
      name: 'fn',
      type: 'select',
      label: 'Aggregate',
      default: 'sum',
      options: [
        { label: 'Sum', value: 'sum' },
        { label: 'Average', value: 'avg' },
        { label: 'Count rows', value: 'count' },
        { label: 'Min', value: 'min' },
        { label: 'Max', value: 'max' },
      ],
    },
    {
      name: 'sumField',
      type: 'field',
      accepts: 'numeric',
      collectionFrom: 'subtable',
      label: 'Column to aggregate',
      hint: 'A numeric column of the sub-table',
      showWhen: (p) => (p.fn || 'sum') !== 'count',
    },
    { name: 'label', type: 'text', label: 'Title (optional)' },
    { name: 'prefix', type: 'text', label: 'Prefix (e.g. ¥)' },
    { name: 'suffix', type: 'text', label: 'Suffix (e.g. items)' },
    {
      name: 'mode',
      type: 'select',
      label: 'Output',
      default: 'display',
      options: [
        { label: 'Show a total card', value: 'display' },
        { label: 'Write back into a field', value: 'writeBack' },
      ],
    },
    {
      name: 'targetField',
      type: 'field',
      accepts: 'numeric',
      label: 'Write into field',
      hint: 'A numeric field on the main form — filled automatically, kept read-only-ish',
      showWhen: (p) => p.mode === 'writeBack',
    },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };
const FN_LABEL = { sum: 'Total', avg: 'Average', count: 'Count', min: 'Min', max: 'Max' };

function aggregate(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const fn = $p.fn || 'sum';
  if (fn === 'count') return list.length;
  const nums = list
    .map(function (r) { return parseFloat(r && $p.sumField ? r[$p.sumField] : NaN); })
    .filter(function (n) { return !isNaN(n); });
  if (!nums.length) return 0;
  if (fn === 'avg') return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  if (fn === 'min') return Math.min.apply(null, nums);
  if (fn === 'max') return Math.max.apply(null, nums);
  return nums.reduce(function (a, b) { return a + b; }, 0); // sum
}

function readRows() {
  try {
    const name = $p.subtable && $p.subtable.name;
    if (!name || !ctx.form || !ctx.form.getFieldsValue) return [];
    return ctx.form.getFieldsValue()[name] || [];
  } catch (e) { return []; }
}

function Subtotal() {
  const [val, setVal] = useState(0);
  useEffect(function () {
    const bm = ctx.blockModel;
    if (!bm) return undefined;
    if (bm.__subtotalH && bm.off) bm.off('formValuesChange', bm.__subtotalH);
    const handler = function () {
      const raw = aggregate(readRows());
      const rounded = ($p.fn === 'count') ? raw : Math.round(raw * 100) / 100;
      setVal(rounded);
      // write-back: push into a main-form field, GATED so the resulting
      // formValuesChange (same value) doesn't loop back through us
      if ($p.mode === 'writeBack' && $p.targetField && ctx.form && ctx.form.setFieldsValue) {
        if (ctx.model.__lastWB !== rounded) {
          ctx.model.__lastWB = rounded;
          const patch = {}; patch[$p.targetField] = rounded;
          ctx.form.setFieldsValue(patch);
        }
      }
    };
    bm.__subtotalH = handler;
    if (bm.on) bm.on('formValuesChange', handler);
    handler();
    return function () { if (bm.off) bm.off('formValuesChange', handler); };
  }, []);

  const fmt = function (n) {
    const d = ($p.fn === 'count') ? 0 : 2;
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const title = $p.label || FN_LABEL[$p.fn || 'sum'];
  const num = ($p.prefix || '') + fmt(val) + ($p.suffix ? ' ' + $p.suffix : '');

  if ($p.mode === 'writeBack') {
    return <span style={{ fontSize: 11, color: T.sub }}>{'🧮 ' + title + ' → ' + ($p.targetField || 'field') + ' = ' + num}</span>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 16px', background: T.card, borderRadius: 8, border: '1px solid ' + T.border, marginTop: 8 }}>
      <span style={{ fontSize: 13, color: T.sub, fontWeight: 500, marginRight: 12 }}>{title}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: T.primary }}>{num}</span>
    </div>
  );
}

ctx.render(<Subtotal />);
`,
};
