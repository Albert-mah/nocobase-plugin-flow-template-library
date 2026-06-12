import { prepareRunJsCode } from '@nocobase/flow-engine';
import * as antdAll from 'antd';
import {
  Alert, Button, Collapse, Drawer, Input, InputNumber, message, Segmented, Select, Space, Switch, Tag,
  Tooltip, Typography,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateCode } from './generateCode';
import { getLibraryApi, JsTemplateRow } from './templateLibrary';
import { resolveThemeTokens } from './themes';
import { ParamSpec, TemplateKind } from './types';

const { Text } = Typography;

/**
 * Visual template builder — create / edit lightweight custom JS templates
 * without hand-writing the row JSON:
 *
 *   basics (kind drives everything) → param rows (visual, quick-add chips)
 *   → code editor with kind-aware SCAFFOLD + clickable VARIABLE PALETTE
 *   → LIVE PREVIEW (body compiled with the real RunJS JSX pipeline and
 *     rendered against a mock ctx + the params' preview values)
 *
 * Param specs the visual editor doesn't model (styleSelect, filterOptions, …
 * e.g. when customizing a built-in) are preserved as locked rows.
 */

// ---- param row model ---------------------------------------------------------

const EDITABLE_TYPES = ['text', 'number', 'boolean', 'select', 'collection', 'field', 'fields', 'targetBlock', 'theme', 'code'] as const;
type EditableType = (typeof EDITABLE_TYPES)[number];

type ParamRow = {
  id: number;
  name: string;
  label: string;
  type: EditableType;
  required?: boolean;
  default?: any;
  accepts?: string;
  optionsText?: string; // select: one per line "value | label"
  multiple?: boolean; // targetBlock
  hint?: string;
  locked?: ParamSpec; // unsupported spec — preserved verbatim
};

let rowId = 1;

const QUICK_ADD: { chip: string; make: () => Partial<ParamRow> }[] = [
  { chip: '+ Collection', make: () => ({ name: 'collection', label: 'Data collection', type: 'collection', required: true }) },
  { chip: '+ Field', make: () => ({ name: 'field', label: 'Field', type: 'field', required: true }) },
  { chip: '+ Fields (multi)', make: () => ({ name: 'fields', label: 'Fields', type: 'fields' }) },
  { chip: '+ Text', make: () => ({ name: 'title', label: 'Title', type: 'text', default: '' }) },
  { chip: '+ Number', make: () => ({ name: 'limit', label: 'Limit', type: 'number', default: 10 }) },
  { chip: '+ Switch', make: () => ({ name: 'enabled', label: 'Enabled', type: 'boolean', default: true }) },
  { chip: '+ Choice', make: () => ({ name: 'mode', label: 'Mode', type: 'select', optionsText: 'a | Option A\nb | Option B', default: 'a' }) },
  { chip: '+ Target blocks', make: () => ({ name: 'targets', label: 'Target blocks', type: 'targetBlock', multiple: true }) },
  { chip: '+ Theme', make: () => ({ name: 'theme', label: 'Theme', type: 'theme', default: 'default' }) },
];

function specToRow(spec: ParamSpec): ParamRow {
  const base: ParamRow = {
    id: rowId++,
    name: spec.name,
    label: typeof spec.label === 'string' ? spec.label : spec.name,
    type: (EDITABLE_TYPES as readonly string[]).includes(spec.type) ? (spec.type as EditableType) : 'text',
    required: spec.required,
    default: spec.default,
    accepts: spec.accepts,
    multiple: spec.multiple,
    hint: spec.hint,
  };
  if (!(EDITABLE_TYPES as readonly string[]).includes(spec.type) || spec.showWhen || spec.thumbs || spec.fieldFrom) {
    base.locked = spec;
  }
  if (spec.type === 'select' && Array.isArray(spec.options)) {
    base.optionsText = spec.options.map((o) => `${o.value} | ${o.label}`).join('\n');
  }
  return base;
}

