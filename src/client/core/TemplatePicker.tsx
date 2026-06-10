import { useFlowSettingsContext } from '@nocobase/flow-engine';
import { Alert, Button, Col, Empty, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Switch, Tag, Typography, message } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLibrary, loadLibrary, onLibraryChange } from './templateLibrary';
import { FilterOptionsBuilder } from './FilterOptionsBuilder';
import { generateCode, hashCode } from './generateCode';
import { styleThumbs } from './styleThumbs';
import { resolveThemeTokens, UI_THEMES } from './themes';
import { FallbackPreview, previews } from './previews';
import {
  deletePreset,
  downloadJson,
  importPack,
  loadPresets,
  packToDoc,
  parseImport,
  savePreset,
  TplPreset,
} from './presets';
import { FieldAccepts, ParamSpec, Template, TemplateKind } from './types';

const { Text } = Typography;

// ---- data-source helpers -------------------------------------------------

function getMainDataSource(ctx: any) {
  return ctx?.dataSourceManager?.getDataSource?.('main');
}

function findModelByUid(ctx: any, uid: string) {
  if (!uid) return undefined;
  return ctx?.model?.flowEngine?.getModel?.(uid) || ctx?.model?.context?.engine?.getModel?.(uid);
}

/** the model's own bound collection, walking the likely holders */
function ownCollectionName(ctx: any): string | undefined {
  const m: any = ctx?.model;
  return (
    m?.collection?.name ||
    ctx?.collection?.name ||
    ctx?.blockModel?.collection?.name ||
    m?.parent?.collection?.name ||
    m?.context?.blockModel?.collection?.name
  );
}

/** which collection should a field-picker list, given collectionFrom + the current params.
 *  Supports a fallback chain: 'relation|collection' tries each source in order. */
function resolveCollectionName(ctx: any, params: any, collectionFrom?: string): string | undefined {
  const resolveOne = (src: string): string | undefined => {
    if (src.startsWith('target:')) {
      let uid = params?.[src.slice('target:'.length)];
      if (Array.isArray(uid)) uid = uid[0]; // multi-target param → first block's collection
      return findModelByUid(ctx, uid)?.collection?.name;
    }
    const v = params?.[src];
    // association param value carries its target collection
    if (v && typeof v === 'object' && v.target) return v.target;
    return v;
  };
  if (collectionFrom) {
    for (const src of collectionFrom.split('|')) {
      const name = resolveOne(src.trim());
      if (name) return name;
    }
    return undefined;
  }
  return ownCollectionName(ctx);
}

function getCollection(ctx: any, name?: string) {
  if (!name) return undefined;
  return getMainDataSource(ctx)?.getCollection?.(name);
}

/** semantic field-type matcher against native type/interface metadata */
function fieldMatches(accepts: FieldAccepts | undefined, f: any): boolean {
  if (!accepts || accepts === 'any') return true;
  const t = String(f?.type || '');
  const i = String(f?.interface || '');
  switch (accepts) {
    case 'numeric':
      return (
        ['integer', 'float', 'double', 'decimal', 'bigInt'].includes(t) ||
        ['number', 'integer', 'percent', 'currency'].includes(i)
      );
    case 'enum':
      return Array.isArray(f?.enum) && f.enum.length > 0;
    case 'boolean':
      return t === 'boolean' || ['checkbox', 'switch'].includes(i);
    case 'text':
      return ['string', 'text'].includes(t) || ['input', 'textarea', 'email', 'phone', 'url'].includes(i);
    case 'date':
      return (
        ['date', 'datetime', 'dateOnly', 'datetimeNoTz', 'unixTimestamp', 'datetimeTz'].includes(t) ||
        i.toLowerCase().includes('date')
      );
    default:
      return true;
  }
}

function listTargetBlocks(ctx: any) {
  const grid: any = ctx?.blockGridModel;
  if (!grid?.filterSubModels) return [];
  const models: any[] = grid.filterSubModels('items', (m: any) => !!m?.resource?.supportsFilter) || [];
  // a block's title can be a non-string (a React node) or empty — fall back
  // through string candidates so the Select tag never renders blank
  // a model's title can be a multi-line composed string (e.g. "\n  Table:\n  Projects"),
  // a React node, or empty — normalize whitespace to a single line and fall back
  // through string candidates so the Select tag never renders blank or wraps off.
  const norm = (s: any): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
  const titleOf = (m: any): string => {
    for (const c of [m?.title, m?.props?.title, m?.collection?.title, m?.collection?.name]) {
      const n = norm(c);
      if (n) return n;
    }
    const coll = m?.collection?.name || m?.resource?.resourceName;
    return coll ? `Block · ${coll}` : (m?.uid || 'Block');
  };
  return models
    .filter((m) => m.uid !== ctx?.model?.uid)
    .map((m) => ({ label: titleOf(m), value: m.uid }));
}

function listCollections(ctx: any) {
  const ds: any = getMainDataSource(ctx);
  return (ds?.getCollections?.() || []).map((c: any) => ({ label: c.title || c.name, value: c.name }));
}

function listFields(ctx: any, collectionName: string | undefined, accepts?: FieldAccepts) {
  const col: any = getCollection(ctx, collectionName);
  const fields: any[] = col?.getFields?.() || [];
  return fields
    .filter((f) => !f.target) // plain fields only in field pickers
    .filter((f) => fieldMatches(accepts, f))
    .map((f) => ({ label: f.title || f.name, value: f.name }));
}

