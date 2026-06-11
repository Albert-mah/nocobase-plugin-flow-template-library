import { ParamSpec } from '../core/types';

/**
 * Shared body snippets for record-scope templates.
 *
 * Record resolution chain (host-compatible):
 *   popup record → ctx.record (row / form) → pinned record ($p.collection + $p.recordId)
 * The pin makes record-scope templates usable at PAGE level too — the user
 * just picks a collection and a record in the config form.
 */
export const RESOLVE_RECORD_SNIPPET = `
async function __resolveRecord() {
  let r = null;
  try { const p = await ctx.getVar('ctx.popup'); r = (p && p.record) || null; } catch (e) {}
  if (!r) { try { r = await ctx.getVar('ctx.record'); } catch (e) {} }
  if (!r) r = ctx.record || null;
  if (!r && $p.collection && $p.recordId != null && $p.recordId !== '') {
    try {
      const res = await ctx.api.request({ url: $p.collection + ':get', params: { filterByTk: $p.recordId } });
      r = (res && res.data && res.data.data) || null;
    } catch (e) {}
  }
  return r;
}
`;

/**
 * React hook flavor for synchronous cell renderers (columns used outside a
 * table): in a real column ctx.record is the row and wins immediately; at
 * page/popup level the chain + pin resolve async. Also mirrors the resolved
 * record to ctx.model.__rec so non-hook code (click popups) can read it.
 */
export const USE_RECORD_SNIPPET =
  RESOLVE_RECORD_SNIPPET +
  `
const { useState: __useState, useEffect: __useEffect } = ctx.React;
function useRecord() {
  const [rec, setRec] = __useState(ctx.record || ctx.model.__rec || null);
  __useEffect(function () {
    if (ctx.record) { ctx.model.__rec = ctx.record; return; }
    (async function () {
      const r = await __resolveRecord();
      if (r) { ctx.model.__rec = r; setRec(r); }
    })();
  }, []);
  return rec;
}
`;

/** drop-in param: pin a record for hosts without a record context (page level) */
export const recordPinParam: ParamSpec = {
  name: 'recordId',
  type: 'record',
  label: 'Pin a record (optional)',
  collectionFrom: 'collection',
  hint: 'Only needed outside a record context (e.g. page level) — popups / rows resolve automatically',
};

// ---- cross-block linkage (filters / click-to-filter) ------------------------

/** drop-in param: the data blocks this component drives */
export const targetsParam: ParamSpec = {
  name: 'targets',
  type: 'targetBlock',
  multiple: true,
  label: 'Target blocks',
  required: true,
  hint: 'The data blocks on this page that react to this component',
};

/**
 * apply / clear a named filter group on every target block.
 * `applyFilter(filter, keySuffix?)` — filter=null clears; keySuffix lets one
 * component manage several independent groups (e.g. one per facet field).
 */
export const TARGETS_APPLY_SNIPPET = `
const __FKEY = 'jsTpl:' + (ctx.model && ctx.model.uid);
function __targets() {
  const v = $p.targets;
  return (Array.isArray(v) ? v : v ? [v] : [])
    .map(function (uid) { return ctx.getModel(uid); })
    .filter(function (t) { return t && t.resource; });
}
function applyFilter(filter, keySuffix) {
  const key = __FKEY + (keySuffix ? ':' + keySuffix : '');
  __targets().forEach(function (t) {
    try {
      if (filter) t.resource.addFilterGroup(key, filter);
      else if (t.resource.removeFilterGroup) t.resource.removeFilterGroup(key);
      t.resource.setPage && t.resource.setPage(1);
      t.resource.refresh && t.resource.refresh();
    } catch (e) {}
  });
}
`;

// ---- click-popup (shared across display templates) --------------------------