function rowToSpec(row: ParamRow, collectionParam?: string): ParamSpec {
  if (row.locked) return row.locked;
  const spec: ParamSpec = { name: row.name.trim(), type: row.type, label: row.label || row.name };
  if (row.required) spec.required = true;
  if (row.default !== undefined && row.default !== '') spec.default = row.default;
  if (row.hint) spec.hint = row.hint;
  if (row.type === 'field' || row.type === 'fields') {
    if (row.accepts && row.accepts !== 'any') spec.accepts = row.accepts as any;
    if (collectionParam) spec.collectionFrom = collectionParam;
  }
  if (row.type === 'targetBlock' && row.multiple) spec.multiple = true;
  if (row.type === 'select') {
    spec.options = (row.optionsText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [v, ...rest] = l.split('|');
        return { value: v.trim(), label: (rest.join('|') || v).trim() };
      });
  }
  return spec;
}

// ---- kind-aware scaffolds + variable palette ----------------------------------

const KIND_META: Record<TemplateKind, { title: string; desc: string }> = {
  block: { title: 'Block', desc: 'a standalone card on a page / popup' },
  item: { title: 'Form item', desc: 'lives inside a form, can react to form values' },
  action: { title: 'Table action', desc: 'a button in the table toolbar / row' },
  column: { title: 'Table column', desc: 'renders one cell per row (ctx.record)' },
};

const SCAFFOLDS: Record<TemplateKind, string> = {
  block: [
    'const { useState, useEffect } = ctx.React;',
    '',
    'function MyBlock() {',
    '  const [rows, setRows] = useState(null);',
    '  useEffect(function () {',
    '    (async function () {',
    "      const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 10 } });",
    '      setRows((res && res.data && res.data.data) || []);',
    '    })();',
    '  }, []);',
    "  if (!rows) return <div style={{ padding: 12, color: '#999' }}>Loading…</div>;",
    '  return (',
    "    <div style={{ padding: 14, background: '#fff', borderRadius: 8 }}>",
    "      <b>{$p.title || 'My block'}</b>",
    "      <div style={{ marginTop: 6, color: '#666' }}>{rows.length} records</div>",
    '    </div>',
    '  );',
    '}',
    '',
    'ctx.render(<MyBlock />);',
  ].join('\n'),
  item: [
    'function MyItem() {',
    '  // inside a form: read sibling values from ctx.form',
    '  const values = (ctx.form && ctx.form.values) || {};',
    '  return (',
    "    <div style={{ padding: '6px 10px', background: '#f6f8fa', borderRadius: 6, fontSize: 12 }}>",
    "      {$p.title || 'Form helper'} · {Object.keys(values).length} fields filled",
    '    </div>',
    '  );',
    '}',
    '',
    'ctx.render(<MyItem />);',
  ].join('\n'),
  action: [
    'const { Button } = ctx.antd;',
    '',
    'function MyAction() {',
    '  const onClick = async function () {',
    "    ctx.message.success($p.title || 'Clicked!');",
    '    // refresh the surrounding table:',
    '    // ctx.resource && ctx.resource.refresh();',
    '  };',
    "  return <Button size=\"small\" onClick={onClick}>{$p.title || 'My action'}</Button>;",
    '}',
    '',
    'ctx.render(<MyAction />);',
  ].join('\n'),
  column: [
    'function MyCell() {',
    '  const record = ctx.record || {};',
    '  const value = record[$p.field];',
    "  return <span style={{ fontWeight: 600 }}>{value == null ? '—' : String(value)}</span>;",
    '}',
    '',
    'ctx.render(<MyCell />);',
  ].join('\n'),
};

type PaletteChip = { label: string; snippet: string; desc: string; kinds?: TemplateKind[] };

