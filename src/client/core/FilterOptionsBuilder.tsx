import {
  autorun,
  createCollectionContextMeta,
  createEphemeralContext,
  observable,
  pruneFilter,
} from '@nocobase/flow-engine';
import { FilterGroup, VariableFilterItem } from '@nocobase/client';
import { isEmptyFilter, transformFilter } from '@nocobase/utils/client';
import { Button, Empty, Input, Select } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Build named filter options for the "Custom filter group" component. Each
 * option = a label + ONE of three condition modes, compiled / resolved to a
 * native NocoBase filter JSON applied at runtime via resource.addFilterGroup:
 *
 *  - builder : the NATIVE Data Scope editor (FilterGroup + VariableFilterItem)
 *              — field tree with relation paths, per-interface operators,
 *              variables ({{ ctx.user.x }} …), nested AND/OR groups. Stored in
 *              the native { logic, items } shape and compiled with
 *              transformFilter + pruneFilter (variables resolved at runtime
 *              via ctx.resolveJsonTemplate).
 *  - sql     : a SELECT returning the matching rows' id column. ▶ Test registers
 *              it (flowSql:save, per-option stable uid) and previews; runtime
 *              uses ctx.sql.runById → ids → { <idField>: { $in: ids } }.
 *  - js      : JS that returns a native filter JSON (or an id array); evaluated
 *              at runtime with `new Function('ctx', …)`.
 *
 * value shape (per option):
 *   { label, mode, group, sql, sqlUid, idField, js, filter }
 *   legacy options carry `nodes`/`conditions` (the old hand-rolled tree) —
 *   migrated to the native `group` shape on edit and still honored at runtime
 *   via the previously-compiled `filter`.
 */

// legacy shapes (pre-native editor), kept only for migration
type LegacyCond = { field?: string; op?: string; value?: any };
type LegacyNode = { t: 'c'; c: LegacyCond } | { t: 'g'; conj: '$and' | '$or'; nodes: LegacyNode[] };

export type FilterGroupValue = { logic: '$and' | '$or'; items: any[] };

export type FilterOption = {
  label: string;
  mode?: 'builder' | 'sql' | 'js';
  group?: FilterGroupValue; // native Data Scope shape
  conj?: '$and' | '$or'; // legacy
  nodes?: LegacyNode[]; // legacy
  conditions?: LegacyCond[]; // legacy flat
  sql?: string;
  sqlUid?: string;
  idField?: string;
  js?: string;
  filter?: any; // compiled (builder mode)
};

const LEGACY_VALUELESS = new Set(['$empty', '$notEmpty']);

/** legacy node tree / flat conditions → native { logic, items } */
function legacyToGroup(opt: FilterOption): FilterGroupValue {
  const toItem = (n: LegacyNode): any =>
    n.t === 'c'
      ? {
          path: n.c.field || '',
          operator: n.c.op || '',
          value: n.c.op && LEGACY_VALUELESS.has(n.c.op) ? true : n.c.value,
        }
      : { logic: n.conj || '$and', items: (n.nodes || []).map(toItem) };
  const nodes: LegacyNode[] =
    opt.nodes || (Array.isArray(opt.conditions) ? opt.conditions.map((c) => ({ t: 'c', c } as LegacyNode)) : []);
  return { logic: opt.conj || '$and', items: nodes.map(toItem) };
}

export function groupOf(opt: FilterOption): FilterGroupValue {
  if (opt.group && Array.isArray(opt.group.items)) return opt.group;
  return legacyToGroup(opt);
}

export function compileFilter(opt: FilterOption): any {
  if ((opt.mode || 'builder') !== 'builder') return null; // sql/js resolved at runtime
  try {
    const f = pruneFilter(transformFilter(groupOf(opt) as any));
    return !f || isEmptyFilter(f) ? null : f;
  } catch {
    return null;
  }
}

// ---- a FlowModel scoped to the option's target collection -------------------
// VariableFilterItem builds its field tree from model.context.collection; the
// host JS model usually isn't bound to the target collection (or to any), so
// shim the model with an ephemeral context whose `collection` resolves to it.

function useScopedFilterModel(ctx: any, collectionName?: string) {
  const [model, setModel] = useState<any>(null);
  const base: any = ctx?.model;
  useEffect(() => {
    let alive = true;
    if (!base || !collectionName) {
      setModel(null);
      return;
    }
    if (base.collection?.name === collectionName) {
      setModel(base); // already bound to the right collection — native path
      return;
    }
    (async () => {
      const getCol = () =>
        ctx?.dataSourceManager?.getDataSource?.('main')?.getCollection?.(collectionName) || null;
      const scoped = await createEphemeralContext(base.context, {
        defineProperties: {
          collection: { get: getCol, meta: createCollectionContextMeta(getCol, collectionName) },
        },
      });
      if (!alive) return;
      const shim = Object.create(base);
      Object.defineProperty(shim, 'context', { value: scoped });
      setModel(shim);
    })();
    return () => {
      alive = false;
    };
  }, [base, collectionName, ctx]);
  return model;
}

