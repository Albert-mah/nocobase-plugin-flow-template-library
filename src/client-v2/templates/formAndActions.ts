import { Template } from '../core/types';

/** 行内打开关联 — row action: drawer listing related records of this row */
export const rowOpenRelated: Template = {
  key: 'rowOpenRelated',
  scope: 'record',
  kind: 'action',
  label: 'Open related',
  description: 'A row button that opens a drawer listing related records',
  icon: '🔍',
  category: 'Action',
  scenes: ['Table'],
  sort: 822,
  params: [
    {
      name: 'collection',
      type: 'collection',
      label: 'This table’s collection',
      required: true,
      hint: 'Auto-filled from context when possible',
    },
    {
      name: 'relation',
      type: 'association',
      label: 'Relation to open',
      collectionFrom: 'collection',
      required: true,
      hint: 'A to-many relation defined on this collection',
    },
    { name: 'label', type: 'text', label: 'Button text', default: 'Related' },
  ],
  body: `
const { Button, List, Spin, Empty } = ctx.antd;
const { useState, useEffect } = ctx.React;

function RelatedDrawer(props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(function () {
    let alive = true;
    // native association resource — no foreign-key knowledge needed
    ctx.api.request({ url: $p.relation.source + '/' + props.recordId + '/' + $p.relation.name + ':list', params: { pageSize: 200 } })
      .then(function (res) { if (!alive) return; setRows((res && res.data && res.data.data) || []); setLoading(false); })
      .catch(function (e) { if (!alive) return; setErr((e && e.message) || 'Load failed'); setLoading(false); });
    return function () { alive = false; };
  }, [props.recordId]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>;
  if (err) return <div style={{ padding: 24, color: '#cf1322' }}>{err}</div>;
  if (!rows.length) return <Empty description="No related records" />;

  const titleOf = function (r) {
    const tf = $p.relation && $p.relation.titleField;
    if (tf && r[tf] != null) return String(r[tf]);
    return '#' + (r.id != null ? r.id : '');
  };
  return <List size="small" bordered dataSource={rows} renderItem={function (r) { return <List.Item key={r.id}>{titleOf(r)}</List.Item>; }} />;
}

function OpenRelatedBtn() {
  function open() {
    const rec = ctx.record || {};
    if (rec.id == null) { ctx.message && ctx.message.error('No record id'); return; }
    if (!$p.relation) { ctx.message && ctx.message.error('Relation not configured'); return; }
    ctx.viewer.drawer({ title: ($p.label || 'Related') + (($p.relation && $p.relation.label) ? ' · ' + $p.relation.label : ''), width: '56%', content: <RelatedDrawer recordId={rec.id} /> });
  }
  return <Button type="link" onClick={open}>{$p.label || 'Related'}</Button>;
}

ctx.render(<OpenRelatedBtn />);
`,
};