/** drop-in click-popup params; pick the modes that fit the template */
export const popupParams = (modes: ('records' | 'detail' | 'view')[]): ParamSpec[] => {
  const LABELS: Record<string, string> = {
    records: 'Records list (auto drawer)',
    detail: 'Record detail (auto)',
    view: 'Existing view popup',
  };
  return [
    { name: 'enablePopup', type: 'boolean', label: 'Open popup on click', default: false },
    {
      name: 'popupMode',
      type: 'select',
      label: 'Popup content',
      default: modes[0],
      options: modes.map((m) => ({ label: LABELS[m], value: m })),
      showWhen: (p) => !!p.enablePopup,
    },
    {
      name: 'popupViewUid',
      type: 'popupView',
      label: 'View popup to open',
      hint: 'A “View” action already configured on a table of this page',
      showWhen: (p) => !!p.enablePopup && p.popupMode === 'view',
    },
  ];
};

/**
 * block-level popup: the WHOLE card is clickable → records-list drawer (or a
 * chosen View popup). A template may declare `async function __popupListUrl()`
 * in its body to override the list source (e.g. an association URL) — function
 * declarations hoist, so the snippet sees it via typeof.
 */
export const BLOCK_POPUP_SNIPPET = `
async function __openListPopup() {
  if ($p.popupMode === 'view' && $p.popupViewUid) {
    let tk = null;
    try { const r = typeof __resolveRecord === 'function' ? await __resolveRecord() : null; tk = r && r.id; } catch (e) {}
    ctx.openView($p.popupViewUid, tk != null ? { mode: 'drawer', filterByTk: tk, params: { filterByTk: tk } } : { mode: 'drawer' });
    return;
  }
  let url = null;
  try { if (typeof __popupListUrl === 'function') url = await __popupListUrl(); } catch (e) {}
  if (!url && $p.collection) url = $p.collection + ':list';
  if (!url) return;
  try {
    const res = await ctx.api.request({ url: url, params: { pageSize: 20, sort: ['-id'] } });
    const rows = (res && res.data && res.data.data) || [];
    const count = res && res.data && res.data.meta && res.data.meta.count;
    const { Empty } = ctx.antd;
    const cols = rows.length
      ? Object.keys(rows[0]).filter(function (k) { const v = rows[0][k]; return v == null || typeof v !== 'object'; }).slice(0, 5)
      : [];
    ctx.viewer.drawer({
      width: '50%',
      title: ($p.label || $p.collection || 'Records') + (count != null ? ' · ' + count : ''),
      content: rows.length ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>{cols.map(function (c) { return <th key={c} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: 500 }}>{c}</th>; })}</tr>
          </thead>
          <tbody>
            {rows.map(function (r, i) {
              return <tr key={i}>{cols.map(function (c) { const v = r[c]; return <td key={c} style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>{v == null || v === '' ? '—' : String(v)}</td>; })}</tr>;
            })}
          </tbody>
        </table>
      ) : <Empty />,
    });
  } catch (e) { ctx.message && ctx.message.error('Load failed: ' + ((e && e.message) || e)); }
}
function ClickWrap(props) {
  if (!$p.enablePopup) return props.children;
  return <a onClick={__openListPopup} style={{ display: 'block', color: 'inherit', cursor: 'pointer' }}>{props.children}</a>;
}
`;

/** row-level popup: each record row clickable → its detail drawer / View popup */
export const ROW_POPUP_SNIPPET = `
function __openRecordPopup(rec) {
  rec = rec || {};
  if ($p.popupMode === 'view' && $p.popupViewUid) {
    ctx.openView($p.popupViewUid, { mode: 'drawer', filterByTk: rec.id, params: { filterByTk: rec.id } });
    return;
  }
  const { Descriptions } = ctx.antd;
  const keys = Object.keys(rec).filter(function (k) { const v = rec[k]; return v == null || typeof v !== 'object'; });
  ctx.viewer.drawer({
    width: '40%',
    title: 'Detail',
    content: (
      <Descriptions column={1} size="small" bordered>
        {keys.map(function (k) {
          const v = rec[k];
          return <Descriptions.Item key={k} label={k}>{v == null || v === '' ? '—' : String(v)}</Descriptions.Item>;
        })}
      </Descriptions>
    ),
  });
}
function RowClick(props) {
  if (!$p.enablePopup) return props.children;
  return <a onClick={function () { __openRecordPopup(props.rec); }} style={{ display: 'block', color: 'inherit', cursor: 'pointer' }}>{props.children}</a>;
}
`;
