import { ParamSpec } from '../core/types';
/**
 * Shared body snippets for record-scope templates.
 *
 * Record resolution chain (host-compatible):
 *   popup record → ctx.record (row / form) → pinned record ($p.collection + $p.recordId)
 * The pin makes record-scope templates usable at PAGE level too — the user
 * just picks a collection and a record in the config form.
 */
export declare const RESOLVE_RECORD_SNIPPET = "\nasync function __resolveRecord() {\n  let r = null;\n  try { const p = await ctx.getVar('ctx.popup'); r = (p && p.record) || null; } catch (e) {}\n  if (!r) { try { r = await ctx.getVar('ctx.record'); } catch (e) {} }\n  if (!r) r = ctx.record || null;\n  if (!r && $p.collection && $p.recordId != null && $p.recordId !== '') {\n    try {\n      const res = await ctx.api.request({ url: $p.collection + ':get', params: { filterByTk: $p.recordId } });\n      r = (res && res.data && res.data.data) || null;\n    } catch (e) {}\n  }\n  return r;\n}\n";
/**
 * React hook flavor for synchronous cell renderers (columns used outside a
 * table): in a real column ctx.record is the row and wins immediately; at
 * page/popup level the chain + pin resolve async. Also mirrors the resolved
 * record to ctx.model.__rec so non-hook code (click popups) can read it.
 */
export declare const USE_RECORD_SNIPPET: string;
/** drop-in param: pin a record for hosts without a record context (page level) */
export declare const recordPinParam: ParamSpec;
/** drop-in param: the data blocks this component drives */
export declare const targetsParam: ParamSpec;
/**
 * apply / clear a named filter group on every target block.
 * `applyFilter(filter, keySuffix?)` — filter=null clears; keySuffix lets one
 * component manage several independent groups (e.g. one per facet field).
 */
export declare const TARGETS_APPLY_SNIPPET = "\nconst __FKEY = 'jsTpl:' + (ctx.model && ctx.model.uid);\nfunction __targets() {\n  const v = $p.targets;\n  return (Array.isArray(v) ? v : v ? [v] : [])\n    .map(function (uid) { return ctx.getModel(uid); })\n    .filter(function (t) { return t && t.resource; });\n}\nfunction applyFilter(filter, keySuffix) {\n  const key = __FKEY + (keySuffix ? ':' + keySuffix : '');\n  __targets().forEach(function (t) {\n    try {\n      if (filter) t.resource.addFilterGroup(key, filter);\n      else if (t.resource.removeFilterGroup) t.resource.removeFilterGroup(key);\n      t.resource.setPage && t.resource.setPage(1);\n      t.resource.refresh && t.resource.refresh();\n    } catch (e) {}\n  });\n}\n";
/** drop-in click-popup params; pick the modes that fit the template */
export declare const popupParams: (modes: ('records' | 'detail' | 'view')[]) => ParamSpec[];
/**
 * block-level popup: the WHOLE card is clickable → records-list drawer (or a
 * chosen View popup). A template may declare `async function __popupListUrl()`
 * in its body to override the list source (e.g. an association URL) — function
 * declarations hoist, so the snippet sees it via typeof.
 */
export declare const BLOCK_POPUP_SNIPPET = "\nasync function __openListPopup() {\n  if ($p.popupMode === 'view' && $p.popupViewUid) {\n    let tk = null;\n    try { const r = typeof __resolveRecord === 'function' ? await __resolveRecord() : null; tk = r && r.id; } catch (e) {}\n    ctx.openView($p.popupViewUid, tk != null ? { mode: 'drawer', filterByTk: tk, params: { filterByTk: tk } } : { mode: 'drawer' });\n    return;\n  }\n  let url = null;\n  try { if (typeof __popupListUrl === 'function') url = await __popupListUrl(); } catch (e) {}\n  if (!url && $p.collection) url = $p.collection + ':list';\n  if (!url) return;\n  try {\n    const res = await ctx.api.request({ url: url, params: { pageSize: 20, sort: ['-id'] } });\n    const rows = (res && res.data && res.data.data) || [];\n    const count = res && res.data && res.data.meta && res.data.meta.count;\n    const { Empty } = ctx.antd;\n    const cols = rows.length\n      ? Object.keys(rows[0]).filter(function (k) { const v = rows[0][k]; return v == null || typeof v !== 'object'; }).slice(0, 5)\n      : [];\n    ctx.viewer.drawer({\n      width: '50%',\n      title: ($p.label || $p.collection || 'Records') + (count != null ? ' \u00B7 ' + count : ''),\n      content: rows.length ? (\n        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>\n          <thead>\n            <tr>{cols.map(function (c) { return <th key={c} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: 500 }}>{c}</th>; })}</tr>\n          </thead>\n          <tbody>\n            {rows.map(function (r, i) {\n              return <tr key={i}>{cols.map(function (c) { const v = r[c]; return <td key={c} style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>{v == null || v === '' ? '\u2014' : String(v)}</td>; })}</tr>;\n            })}\n          </tbody>\n        </table>\n      ) : <Empty />,\n    });\n  } catch (e) { ctx.message && ctx.message.error('Load failed: ' + ((e && e.message) || e)); }\n}\nfunction ClickWrap(props) {\n  if (!$p.enablePopup) return props.children;\n  return <a onClick={__openListPopup} style={{ display: 'block', color: 'inherit', cursor: 'pointer' }}>{props.children}</a>;\n}\n";
/** row-level popup: each record row clickable → its detail drawer / View popup */
export declare const ROW_POPUP_SNIPPET = "\nfunction __openRecordPopup(rec) {\n  rec = rec || {};\n  if ($p.popupMode === 'view' && $p.popupViewUid) {\n    ctx.openView($p.popupViewUid, { mode: 'drawer', filterByTk: rec.id, params: { filterByTk: rec.id } });\n    return;\n  }\n  const { Descriptions } = ctx.antd;\n  const keys = Object.keys(rec).filter(function (k) { const v = rec[k]; return v == null || typeof v !== 'object'; });\n  ctx.viewer.drawer({\n    width: '40%',\n    title: 'Detail',\n    content: (\n      <Descriptions column={1} size=\"small\" bordered>\n        {keys.map(function (k) {\n          const v = rec[k];\n          return <Descriptions.Item key={k} label={k}>{v == null || v === '' ? '\u2014' : String(v)}</Descriptions.Item>;\n        })}\n      </Descriptions>\n    ),\n  });\n}\nfunction RowClick(props) {\n  if (!$p.enablePopup) return props.children;\n  return <a onClick={function () { __openRecordPopup(props.rec); }} style={{ display: 'block', color: 'inherit', cursor: 'pointer' }}>{props.children}</a>;\n}\n";