const PALETTE: { group: string; chips: PaletteChip[] }[] = [
  {
    group: 'UI',
    chips: [
      { label: 'ctx.render', snippet: 'ctx.render(<div>Hello</div>);', desc: 'render JSX into the slot' },
      { label: 'useState/useEffect', snippet: 'const { useState, useEffect } = ctx.React;', desc: 'React hooks' },
      { label: 'antd', snippet: 'const { Button, Tag, Table } = ctx.antd;', desc: 'Ant Design components' },
      { label: 'message', snippet: "ctx.message.success('Done');", desc: 'toast feedback' },
    ],
  },
  {
    group: 'Data',
    chips: [
      {
        label: 'list records',
        snippet: "const res = await ctx.api.request({ url: $p.collection + ':list', params: { pageSize: 20, filter: {} } });\nconst rows = res.data.data;",
        desc: 'fetch records of the picked collection',
      },
      { label: 'update record', snippet: "await ctx.api.request({ url: $p.collection + ':update', method: 'post', params: { filterByTk: id }, data: { } });", desc: 'write one record' },
      { label: 'SQL by id', snippet: "const rows = await ctx.sql.runById('<sql-uid>', { type: 'selectRows' });", desc: 'run a registered SQL' },
    ],
  },
  {
    group: 'Host context',
    chips: [
      { label: 'ctx.record', snippet: 'const record = ctx.record || {};', desc: 'current row (column / row action)', kinds: ['column', 'action'] },
      { label: 'form values', snippet: 'const values = (ctx.form && ctx.form.values) || {};', desc: 'surrounding form values', kinds: ['item'] },
      { label: 'refresh table', snippet: 'ctx.resource && ctx.resource.refresh();', desc: 'reload the surrounding table', kinds: ['action', 'item'] },
      { label: 'filter target', snippet: "const t = ctx.getModel($p.targets && $p.targets[0]);\nif (t && t.resource) { t.resource.addFilterGroup('my:' + ctx.model.uid, { /* filter */ }); t.resource.refresh(); }", desc: 'filter a target block', kinds: ['block', 'item'] },
      { label: 'open popup', snippet: "ctx.openView && ctx.openView('<view-uid>', {});", desc: 'open an existing popup view' },
    ],
  },
];

// ---- live preview --------------------------------------------------------------

function makePreviewCtx(onElement: (el: React.ReactNode) => void) {
  const noop = () => {};
  const realApi = getLibraryApi();
  // silence the global error toasts — preview code runs with half-filled
  // params all the time, failed requests are expected
  const api = {
    request: (cfg: any) => realApi?.request({ skipNotify: true, ...cfg }),
    resource: (...args: any[]) => realApi?.resource?.(...args),
  };
  const silentMessage = { success: noop, error: noop, warning: noop, info: noop, loading: noop };
  return {
    React,
    antd: antdAll,
    api,
    message: silentMessage,
    render: (el: React.ReactNode) => onElement(el),
    model: { uid: 'tpl-preview' },
    getModel: () => null,
    record: {},
    form: { values: {} },
    resource: { refresh: noop, addFilterGroup: noop, removeFilterGroup: noop, setPage: noop },
    sql: { runById: async () => [] },
    openView: async () => {},
    t: (s: string) => s,
    libs: {},
    requireAsync: async () => ({}),
    resolveJsonTemplate: async (x: any) => x,
    router: { navigate: noop },
    onRefReady: noop,
    getVar: async () => undefined,
  };
}