/** 快筛下拉 — toolbar action: a Select that filters the table by an enum field */
export const quickFilter: Template = {
  key: 'quickFilter',
  scope: 'collection',
  kind: 'action',
  label: 'Quick filter',
  description: 'A dropdown in the toolbar that filters the table by a field’s options',
  icon: '🔽',
  category: 'Filter',
  scenes: ['Table'],
  sort: 810,
  params: [
    {
      name: 'field',
      type: 'field',
      label: 'Filter field',
      required: true,
      accepts: 'enum',
      hint: 'A select/enum field of this table — options come from the field itself',
    },
    { name: 'allLabel', type: 'text', label: '“All” label', default: 'All' },
  ],
  body: `
const { Select } = ctx.antd;
const { useState } = ctx.React;

// options captured from the field's native enum config at insert time
const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const FILTER_KEY = 'jsTplQuickFilter:' + $p.field;

function getInitial() {
  try {
    const fg = ctx.resource && ctx.resource.filterGroups && ctx.resource.filterGroups.get && ctx.resource.filterGroups.get(FILTER_KEY);
    const v = fg && fg[$p.field] && fg[$p.field].$eq;
    if (v != null) return v;
  } catch (e) {}
  return '__all__';
}

function QuickFilter() {
  const [val, setVal] = useState(getInitial);
  const apply = function (next) {
    setVal(next);
    if (!ctx.resource) return;
    if (next === '__all__') {
      ctx.resource.removeFilterGroup && ctx.resource.removeFilterGroup(FILTER_KEY);
    } else {
      var flt = {}; flt[$p.field] = { $eq: next };
      ctx.resource.addFilterGroup && ctx.resource.addFilterGroup(FILTER_KEY, flt);
    }
    ctx.resource.setPage && ctx.resource.setPage(1);
    ctx.resource.refresh && ctx.resource.refresh();
  };
  const options = [{ value: '__all__', label: $p.allLabel || 'All' }].concat(
    enumOpts.map(function (o) { return { value: o.value, label: o.label || String(o.value) }; })
  );
  return <Select size="small" style={{ minWidth: 130 }} value={val} onChange={apply} options={options} />;
}

ctx.render(<QuickFilter />);
`,
};

/** 导出 CSV — toolbar action: export selected (or all) rows to a CSV download */
export const exportCsv: Template = {
  key: 'exportCsv',
  scope: 'collection',
  kind: 'action',
  label: 'Export CSV',
  description: 'Export selected rows (or all current rows) to a CSV file',
  icon: '⬇️',
  category: 'Action',
  scenes: ['Table'],
  sort: 812,
  params: [{ name: 'filename', type: 'text', label: 'File name (without .csv)', default: 'export' }],
  body: `
const { Button } = ctx.antd;

function csvCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') v = JSON.stringify(v);
  v = String(v);
  if (/[",\\n\\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function doExport() {
  const selected = (ctx.resource && ctx.resource.selectedRows) || [];
  const all = (ctx.resource && ctx.resource.getData && ctx.resource.getData()) || [];
  const rows = selected.length ? selected : all;
  if (!rows.length) { ctx.message && ctx.message.warning('No rows to export'); return; }

  const cols = Object.keys(rows[0]).filter(function (k) { return k !== '__index'; });
  const lines = [cols.map(csvCell).join(',')];
  rows.forEach(function (r) { lines.push(cols.map(function (c) { return csvCell(r[c]); }).join(',')); });
  const csv = '\\uFEFF' + lines.join('\\r\\n');

  const realDoc = ctx.element && ctx.element.ownerDocument;
  if (!realDoc) { ctx.message && ctx.message.error('Download not available here'); return; }
  const realWin = realDoc.defaultView;
  const blob = new realWin.Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = realWin.URL.createObjectURL(blob);
  const a = realDoc.createElement('a');
  a.href = url; a.download = ($p.filename || 'export') + '.csv';
  realDoc.body.appendChild(a); a.click(); a.remove();
  realWin.URL.revokeObjectURL(url);
  ctx.message && ctx.message.success('Exported ' + rows.length + ' row(s)');
}

ctx.render(<Button type="link" onClick={doExport}>{'⬇ Export CSV'}</Button>);
`,
};