function getField(ctx: any, collectionName: string | undefined, fieldName: string | undefined) {
  if (!fieldName) return undefined;
  const col: any = getCollection(ctx, collectionName);
  return (col?.getFields?.() || []).find((f: any) => f.name === fieldName);
}

/** existing View/Popup actions on the surrounding table — for the click-popup picker */
function listViewActions(ctx: any) {
  // climb to the nearest block with a collection (the table this column sits in)
  let host: any = ctx?.model;
  while (host && !host.collection) host = host.parent;
  const roots: any[] = [];
  if (host) roots.push(host);
  if (ctx?.blockGridModel) roots.push(ctx.blockGridModel);
  const found: { label: string; value: string }[] = [];
  const seen = new Set<string>();
  const visit = (m: any, depth: number) => {
    if (!m || depth > 8 || seen.has(m.uid)) return;
    seen.add(m.uid);
    const cls = String(m.constructor?.name || '');
    if (cls.includes('ViewActionModel') || cls.includes('PopupActionModel')) {
      const title =
        m.props?.title ||
        m.getStepParams?.('buttonSettings', 'general')?.title ||
        m.stepParams?.buttonSettings?.general?.title ||
        'View';
      found.push({ label: title + ' (' + m.uid + ')', value: m.uid });
    }
    const subs = m.subModels || {};
    Object.keys(subs).forEach((k) => {
      const v = subs[k];
      (Array.isArray(v) ? v : [v]).forEach((c) => visit(c, depth + 1));
    });
  };
  roots.forEach((r) => visit(r, 0));
  return found;
}

/** the collection's display field — native titleField, else first text-ish field */
function titleFieldOf(ctx: any, collectionName?: string): string | undefined {
  const col: any = getCollection(ctx, collectionName);
  if (!col) return undefined;
  const tf = col.titleField || col.options?.titleField;
  if (tf) return tf;
  const fields: any[] = col.getFields?.() || [];
  const txt = fields.find((f) => !f.target && fieldMatches('text', f) && f.name !== 'id');
  return txt?.name;
}