function LivePreview({ body, params }: { body: string; params: Record<string, any> }) {
  const [el, setEl] = useState<React.ReactNode>(null);
  const [err, setErr] = useState<string>('');
  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    const timer = setTimeout(async () => {
      if (!body.trim()) { setEl(null); setErr(''); return; }
      try {
        const fullParams = { ...params, __theme: resolveThemeTokens(params.theme) };
        const code = generateCode({ key: '__preview__', body, params: [] } as any, fullParams);
        const compiled = await prepareRunJsCode(code);
        let rendered: React.ReactNode = null;
        const ctx = makePreviewCtx((node) => { rendered = node; });
        // eslint-disable-next-line no-new-func
        const fn = new Function('ctx', '"use strict";return (async function(){\n' + compiled + '\n}).call(null);');
        await fn(ctx);
        if (seq.current !== my) return;
        setEl(rendered);
        setErr('');
      } catch (e: any) {
        if (seq.current !== my) return;
        setErr(e?.message || String(e));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [body, JSON.stringify(params)]);

  return (
    <div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>Live preview</div>
      <div style={{ background: '#f5f6f8', border: '1px solid #eee', borderRadius: 8, padding: 14, minHeight: 140 }}>
        {err ? <Text type="danger" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{err}</Text> : el ?? <Text type="secondary" style={{ fontSize: 12 }}>ctx.render(…) output appears here</Text>}
      </div>
    </div>
  );
}

// ---- the builder drawer ---------------------------------------------------------

export type BuilderResult = JsTemplateRow;

export const TemplateBuilder: React.FC<{
  open: boolean;
  initial?: JsTemplateRow | null;
  existingKeys: string[];
  onSave: (row: JsTemplateRow) => Promise<void>;
  onClose: () => void;
}> = ({ open, initial, existingKeys, onSave, onClose }) => {
  const isNew = !initial;
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [icon, setIcon] = useState('🧩');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<TemplateKind>('block');
  const [category, setCategory] = useState('Custom');
  const [rows, setRows] = useState<ParamRow[]>([]);
  const [body, setBody] = useState('');
  const [previewVals, setPreviewVals] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const codeRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setLabel(initial.label || '');
      setKey(initial.key);
      setKeyTouched(true);
      setIcon(initial.icon || '🧩');
      setDescription(initial.description || '');
      setKind(((initial.kind as TemplateKind) || 'block'));
      setCategory(initial.category || 'Custom');
      setRows((initial.params || []).map(specToRow));
      setBody(initial.body || '');
    } else {
      setLabel(''); setKey(''); setKeyTouched(false); setIcon('🧩'); setDescription('');
      setKind('block'); setCategory('Custom'); setRows([]); setBody('');
    }
    setPreviewVals({});
  }, [open, initial]);

  // auto key from label
  useEffect(() => {
    if (keyTouched || !label) return;
    const k = label
      .trim()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .map((w, i) => (i ? w[0]?.toUpperCase() + w.slice(1) : w.toLowerCase()))
      .join('');
    setKey(k || '');
  }, [label, keyTouched]);

  const collectionParam = rows.find((r) => r.type === 'collection')?.name;

  const insertAtCursor = (snippet: string) => {
    const ta: HTMLTextAreaElement | undefined = codeRef.current?.resizableTextArea?.textArea;
    if (!ta) { setBody((b) => b + '\n' + snippet); return; }
    const s = ta.selectionStart ?? body.length;
    const e = ta.selectionEnd ?? body.length;
    const next = body.slice(0, s) + snippet + body.slice(e);
    setBody(next);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + snippet.length; }, 0);
  };

  const addRow = (partial: Partial<ParamRow>) => {
    const base: ParamRow = { id: rowId++, name: '', label: '', type: 'text', ...partial };
    // de-dup name
    let name = base.name || 'param';
    let i = 2;
    while (rows.some((r) => r.name === name)) name = (base.name || 'param') + i++;
    setRows([...rows, { ...base, name }]);
  };
  const patchRow = (id: number, patch: Partial<ParamRow>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: number) => setRows(rows.filter((r) => r.id !== id));
  const moveRow = (id: number, dir: -1 | 1) => {
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  // preview params: defaults overlaid with user-entered preview values
  const previewParams = useMemo(() => {
    const p: Record<string, any> = {};
    rows.forEach((r) => { if (r.default !== undefined && r.default !== '') p[r.name] = r.default; });
    return { ...p, ...previewVals };
  }, [rows, previewVals]);

  const save = async () => {
    if (!label.trim()) return message.error('Name is required');
    if (!key.trim() || !/^[A-Za-z_][\w-]*$/.test(key)) return message.error('Key must be a valid identifier');
    if (isNew && existingKeys.includes(key)) return message.error(`Key "${key}" already exists`);
    if (!body.trim()) return message.error('Code is empty — insert a scaffold to start');
    const badRow = rows.find((r) => !r.locked && (!r.name.trim() || !/^[A-Za-z_]\w*$/.test(r.name)));
    if (badRow) return message.error(`Param name "${badRow.name}" is not a valid identifier`);
    const names = rows.map((r) => r.name);
    if (new Set(names).size !== names.length) return message.error('Param names must be unique');

    setSaving(true);
    try {
      const row: JsTemplateRow = {
        key: key.trim(),
        label: label.trim(),
        description: description || null,
        icon: icon || '🧩',
        kind,
        scope: rows.some((r) => r.type === 'collection') ? 'collection' : 'any',
        category,
        scenes: ['Dashboard'],
        sort: (initial as any)?.sort ?? 500,
        params: rows.map((r) => rowToSpec(r, collectionParam !== r.name ? collectionParam : undefined)) as any,
        body,
        note: (initial as any)?.note || 'built with visual builder',
      };
      await onSave(row);
      onClose();
    } catch (e: any) {
      message.error(e?.response?.data?.errors?.[0]?.message || e?.message || 'Save failed');
    }
    setSaving(false);
  };

  const sectionTitle = (t: string, extra?: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px' }}>
      <Text strong>{t}</Text>
      {extra}
    </div>
  );

  return (
    <Drawer
      title={isNew ? 'New template (visual builder)' : `Edit template — ${initial?.key}`}
      open={open}
      onClose={onClose}
      width={1080}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={save} data-tb-save>
            Save template
          </Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', gap: 20 }}>
        {/* ── left: config ── */}
        <div style={{ flex: '1 1 58%', minWidth: 0 }}>
          {sectionTitle('Basics')}
          <Space wrap size={8} style={{ width: '100%' }}>
            <Input placeholder="Name, e.g. Stock alert card" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: 220 }} data-tb-label />
            <Input placeholder="key" value={key} onChange={(e) => { setKey(e.target.value); setKeyTouched(true); }} style={{ width: 150, fontFamily: 'monospace' }} disabled={!isNew} />
            <Input placeholder="🧩" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: 60, textAlign: 'center' }} />
            <Select value={category} onChange={setCategory} style={{ width: 120 }}
              options={['Custom', 'Stats', 'Style', 'Data', 'Filter', 'Action'].map((c) => ({ label: c, value: c }))} />
          </Space>
          <div style={{ marginTop: 8 }}>
            <Segmented
              value={kind}
              onChange={(v) => {
                setKind(v as TemplateKind);
                if (!body.trim()) setBody(SCAFFOLDS[v as TemplateKind]);
              }}
              options={(Object.keys(KIND_META) as TemplateKind[]).map((k) => ({ label: KIND_META[k].title, value: k }))}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{KIND_META[kind].desc}</div>
          </div>
          <Input.TextArea placeholder="Description (shown on the gallery card)" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} style={{ marginTop: 8 }} />

          {sectionTitle('Config options (params)', <Text type="secondary" style={{ fontSize: 12 }}>each becomes a form input in the gallery; use it in code as <Text code>$p.name</Text></Text>)}
          <Space wrap size={6} style={{ marginBottom: 8 }}>
            {QUICK_ADD.map((q) => (
              <Tag key={q.chip} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => addRow(q.make())}>{q.chip}</Tag>
            ))}
          </Space>
          {rows.map((r, i) => (
            <div key={r.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8, marginBottom: 6, background: r.locked ? '#fafafa' : '#fff' }}>
              {r.locked ? (
                <Space>
                  <Tag>advanced</Tag>
                  <Text code>{r.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.locked.type} — kept as-is</Text>
                  <Button size="small" type="text" danger onClick={() => removeRow(r.id)}>✕</Button>
                </Space>
              ) : (
                <Space wrap size={6} style={{ width: '100%' }}>
                  <Input size="small" placeholder="Label" value={r.label} onChange={(e) => patchRow(r.id, { label: e.target.value })} style={{ width: 130 }} />
                  <Input size="small" placeholder="name" value={r.name} onChange={(e) => patchRow(r.id, { name: e.target.value })} style={{ width: 110, fontFamily: 'monospace' }} />
                  <Select size="small" value={r.type} onChange={(t) => patchRow(r.id, { type: t })} style={{ width: 110 }}
                    options={EDITABLE_TYPES.map((t) => ({ label: t, value: t }))} />
                  {r.type === 'field' || r.type === 'fields' ? (
                    <Select size="small" value={r.accepts || 'any'} onChange={(a) => patchRow(r.id, { accepts: a })} style={{ width: 100 }}
                      options={['any', 'text', 'numeric', 'enum', 'boolean', 'date'].map((a) => ({ label: a, value: a }))} />
                  ) : null}
                  {r.type === 'text' ? <Input size="small" placeholder="default" value={r.default} onChange={(e) => patchRow(r.id, { default: e.target.value })} style={{ width: 110 }} /> : null}
                  {r.type === 'number' ? <InputNumber size="small" placeholder="default" value={r.default} onChange={(v) => patchRow(r.id, { default: v })} style={{ width: 90 }} /> : null}
                  {r.type === 'boolean' ? <Switch size="small" checked={!!r.default} onChange={(v) => patchRow(r.id, { default: v })} /> : null}
                  <Tooltip title="required">
                    <Switch size="small" checkedChildren="req" unCheckedChildren="opt" checked={!!r.required} onChange={(v) => patchRow(r.id, { required: v })} />
                  </Tooltip>
                  <Tag style={{ cursor: 'pointer' }} onClick={() => insertAtCursor('$p.' + r.name)}>$p.{r.name}</Tag>
                  <Button size="small" type="text" onClick={() => moveRow(r.id, -1)} disabled={i === 0}>↑</Button>
                  <Button size="small" type="text" onClick={() => moveRow(r.id, 1)} disabled={i === rows.length - 1}>↓</Button>
                  <Button size="small" type="text" danger onClick={() => removeRow(r.id)}>✕</Button>
                  {r.type === 'select' ? (
                    <Input.TextArea size="small" rows={2} placeholder={'value | label\nb | Option B'} value={r.optionsText}
                      onChange={(e) => patchRow(r.id, { optionsText: e.target.value })} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
                  ) : null}
                </Space>
              )}
            </div>
          ))}

          {sectionTitle('Code', (
            <Space size={6}>
              <Button size="small" onClick={() => setBody(SCAFFOLDS[kind])}>Insert {KIND_META[kind].title.toLowerCase()} scaffold</Button>
            </Space>
          ))}
          <Space wrap size={4} style={{ marginBottom: 6 }}>
            {rows.filter((r) => !r.locked).map((r) => (
              <Tag key={r.id} color="blue" style={{ cursor: 'pointer' }} onClick={() => insertAtCursor('$p.' + r.name)}>$p.{r.name}</Tag>
            ))}
          </Space>
          <Input.TextArea
            ref={codeRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder={'Pick a host type above — a working scaffold is inserted automatically.'}
            style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
            data-tb-code
          />
          <Collapse
            ghost
            size="small"
            style={{ marginTop: 4 }}
            items={PALETTE.map((g) => ({
              key: g.group,
              label: <Text style={{ fontSize: 12 }}>{g.group} snippets</Text>,
              children: (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {g.chips
                    .filter((c) => !c.kinds || c.kinds.includes(kind))
                    .map((c) => (
                      <div key={c.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <Tag style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => insertAtCursor('\n' + c.snippet + '\n')}>{c.label}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{c.desc}</Text>
                      </div>
                    ))}
                </Space>
              ),
            }))}
          />
        </div>

        {/* ── right: preview ── */}
        <div style={{ flex: '1 1 42%', minWidth: 320 }}>
          <div style={{ position: 'sticky', top: 0 }}>
            <LivePreview body={body} params={previewParams} />
            {rows.filter((r) => !r.locked && (r.type === 'collection' || r.type === 'field' || r.type === 'fields')).length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Preview values (only for the preview above)</div>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {rows
                    .filter((r) => !r.locked && (r.type === 'collection' || r.type === 'field' || r.type === 'fields'))
                    .map((r) => (
                      <Input
                        key={r.id}
                        size="small"
                        addonBefore={<Text code style={{ fontSize: 11 }}>{r.name}</Text>}
                        placeholder={r.type === 'collection' ? 'collection name, e.g. users' : 'field name, e.g. nickname'}
                        value={previewVals[r.name] ?? ''}
                        onChange={(e) => setPreviewVals({ ...previewVals, [r.name]: e.target.value })}
                      />
                    ))}
                </Space>
              </div>
            ) : null}
            <Alert
              style={{ marginTop: 10 }}
              type="info"
              showIcon
              message={<span style={{ fontSize: 12 }}>The preview runs your code with a mock host — data requests are real (your account), host-specific things (current row / form) are stubbed.</span>}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default TemplateBuilder;