/** 表单拼接预览 — form item: live-join several fields (e.g. full name) */
export const formConcat: Template = {
  key: 'formConcat',
  logicOnly: true,
  scope: 'record',
  kind: 'item',
  label: 'Concat preview',
  description: 'Live preview of several fields joined together (e.g. full name)',
  icon: '🔤',
  category: 'Data',
  scenes: ['Form'],
  sort: 852,
  params: [
    { name: 'fields', type: 'fields', label: 'Fields to join', accepts: 'any' },
    { name: 'separator', type: 'text', label: 'Separator', default: ' ' },
    { name: 'label', type: 'text', label: 'Label', default: 'Preview' },
  ],
  body: `
function joined() {
  const vals = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue() : {};
  const sep = $p.separator == null ? ' ' : $p.separator;
  return ($p.fields || []).map(function (f) { return vals[f]; })
    .filter(function (v) { return v != null && v !== ''; }).join(sep);
}

function render() {
  const text = joined();
  ctx.render(
    <div style={{ padding: '4px 0' }}>
      <span style={{ color: '#888', marginRight: 8 }}>{$p.label || 'Preview'}</span>
      <b style={{ fontSize: 15 }}>{text || '—'}</b>
    </div>
  );
}

render();
const bm = ctx.blockModel;
if (bm && bm.on) { if (bm.__h && bm.off) bm.off('formValuesChange', bm.__h); bm.__h = render; bm.on('formValuesChange', render); }
`,
};

/** 字符计数 — form item: live remaining-characters counter for a text field */
export const charCounter: Template = {
  key: 'charCounter',
  logicOnly: true,
  scope: 'record',
  kind: 'item',
  label: 'Character counter',
  description: 'Live remaining-characters counter for a text field',
  icon: '🔢',
  category: 'Style',
  scenes: ['Form'],
  sort: 854,
  params: [
    { name: 'field', type: 'field', label: 'Text field', required: true, accepts: 'text' },
    { name: 'max', type: 'number', label: 'Max length', default: 200 },
  ],
  body: `
function render() {
  const vals = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue() : {};
  const v = vals[$p.field];
  const n = v == null ? 0 : String(v).length;
  const max = Number($p.max) || 0;
  const over = max > 0 && n > max;
  ctx.render(
    <div style={{ padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: over ? '#cf1322' : '#888' }}>
        <b style={{ color: over ? '#cf1322' : 'inherit' }}>{n}</b>{' / ' + max}
      </span>
      {over ? <span style={{ color: '#cf1322', marginLeft: 8 }}>{'over by ' + (n - max)}</span> : null}
    </div>
  );
}

render();
const bm = ctx.blockModel;
if (bm && bm.on) { if (bm.__h && bm.off) bm.off('formValuesChange', bm.__h); bm.__h = render; bm.on('formValuesChange', render); }
`,
};

/** 字段同步 — form item: one-way mirror a source field's value into a target */
export const copyFromField: Template = {
  key: 'copyFromField',
  logicOnly: true,
  scope: 'record',
  kind: 'item',
  label: 'Copy field value',
  description: 'One-way mirror: copy a source field into a target field on change',
  icon: '📋',
  category: 'Action',
  scenes: ['Form'],
  sort: 856,
  params: [
    { name: 'sourceField', type: 'field', label: 'Source field', required: true },
    { name: 'targetField', type: 'field', label: 'Target field', required: true },
    { name: 'label', type: 'text', label: 'Label', default: 'Sync' },
  ],
  body: `
function syncAndRender() {
  const vals = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue() : {};
  const src = vals[$p.sourceField];
  const tgt = vals[$p.targetField];
  let didSync = false;
  if ($p.sourceField && $p.targetField && $p.sourceField !== $p.targetField && src !== tgt) {
    var o = {}; o[$p.targetField] = src;
    ctx.form.setFieldsValue(o);
    didSync = true;
  }
  ctx.render(
    <div style={{ padding: '4px 0', fontSize: 12, color: '#888' }}>
      <span style={{ marginRight: 6 }}>{$p.label || 'Sync'}</span>
      <span>{$p.sourceField + ' → ' + $p.targetField}</span>
      {didSync ? <span style={{ color: '#52c41a', marginLeft: 8 }}>{'✓'}</span> : null}
    </div>
  );
}

syncAndRender();
const bm = ctx.blockModel;
if (bm && bm.on) { if (bm.__h && bm.off) bm.off('formValuesChange', bm.__h); bm.__h = syncAndRender; bm.on('formValuesChange', syncAndRender); }
`,
};