// ---- the native condition editor (one per builder-mode option) --------------
// FilterGroup/VariableFilterItem mutate their value in place and rely on it
// being observable; this editor OWNS an observable copy (seeded once) and
// reports deep changes upward via autorun. Incoming prop changes never re-seed
// — the parent remounts it (key) when the value is replaced from outside.

function NativeGroupEditor(props: {
  group: FilterGroupValue;
  model: any;
  placeholder: string;
  onChange: (g: FilterGroupValue) => void;
}) {
  const { model, placeholder } = props;
  const obsRef = useRef<any>(null);
  if (!obsRef.current) {
    const seed = props.group && Array.isArray(props.group.items) ? props.group : { logic: '$and', items: [] };
    obsRef.current = observable(JSON.parse(JSON.stringify(seed)));
  }
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  useEffect(() => {
    let first = true;
    return autorun(() => {
      const snapshot = JSON.stringify(obsRef.current); // deep-touch every observable key
      if (first) {
        first = false;
        return;
      }
      onChangeRef.current(JSON.parse(snapshot));
    });
  }, []);

  // a STABLE component identity — an inline arrow here would be a new component
  // type on every parent re-render (each keystroke syncs state up), making React
  // unmount/remount the whole condition row and drop the input focus
  const FilterItemComp = useMemo(() => {
    return function TplFilterItem(p: any) {
      return <VariableFilterItem {...p} model={model} rightAsVariable />;
    };
  }, [model]);

  if (!model) {
    return <span style={{ fontSize: 12, color: '#bbb' }}>{placeholder}</span>;
  }
  return <FilterGroup value={obsRef.current} FilterItem={FilterItemComp} />;
}

// ---- the ▶ Test result block (shown under the option card) -------------------

type FilterTestRun = { rows: any[]; count: number | null; err?: string; busy?: boolean };