/** records of a collection for the record-pin picker — async list, titleField labels */
function useRecordOptions(ctx: any, collectionName: string | undefined, enabled: boolean) {
  const [opts, setOpts] = useState<{ label: string; value: any }[]>([]);
  useEffect(() => {
    if (!enabled || !collectionName || !ctx?.api) {
      setOpts([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await ctx.api.request({ url: collectionName + ':list', params: { pageSize: 100, sort: ['-id'] } });
        if (!alive) return;
        const rows: any[] = res?.data?.data || [];
        const tf = titleFieldOf(ctx, collectionName);
        setOpts(
          rows.map((r) => {
            const v = tf != null ? r[tf] : undefined;
            const text = v != null && v !== '' && typeof v !== 'object' ? String(v) : null;
            return { label: (text || 'Record') + ' (#' + r.id + ')', value: r.id };
          }),
        );
      } catch (e) {
        if (alive) setOpts([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ctx, collectionName, enabled]);
  return opts;
}

/** to-many relations defined on a collection — the native association list */
function listAssociations(ctx: any, collectionName?: string) {
  const col: any = getCollection(ctx, collectionName);
  const fields: any[] = col?.getFields?.() || [];
  return fields
    .filter((f) => f.target && ['hasMany', 'belongsToMany'].includes(String(f.type)))
    .map((f) => ({
      label: (f.title || f.name) + ' → ' + f.target,
      value: f.name,
      meta: {
        name: f.name,
        source: collectionName,
        target: f.target,
        titleField: f.targetCollectionTitleFieldName || null,
        label: f.title || f.name,
      },
    }));
}

/**
 * A wrapping wall of swatch/thumbnail cards (themes, style variants) that, when
 * there are many, clips to ~2 rows with a "show all / collapse" toggle — keeps
 * the config panel compact now that there are 18 themes and many style variants.
 */
const SwatchWall: React.FC<{ collapsedHeight: number; children: React.ReactNode }> = ({ collapsedHeight, children }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (el) setOverflowing(el.scrollHeight > collapsedHeight + 4);
  });
  return (
    <div>
      <div
        ref={wrapRef}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          maxHeight: open ? undefined : collapsedHeight,
          overflow: 'hidden',
          transition: 'max-height .2s ease',
        }}
      >
        {children}
      </div>
      {overflowing || open ? (
        <a
          onClick={() => setOpen(!open)}
          style={{ fontSize: 12, display: 'inline-block', marginTop: 6, userSelect: 'none' }}
        >
          {open ? '收起 ▲' : 'Show all ▾'}
        </a>
      ) : null}
    </div>
  );
};

// ---- a single parameter input -------------------------------------------

function ParamField({
  spec,
  allSpecs,
  value,
  update,
  ctx,
  params,
}: {
  spec: ParamSpec;
  allSpecs: ParamSpec[];
  value: any;
  /** merge a patch into the params object (lets a control set sibling keys, e.g. captured enum metadata) */
  update: (patch: Record<string, any>) => void;
  ctx: any;
  params: any;
}) {
  const collectionName = resolveCollectionName(ctx, params, spec.collectionFrom);

  // hooks must run unconditionally
  const targetOptions = useMemo(() => listTargetBlocks(ctx), [ctx]);
  const collectionOptions = useMemo(() => listCollections(ctx), [ctx]);
  const fieldOptions = useMemo(
    () => listFields(ctx, collectionName, spec.accepts),
    [ctx, collectionName, spec.accepts],
  );
  const assocOptions = useMemo(() => listAssociations(ctx, collectionName), [ctx, collectionName]);
  const viewActionOptions = useMemo(() => listViewActions(ctx), [ctx]);
  const recordOptions = useRecordOptions(ctx, collectionName, spec.type === 'record');
  // inline ▶ Test for code params (spec.testRun): sql → flowSql:run, js → new Function
  const [codeTest, setCodeTest] = useState<{ v?: any; err?: string; running?: boolean } | null>(null);
  const runCodeTest = () => {
    if (!spec.testRun || codeTest?.running) return;
    setCodeTest({ running: true });
    const done = (v: any, err?: string) => setCodeTest({ v, err, running: false });
    if (spec.testRun === 'sql') {
      if (!ctx?.api || !value || !String(value).trim()) return done(undefined, 'no SQL');
      ctx.api
        .request({ url: 'flowSql:run', method: 'post', data: { sql: value, type: 'selectRows', dataSourceKey: 'main' } })
        .then((r: any) => {
          const data = r?.data?.data ?? r?.data;
          const row = Array.isArray(data) ? data[0] : data;
          done(row && typeof row === 'object' ? row[Object.keys(row)[0]] : row);
        })
        .catch((e: any) => done(undefined, e?.response?.data?.errors?.[0]?.message || e?.message || 'SQL failed'));
    } else {
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('ctx', 'return (async function () {\n' + (value || 'return null;') + '\n})()');
        Promise.resolve(fn(ctx))
          .then((v) => done(v))
          .catch((e) => done(undefined, e?.message || 'JS failed'));
      } catch (e: any) {
        done(undefined, e?.message || 'JS failed');
      }
    }
  };
  // the field a dependent control (enumOptions / fieldValue) is bound to:
  // resolve the dep param's own collection source, then look the field up there
  const boundField = useMemo(() => {
    if (!spec.fieldFrom) return undefined;
    const depSpec = allSpecs.find((s) => s.name === spec.fieldFrom);
    const fname = params?.[spec.fieldFrom];
    const depCollection = resolveCollectionName(ctx, params, depSpec?.collectionFrom);
    return getField(ctx, depCollection, fname);
  }, [ctx, params, spec.fieldFrom, allSpecs]);

  const onChange = (v: any) => update({ [spec.name]: v });

  let control: React.ReactNode;
  switch (spec.type) {
    case 'targetBlock':
      control = (
        <Select allowClear mode={spec.multiple ? 'multiple' : undefined} style={{ width: '100%' }} value={value}
          onChange={onChange} options={targetOptions}
          placeholder={spec.multiple ? 'Select data block(s) on this page' : 'Select a data block on this page'} />
      );
      break;
    case 'collection':
      control = (
        <Select showSearch optionFilterProp="label" style={{ width: '100%' }} value={value} onChange={onChange}
          options={collectionOptions} placeholder="Select a collection" />
      );
      break;
    case 'record':
      control = (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          options={recordOptions}
          placeholder={collectionName ? 'Pick a record' : 'Pick a collection first'}
          notFoundContent={collectionName ? 'No records' : undefined}
        />
      );
      break;
    case 'association': {
      control = (
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={value && typeof value === 'object' ? value.name : value}
          onChange={(name) => {
            const opt = assocOptions.find((o: any) => o.value === name);
            update({ [spec.name]: opt ? opt.meta : undefined });
          }}
          options={assocOptions.map((o: any) => ({ label: o.label, value: o.value }))}
          placeholder={collectionName ? 'Select a relation' : 'Pick a collection first'}
          notFoundContent={collectionName ? 'No to-many relations on this collection' : undefined}
        />
      );
      break;
    }
    case 'field':
    case 'fields': {
      const multiple = spec.type === 'fields';
      control = (
        <Select
          mode={multiple ? 'multiple' : undefined}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={value}
          onChange={(v) => {
            const patch: Record<string, any> = { [spec.name]: v };
            // capture the field's native enum (labels + colors) so generated code can use it
            if (!multiple) {
              const f = getField(ctx, collectionName, v);
              patch[spec.name + '__enum'] =
                f && Array.isArray(f.enum) && f.enum.length
                  ? f.enum.map((o: any) => ({ value: o.value, label: o.label, color: o.color }))
                  : undefined;
            } else {
              // multi-pick: capture a map of fieldName → enum options (facet filters)
              const enums: Record<string, any[]> = {};
              (Array.isArray(v) ? v : []).forEach((name: string) => {
                const f = getField(ctx, collectionName, name);
                if (f && Array.isArray(f.enum) && f.enum.length) {
                  enums[name] = f.enum.map((o: any) => ({ value: o.value, label: o.label, color: o.color }));
                }
              });
              patch[spec.name + '__enums'] = Object.keys(enums).length ? enums : undefined;
            }
            update(patch);
          }}
          options={fieldOptions}
          placeholder={collectionName ? 'Select field(s)' : 'Pick a collection / target block first'}
          notFoundContent={collectionName ? 'No matching fields' : undefined}
        />
      );
      break;
    }
    case 'enumOptions': {
      const enumList: any[] = (boundField && boundField.enum) || [];
      if (enumList.length) {
        const chosen: any[] = Array.isArray(value) ? value : [];
        control = (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {enumList.map((o: any) => {
              const active = chosen.some((c) => c.value === o.value);
              return (
                <Tag.CheckableTag
                  key={String(o.value)}
                  checked={active}
                  onChange={(checked) => {
                    const next = checked
                      ? [...chosen, { value: o.value, label: o.label, color: o.color }]
                      : chosen.filter((c) => c.value !== o.value);
                    onChange(next);
                  }}
                  style={{ border: '1px solid #d9d9d9', padding: '2px 10px' }}
                >
                  {o.label}
                </Tag.CheckableTag>
              );
            })}
          </div>
        );
      } else {
        // field has no native enum → free entry
        control = (
          <Select
            mode="tags"
            style={{ width: '100%' }}
            value={Array.isArray(value) ? value.map((v: any) => v.value) : []}
            onChange={(vals: any[]) => onChange(vals.map((v) => ({ value: v, label: v })))}
            placeholder="Type values and press Enter"
          />
        );
      }
      break;
    }
    case 'fieldValue': {
      const enumList: any[] = (boundField && boundField.enum) || [];
      if (enumList.length) {
        control = (
          <Select style={{ width: '100%' }} value={value} onChange={onChange}
            options={enumList.map((o: any) => ({ label: o.label, value: o.value }))}
            placeholder="Pick a value" />
        );
      } else if (boundField && (boundField.type === 'boolean' || ['checkbox', 'switch'].includes(String(boundField.interface)))) {
        control = <Switch checked={!!value} onChange={onChange} />;
      } else {
        control = <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
      }
      break;
    }
    case 'select':
      control = <Select style={{ width: '100%' }} value={value} onChange={onChange} options={spec.options || []} />;
      break;
    case 'styleSelect': {
      // visual variant picker — option cards with live-themed thumbnails
      const TT = resolveThemeTokens(params?.theme);
      control = (
        <SwatchWall collapsedHeight={184}>
          {(spec.options || []).map((o) => {
            const Thumb = styleThumbs[(spec.thumbs ? spec.thumbs + '.' : '') + String(o.value)];
            const active = (value ?? spec.default) === o.value;
            return (
              <div
                key={String(o.value)}
                onClick={() => onChange(o.value)}
                style={{
                  cursor: 'pointer', width: 96, borderRadius: 8, padding: 6, background: '#fff',
                  border: active ? '2px solid ' + TT.primary : '1px solid #e5e5e5',
                  boxShadow: active ? '0 0 0 2px ' + TT.primary + '22' : undefined,
                }}
              >
                {Thumb ? <Thumb T={TT} /> : null}
                <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 5, textAlign: 'center', color: 'rgba(0,0,0,0.65)' }}>
                  {o.label}
                </div>
              </div>
            );
          })}
        </SwatchWall>
      );
      break;
    }
    case 'boolean':
      control = <Switch checked={!!value} onChange={onChange} />;
      break;
    case 'number':
      control = <InputNumber style={{ width: '100%' }} value={value} onChange={onChange} />;
      break;
    case 'filterOptions': {
      control = (
        <FilterOptionsBuilder
          value={value}
          onChange={onChange}
          ctx={ctx}
          collectionName={collectionName}
          api={ctx?.api}
        />
      );
      break;
    }
    case 'popupView':
      control = (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={value}
          onChange={onChange}
          options={viewActionOptions}
          placeholder={viewActionOptions.length ? 'Pick a View action of this table' : 'No View popup found on this table'}
        />
      );
      break;
    case 'theme':
      control = (
        <SwatchWall collapsedHeight={156}>
          {Object.entries(UI_THEMES).map(([key, t]) => {
            const active = (value || 'default') === key;
            const tk = t.tokens;
            return (
              <div
                key={key}
                onClick={() => onChange(key)}
                style={{
                  cursor: 'pointer', width: 86, borderRadius: 8, overflow: 'hidden',
                  border: active ? '2px solid ' + tk.primary : '1px solid #e5e5e5',
                  boxShadow: active ? '0 0 0 2px ' + tk.primary + '22' : undefined,
                }}
              >
                <div style={{ height: 34, background: tk.gradient }} />
                <div style={{ background: tk.bg, padding: '5px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: tk.primary }} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: tk.text }}>{t.label}</span>
                  </div>
                  <div style={{ marginTop: 3, height: 4, borderRadius: 2, background: tk.card, border: '1px solid ' + tk.border }} />
                </div>
              </div>
            );
          })}
        </SwatchWall>
      );
      break;
    case 'color':
      control = (
        <input
          type="color"
          value={value || '#1677ff'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 64, height: 32, padding: 2, border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
        />
      );
      break;
    case 'code':
      control = (
        <div>
          <Input.TextArea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}
            placeholder={spec.hint || ''}
            spellCheck={false}
          />
          {spec.testRun ? (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button size="small" type="primary" ghost loading={!!codeTest?.running} onClick={runCodeTest} data-code-test>
                ▶ Test
              </Button>
              <span style={{ fontSize: 11, color: codeTest?.err ? '#cf1322' : '#999' }}>
                {codeTest?.err
                  ? codeTest.err
                  : codeTest && !codeTest.running
                    ? 'value: ' + String(codeTest.v)
                    : 'runs the ' + spec.testRun.toUpperCase() + ' once — nothing executes while typing'}
              </span>
            </div>
          ) : null}
        </div>
      );
      break;
    case 'text':
    default:
      control = <Input value={value} onChange={(e) => onChange(e.target.value)} />;
      break;
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 4, fontWeight: 500 }}>
        {spec.label}
        {spec.required ? <span style={{ color: '#ff4d4f' }}> *</span> : null}
      </div>
      {control}
      {spec.hint ? <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>{spec.hint}</div> : null}
    </div>
  );
}