function TestResultPanel({ run }: { run: FilterTestRun }) {
  return (
    <div style={{ marginTop: 8, background: '#fafafa', borderRadius: 6, padding: 8, fontSize: 12 }}>
      {run.err ? (
        <span style={{ color: '#cf1322' }}>{run.err}</span>
      ) : (
        <>
          <b style={{ color: '#1677ff' }}>{run.count}</b> matching record(s)
          {run.rows.length ? (
            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 6, fontSize: 11 }}>
              <tbody>
                {run.rows.map((r, ri) => {
                  const cols = Object.keys(r).filter((k) => typeof r[k] !== 'object').slice(0, 4);
                  return (
                    <tr key={ri}>
                      {cols.map((ck) => (
                        <td key={ck} style={{ padding: '2px 6px', borderBottom: '1px solid #eee' }}>{String(r[ck] ?? '—')}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </>
      )}
    </div>
  );
}

// ---- the options list (one card per button/dropdown option) ----------------

export function FilterOptionsBuilder(props: {
  value?: FilterOption[];
  onChange?: (v: FilterOption[]) => void;
  ctx: any;
  collectionName?: string;
  api: any;
}) {
  const { ctx, collectionName, api } = props;
  const options: FilterOption[] = Array.isArray(props.value) ? props.value : [];
  const [runs, setRuns] = useState<Record<number, FilterTestRun>>({});
  const model = useScopedFilterModel(ctx, collectionName);

  // remount condition editors only when the value is replaced from OUTSIDE
  // (formily late-inject, preset apply) — not when our own emit round-trips
  const lastEmittedRef = useRef<any>(undefined);
  const genRef = useRef(0);
  if (props.value !== lastEmittedRef.current) {
    genRef.current++;
    lastEmittedRef.current = props.value;
  }

  const emit = (next: FilterOption[]) => {
    const final = next.map((o) => ({ ...o, filter: compileFilter(o) }));
    lastEmittedRef.current = final;
    props.onChange?.(final);
  };
  const patchOpt = (i: number, patch: Partial<FilterOption>) => emit(options.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const newSqlUid = () => 'jstplcf' + Math.random().toString(36).slice(2, 9);

  const setRun = (i: number, r: any) => setRuns((s) => ({ ...s, [i]: { ...(s[i] || { rows: [], count: null }), ...r } }));

  const testRun = async (i: number) => {
    const opt = options[i];
    const mode = opt.mode || 'builder';
    setRun(i, { busy: true, err: undefined });
    try {
      if (mode === 'sql') {
        if (!opt.sql || !opt.sql.trim()) throw new Error('Empty SQL');
        const uid = opt.sqlUid || newSqlUid();
        await api.request({ url: 'flowSql:save', method: 'post', data: { uid, sql: opt.sql, dataSourceKey: 'main' } });
        if (uid !== opt.sqlUid) patchOpt(i, { sqlUid: uid });
        const res = await api.request({ url: 'flowSql:run', method: 'post', data: { sql: opt.sql, dataSourceKey: 'main' } });
        const rows = res?.data?.data || res?.data || [];
        const arr = Array.isArray(rows) ? rows : [];
        setRun(i, { rows: arr.slice(0, 3), count: arr.length, busy: false });
      } else if (mode === 'js') {
        if (!opt.js || !opt.js.trim()) throw new Error('Empty JS');
        // eslint-disable-next-line no-new-func
        const fn = new Function('ctx', 'return (async function(){\n' + opt.js + '\n})()');
        let filter = await fn({ api });
        if (Array.isArray(filter)) filter = { [opt.idField || 'id']: { $in: filter } };
        if (!collectionName) throw new Error('No collection');
        const res = await api.request({ url: collectionName + ':list', params: { filter, pageSize: 3 } });
        setRun(i, { rows: res?.data?.data || [], count: res?.data?.meta?.count ?? (res?.data?.data || []).length, busy: false });
      } else {
        let filter = compileFilter(opt);
        if (!filter || !collectionName) throw new Error('No conditions yet');
        // resolve {{ ctx.* }} variables the same way runtime does
        const fctx: any = model?.context;
        if (fctx?.resolveJsonTemplate) filter = await fctx.resolveJsonTemplate(filter);
        const res = await api.request({ url: collectionName + ':list', params: { filter, pageSize: 3 } });
        setRun(i, { rows: res?.data?.data || [], count: res?.data?.meta?.count ?? (res?.data?.data || []).length, busy: false });
      }
    } catch (e: any) {
      setRun(i, { rows: [], count: null, err: e?.message || 'failed', busy: false });
    }
  };

  return (
    <div>
      {!options.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No options yet" style={{ margin: '8px 0' }} /> : null}
      {options.map((opt, i) => {
        const run = runs[i];
        const mode = opt.mode || 'builder';
        return (
          <div key={i} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 10, marginBottom: 10, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Input
                size="small"
                placeholder="Option label, e.g. High value"
                value={opt.label}
                onChange={(e) => patchOpt(i, { label: e.target.value })}
                style={{ width: 180 }}
              />
              <Select
                size="small"
                value={mode}
                onChange={(m) => {
                  const patch: Partial<FilterOption> = { mode: m };
                  if (m === 'builder' && !opt.group) patch.group = groupOf(opt);
                  if (m === 'sql' && !opt.sqlUid) patch.sqlUid = newSqlUid();
                  patchOpt(i, patch);
                }}
                options={[
                  { label: 'Conditions', value: 'builder' },
                  { label: 'SQL', value: 'sql' },
                  { label: 'JS', value: 'js' },
                ]}
                style={{ width: 120 }}
              />
              <Button size="small" loading={run?.busy} onClick={() => testRun(i)} data-fob-run>▶ Test</Button>
              <Button size="small" danger type="text" onClick={() => emit(options.filter((_, j) => j !== i))}>✕</Button>
            </div>

            {mode === 'builder' ? (
              <NativeGroupEditor
                key={'g' + genRef.current + ':' + i}
                group={groupOf(opt)}
                model={model}
                placeholder={collectionName ? 'Loading fields…' : 'Pick the target block(s) first'}
                onChange={(group) => patchOpt(i, { group })}
              />
            ) : mode === 'sql' ? (
              <div>
                <Input.TextArea
                  value={opt.sql}
                  onChange={(e) => patchOpt(i, { sql: e.target.value })}
                  rows={4}
                  placeholder="SELECT id FROM orders WHERE amount > 1000"
                  style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
                  spellCheck={false}
                />
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#999' }}>id column</span>
                  <Input size="small" value={opt.idField || 'id'} onChange={(e) => patchOpt(i, { idField: e.target.value })} style={{ width: 110 }} />
                  <span style={{ fontSize: 11, color: '#bbb' }}>rows are matched into the table by this id (… id IN result)</span>
                </div>
              </div>
            ) : (
              <div>
                <Input.TextArea
                  value={opt.js}
                  onChange={(e) => patchOpt(i, { js: e.target.value })}
                  rows={4}
                  placeholder={"// return a native filter JSON, or an id array\nreturn { amount: { $gt: 1000 } };"}
                  style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
                  spellCheck={false}
                />
                <div style={{ marginTop: 4, fontSize: 11, color: '#bbb' }}>
                  async, <code>ctx</code> available (ctx.api / ctx.sql). Return a filter object like <code>{'{field:{$gt:1}}'}</code> or an array of ids.
                </div>
              </div>
            )}

            {run && !run.busy ? <TestResultPanel run={run} /> : null}
          </div>
        );
      })}
      <Button size="small" type="dashed" block onClick={() => emit([...options, { label: '', mode: 'builder', group: { logic: '$and', items: [] } }])}>
        + Add option
      </Button>
    </div>
  );
}