// ---- the gallery + param form (one Formily field) ------------------------
// value shape: { templateKey: string, params: Record<string, any> }

export function makeTemplatePicker(kind: TemplateKind) {
  return function TemplatePicker(props: any) {
    const { value, onChange } = props;
    const ctx = useFlowSettingsContext();
    // the FULL library — every gallery can browse everything; the Host filter
    // just defaults to the gallery's own kind ("default focus").
    // merged library (code built-ins + jsTemplates overlay rows); refresh on
    // open and re-render when the registry changes
    const [library, setLibrary] = useState<Template[]>(getLibrary());
    useEffect(() => {
      const off = onLibraryChange(() => setLibrary([...getLibrary()]));
      loadLibrary(ctx?.api).catch(() => {});
      return off;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const list = useMemo(() => [...library].sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999)), [library]);
    const allCategories = useMemo(() => {
      const s: string[] = [];
      list.forEach((t) => { const c = t.category; if (c && !s.includes(c)) s.push(c); });
      return s;
    }, [list]);
    const allHosts = useMemo(() => {
      const s: string[] = [];
      list.forEach((t) => [t.kind, ...(t.alsoKinds || [])].forEach((k) => { if (!s.includes(k)) s.push(k); }));
      return s;
    }, [list]);

    /** can this template actually be inserted at THIS gallery's host position?
     *  Display templates interoperate freely across block/item/column; only
     *  logic-bound ones (logicOnly, and actions) stay restricted. */
    const DISPLAY_KINDS: TemplateKind[] = ['block', 'item', 'column'];
    const hostMatches = (t: Template, h: TemplateKind) =>
      t.kind === h ||
      (t.alsoKinds || []).includes(h) ||
      (!t.logicOnly && DISPLAY_KINDS.includes(h) && DISPLAY_KINDS.includes(t.kind));
    const compatible = (t: Template) => hostMatches(t, kind);
    // the Host FILTER goes by the template's DECLARED hosts (kind + alsoKinds) so
    // switching Block/Item/Column visibly changes the list; insertability
    // (greying) keeps the looser interop rule above.
    const declaredMatch = (t: Template, h: TemplateKind) => t.kind === h || (t.alsoKinds || []).includes(h);

    const [templateKey, setTemplateKey] = useState<string | undefined>(value?.templateKey);
    const [params, setParams] = useState<Record<string, any>>(value?.params || {});
    const [detached, setDetached] = useState(false);
    const topRef = useRef<HTMLDivElement>(null);
    // drift: the JS in the native slot no longer matches what this config
    // generated — someone hand-edited it via the native JS editor. Computed per
    // render (NOT memoized on []) because Formily injects `value` after mount.
    let drift = false;
    if (value?.templateKey && value?.codeHash != null) {
      const current = (ctx as any)?.model?.getStepParams?.('jsSettings', 'runJs')?.code;
      drift = !!current && hashCode(current) !== value.codeHash;
    }
    const [catFilter, setCatFilter] = useState<string>('All');
    const [hostFilter, setHostFilter] = useState<string>(kind); // default focus = current host
    const [scopeFilter, setScopeFilter] = useState<string>('All');
    const [q, setQ] = useState<string>('');
    const selected: Template | undefined = list.find((t) => t.key === templateKey);

    // Emit the config up to Formily AND synchronously materialize the generated
    // JS into the model's jsSettings slot. The preset handler also writes the
    // code, but it runs async after save and RACES the field-value persist —
    // switching templates could leave the previous component's code behind
    // (and the handler's codeHash never persisted, breaking drift). Writing here
    // makes the code+hash part of what gets saved, so a switch is reliable.
    const emit = (key: string | undefined, p: Record<string, any>) => {
      let codeHash: number | undefined;
      const tpl = key ? getLibrary().find((t) => t.key === key) : undefined;
      if (tpl) {
        let code: string;
        if (tpl.rawCode) {
          code = String(p?.code ?? '');
        } else {
          let fp: Record<string, any> = { ...p };
          if (fp.theme !== undefined || (tpl.params || []).some((s) => s.type === 'theme')) {
            fp = { ...fp, __theme: resolveThemeTokens(fp.theme) };
          }
          code = generateCode(tpl, fp);
        }
        codeHash = hashCode(code);
        try {
          (ctx as any)?.model?.setStepParams?.('jsSettings', 'runJs', { version: 'v2', code });
        } catch (e) {
          /* best-effort — the handler still writes on save for onSave templates */
        }
      }
      onChange?.({ templateKey: key, params: p, codeHash });
    };

    // self-heal: a block saved during the old handler/persist race has a
    // templateKey but no codeHash (and possibly a stale code slot from the
    // previously selected template). Re-emit once when the dialog opens so the
    // code + fingerprint get materialized from the saved config; saving the
    // dialog then persists the repaired state.
    useEffect(() => {
      if (value?.templateKey && value?.codeHash == null && !value?.detached) {
        emit(value.templateKey, value.params || {});
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.templateKey, value?.codeHash]);

    const pick = (t: Template) => {
      if (!compatible(t)) return; // browsable but not insertable here
      if (t.key === templateKey) return;
      const defaults: Record<string, any> = {};
      (t.params || []).forEach((sp) => {
        if (sp.default !== undefined) defaults[sp.name] = sp.default;
        // prefill collection params with the surrounding context's collection
        if (sp.type === 'collection' && defaults[sp.name] === undefined) {
          const own = ownCollectionName(ctx);
          if (own) defaults[sp.name] = own;
        }
      });
      setTemplateKey(t.key);
      setParams(defaults);
      emit(t.key, defaults);
      // the selected card expands full-width and is pinned to the top of the
      // list; scroll the dialog up so the config panel is in view (picking a
      // card near the bottom otherwise leaves it off-screen)
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

    const update = (patch: Record<string, any>) => {
      const next = { ...params, ...patch };
      setParams(next);
      emit(templateKey, next);
    };

    const reset = () => {
      setTemplateKey(undefined);
      setParams({});
      emit(undefined, {});
    };

    /** detach: keep the hand-edited JS, drop the template binding (→ plain JS block) */
    const detach = () => {
      setTemplateKey(undefined);
      setParams({});
      setDetached(true);
      onChange?.({ detached: true });
    };

    // ---- presets + import/export ------------------------------------------
    const [presets, setPresets] = useState<TplPreset[]>(() => loadPresets());
    const [saveOpen, setSaveOpen] = useState(false);
    const [pName, setPName] = useState('');
    const [pIcon, setPIcon] = useState('');
    const [jsonModal, setJsonModal] = useState<
      null | { mode: 'export' | 'import'; title: string; text: string; filename?: string; payload?: any }
    >(null);
    const [importText, setImportText] = useState('');

    /** re-apply a stored config (preset or imported) into the picker */
    const applyConfig = (tplKey: string, p: Record<string, any>) => {
      const t = list.find((x) => x.key === tplKey);
      if (!t) {
        message.warning('该配置对应的模板不存在(可能模板已更名或未启用)');
        return;
      }
      if (!compatible(t)) {
        message.warning('该模板不能插入当前位置:仅支持 ' + [t.kind, ...(t.alsoKinds || [])].join(' / '));
        return;
      }
      setTemplateKey(t.key);
      setParams(p || {});
      emit(t.key, p || {});
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

    const applyPreset = (pr: TplPreset) => applyConfig(pr.templateKey, pr.params);

    const removePreset = (id: string) => {
      deletePreset(id);
      setPresets(loadPresets());
    };

    const doSavePreset = () => {
      if (!templateKey) return;
      const name = pName.trim() || selected?.label || 'Preset';
      savePreset({ name, icon: pIcon.trim() || selected?.icon, templateKey, kind, params });
      setPresets(loadPresets());
      setSaveOpen(false);
      setPName('');
      setPIcon('');
      message.success('已保存为预设:' + name);
    };

    const openExportPack = () => {
      const doc = packToDoc();
      setJsonModal({ mode: 'export', title: '导出全部预设(' + presets.length + ')', text: JSON.stringify(doc, null, 2), filename: 'jstpl-presets.json', payload: doc });
    };
    const openImport = () => {
      setImportText('');
      setJsonModal({ mode: 'import', title: '导入配置 / 预设包', text: '' });
    };
    const doImport = () => {
      try {
        const r = parseImport(importText);
        if (r.kind === 'config') {
          applyConfig(r.doc.templateKey, r.doc.params);
          message.success('已导入配置并套用');
        } else {
          const n = importPack(r.doc);
          setPresets(loadPresets());
          message.success('已导入 ' + n + ' 个预设');
        }
        setJsonModal(null);
      } catch (e: any) {
        message.error((e && e.message) || '导入失败');
      }
    };

    if (!list.length) return <Empty description="No templates for this slot" />;

    const kw = q.trim().toLowerCase();
    const filtered = list.filter((t) => {
      if (t.key === templateKey) return true; // the selected card always stays in view
      if (hostFilter !== 'All' && !declaredMatch(t, hostFilter as TemplateKind)) return false;
      if (scopeFilter !== 'All' && (t.scope || 'any') !== scopeFilter) return false;
      if (catFilter !== 'All' && t.category !== catFilter) return false;
      if (kw && !(t.label + ' ' + (t.description || '')).toLowerCase().includes(kw)) return false;
      return true;
    });
    // pin the selected (expanded, full-width) card to the top so its config
    // panel is the first thing visible — picking a card lower down otherwise
    // expands it off-screen
    if (templateKey) {
      filtered.sort((a, b) => (a.key === templateKey ? -1 : b.key === templateKey ? 1 : 0));
    }
    const visibleParams = selected ? selected.params.filter((sp) => !sp.showWhen || sp.showWhen(params)) : [];
    // a preview is "live" when the user has actually configured something beyond defaults
    const hasConfig = selected
      ? selected.params.some((sp) => {
          const v = params[sp.name];
          return v !== undefined && v !== sp.default && !(Array.isArray(v) && !v.length);
        })
      : false;

    const renderCardHead = (t: Template, active: boolean) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16 }}>{t.icon || '🧩'}</span>
        <span style={{ fontWeight: 600 }}>{t.label}</span>
        {t.category ? (
          <Tag color="blue" style={{ marginLeft: 2, fontSize: 11, lineHeight: '16px', padding: '0 5px' }}>{t.category}</Tag>
        ) : null}
        {(t.scenes || []).map((sc) => (
          <Tag key={sc} style={{ margin: 0, fontSize: 11, lineHeight: '16px', padding: '0 5px' }}>{sc}</Tag>
        ))}
        {active ? <span style={{ marginLeft: 'auto', color: '#1677ff', fontWeight: 600 }}>✓ selected</span> : null}
      </div>
    );

    const filterRow = (
      label: string,
      opts: { label: string; value: string }[],
      cur: string,
      set: (v: string) => void,
      mark?: (v: string) => boolean,
    ) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#999', width: 44, flexShrink: 0 }}>{label}</span>
        {[{ label: 'All', value: 'All' }, ...opts].map((o) => (
          <Tag.CheckableTag
            key={o.value}
            checked={cur === o.value}
            onChange={() => set(o.value)}
            style={{ border: '1px solid #d9d9d9', padding: '2px 12px', fontSize: 12 }}
          >
            {o.label}
            {mark && mark(o.value) ? ' ◦' : ''}
          </Tag.CheckableTag>
        ))}
      </div>
    );

    const HOST_LABELS: Record<string, string> = { block: 'Block', item: 'Item', action: 'Action', column: 'Column' };
    const SCOPE_OPTS = [
      { label: 'General', value: 'any' },
      { label: 'Single record', value: 'record' },
      { label: 'Collection', value: 'collection' },
    ];

    return (
      <div>
        <div ref={topRef} />
        {detached ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Detached from template"
            description="Your hand-edited JS is kept as-is — maintain it with the native JS editor from now on. Saving now confirms the detach; picking a template below would overwrite the code again."
          />
        ) : drift ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="The JS was edited by hand since it was generated"
            action={
              <Button size="small" onClick={detach} data-tpl-detach>
                Detach — keep my code
              </Button>
            }
            description="Saving this configuration regenerates the code and overwrites the manual edits. Detach instead to keep the code and turn this into a plain JS block."
          />
        ) : null}
        {/* unified library filter bar: host × scope × type × keyword */}
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              {filterRow(
                'Host',
                allHosts.map((h) => ({ label: HOST_LABELS[h] || h, value: h })),
                hostFilter,
                setHostFilter,
                (v) => v === kind, // marks the gallery's own host
              )}
            </div>
            <Input
              allowClear
              size="small"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search components…"
              style={{ width: 200, flexShrink: 0 }}
            />
          </div>
          {filterRow('Scope', SCOPE_OPTS, scopeFilter, setScopeFilter)}
          {filterRow('Type', allCategories.map((c) => ({ label: c, value: c })), catFilter, setCatFilter)}
          <div style={{ fontSize: 12, color: '#999' }}>
            {filtered.length} of {list.length} components · greyed cards can’t be inserted at this position · previews use sample data until configured
          </div>
        </div>

        {/* My presets — saved configs, one-click re-apply; import/export for migration */}
        <div style={{ marginBottom: 14, padding: '8px 10px', background: '#fbfcfe', border: '1px dashed #e3e8f0', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>★ My presets</span>
            <span style={{ flex: 1 }} />
            <Button size="small" type="text" onClick={openImport} data-tpl-import>
              ⬆ Import
            </Button>
            {presets.length ? (
              <Button size="small" type="text" onClick={openExportPack} data-tpl-export-pack>
                ⬇ Export all
              </Button>
            ) : null}
          </div>
          {presets.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {presets.map((pr) => {
                const t = list.find((x) => x.key === pr.templateKey);
                const ok = !!t && compatible(t);
                return (
                  <div
                    key={pr.id}
                    onClick={() => applyPreset(pr)}
                    title={ok ? 'Apply this preset' : 'Not insertable at this position'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px 3px 10px',
                      background: '#fff',
                      border: '1px solid ' + (ok ? '#d6e0f5' : '#eee'),
                      borderRadius: 16,
                      fontSize: 12,
                      cursor: ok ? 'pointer' : 'not-allowed',
                      opacity: ok ? 1 : 0.55,
                    }}
                  >
                    <span>{pr.icon || '🧩'}</span>
                    <span style={{ fontWeight: 500, color: '#333' }}>{pr.name}</span>
                    <Popconfirm
                      title="Delete this preset?"
                      okText="Delete"
                      cancelText="Cancel"
                      onConfirm={() => removePreset(pr.id)}
                    >
                      <span onClick={(e) => e.stopPropagation()} style={{ color: '#c0c4cc', fontSize: 13, lineHeight: 1, paddingInline: 2 }}>
                        ✕
                      </span>
                    </Popconfirm>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
              Configure a component, then “Save as preset” to reuse it in one click — or import a JSON someone exported.
            </div>
          )}
        </div>

        <Row gutter={[14, 14]}>
          {filtered.map((t) => {
            const active = t.key === templateKey;
            const Preview: any = previews[t.key];

            if (active) {
              // selected card expands in place: live preview left, config right
              return (
                <Col span={24} key={t.key}>
                  <div
                    style={{
                      border: '2px solid #1677ff',
                      borderRadius: 8,
                      padding: 14,
                      background: '#f8fbff',
                      boxShadow: '0 0 0 2px rgba(22,119,255,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Button
                        type="primary"
                        onClick={reset}
                        data-tpl-back
                        style={{ flexShrink: 0, fontWeight: 600, paddingInline: 16, boxShadow: '0 2px 6px rgba(22,119,255,0.3)' }}
                      >
                        ← Back to gallery
                      </Button>
                      <div style={{ flex: 1, minWidth: 0 }}>{renderCardHead(t, true)}</div>
                      <Button
                        size="small"
                        onClick={() => { setPName(selected?.label || ''); setPIcon(selected?.icon || ''); setSaveOpen(true); }}
                        data-tpl-save-preset
                        style={{ flexShrink: 0 }}
                      >
                        ☆ Save as preset
                      </Button>
                    </div>
                    {t.description ? (
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.description}</div>
                    ) : null}
                    <Row gutter={20} style={{ marginTop: 12 }}>
                      <Col xs={24} md={10}>
                        <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                          {hasConfig ? 'Live preview (your settings)' : 'Preview (sample data)'}
                        </div>
                        {Preview ? (
                          <Preview params={hasConfig ? params : undefined} ctx={ctx} />
                        ) : (
                          <FallbackPreview icon={t.icon} />
                        )}
                      </Col>
                      <Col xs={24} md={14}>
                        {visibleParams.length ? (
                          visibleParams.map((sp) => (
                            <ParamField key={sp.name} spec={sp} allSpecs={t.params} value={params[sp.name]} update={update} ctx={ctx} params={params} />
                          ))
                        ) : (
                          <Text type="secondary">This component needs no configuration — just save.</Text>
                        )}
                      </Col>
                    </Row>
                  </div>
                </Col>
              );
            }

            const ok = compatible(t);
            return (
              <Col xs={24} sm={12} lg={8} key={t.key}>
                <div
                  onClick={() => pick(t)}
                  title={ok ? undefined : 'Only insertable as: ' + [t.kind, ...(t.alsoKinds || [])].join(' / ')}
                  style={{
                    cursor: ok ? 'pointer' : 'not-allowed',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    padding: 10,
                    background: '#fff',
                    transition: 'all .15s',
                    height: '100%',
                    opacity: ok ? 1 : 0.5,
                    position: 'relative',
                  }}
                >
                  {!ok ? (
                    <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, color: '#999', background: '#f5f5f5', borderRadius: 4, padding: '0 6px', zIndex: 1 }}>
                      {(t.alsoKinds && t.alsoKinds.length ? [t.kind, ...t.alsoKinds] : [t.kind]).join('/') + ' only'}
                    </span>
                  ) : null}
                  {Preview ? <Preview /> : <FallbackPreview icon={t.icon} />}
                  <div style={{ marginTop: 10 }}>{renderCardHead(t, false)}</div>
                  {t.description ? (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.description}</div>
                  ) : null}
                </div>
              </Col>
            );
          })}
        </Row>

        {/* save-as-preset dialog */}
        <Modal
          open={saveOpen}
          title="Save as preset"
          okText="Save"
          cancelText="Cancel"
          width={420}
          onOk={doSavePreset}
          onCancel={() => setSaveOpen(false)}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Preset name" autoFocus onPressEnter={doSavePreset} />
            <Input value={pIcon} onChange={(e) => setPIcon(e.target.value)} placeholder="Icon emoji (optional)" style={{ width: 180 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Saved in this browser. Use “Export all” to move presets to another machine.
            </Text>
          </Space>
        </Modal>

        {/* JSON export / import dialog (single config or whole pack) */}
        <Modal
          open={!!jsonModal}
          title={jsonModal?.title}
          width={600}
          onCancel={() => setJsonModal(null)}
          footer={
            jsonModal?.mode === 'export'
              ? [
                  <Button
                    key="copy"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(jsonModal!.text);
                        message.success('Copied to clipboard');
                      } catch {
                        message.warning('Copy unavailable — select the text manually');
                      }
                    }}
                  >
                    Copy
                  </Button>,
                  <Button key="dl" type="primary" onClick={() => downloadJson(jsonModal!.filename || 'jstpl.json', jsonModal!.payload)}>
                    Download .json
                  </Button>,
                ]
              : [
                  <Button key="cancel" onClick={() => setJsonModal(null)}>
                    Cancel
                  </Button>,
                  <Button key="ok" type="primary" onClick={doImport}>
                    Import
                  </Button>,
                ]
          }
        >
          {jsonModal?.mode === 'export' ? (
            <Input.TextArea value={jsonModal.text} readOnly autoSize={{ minRows: 8, maxRows: 18 }} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={6}>
              <Input.TextArea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                autoSize={{ minRows: 8, maxRows: 18 }}
                placeholder="Paste an exported JSON — a single config (applied to the current component) or a preset pack (merged into My presets)."
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Accepts a single config or a preset pack.
              </Text>
            </Space>
          )}
        </Modal>
      </div>
    );
  };
}
