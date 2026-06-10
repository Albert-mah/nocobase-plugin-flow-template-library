import { themeParam } from '../core/themes';
import { Template } from '../core/types';
import { BLOCK_POPUP_SNIPPET, popupParams, recordPinParam, RESOLVE_RECORD_SNIPPET, ROW_POPUP_SNIPPET } from './shared';

/** 记录摘要 — current popup record's fields as a key/value card */
export const recordSummary: Template = {
  key: 'recordSummary',
  scope: 'record',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Record summary',
  description: 'Show the current record’s fields as a key/value card (popup / form)',
  icon: '🧾',
  category: 'Data',
  scenes: ['Popup', 'Form'],
  sort: 910,
  params: [
    {
      name: 'collection',
      type: 'collection',
      label: 'Record collection',
      required: true,
      hint: 'The popup record’s collection — used to populate the field picker',
    },
    { name: 'fields', type: 'fields', label: 'Fields to show', collectionFrom: 'collection' },
    recordPinParam,
    { name: 'title', type: 'text', label: 'Card title' },
    {
      name: 'columns',
      type: 'select',
      label: 'Columns',
      default: 1,
      options: [
        { label: '1 column', value: 1 },
        { label: '2 columns', value: 2 },
      ],
    },
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    `
const { Descriptions, Empty, Spin } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function show(rec, name) {
  const v = rec ? rec[name] : undefined;
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function Comp() {
  const [rec, setRec] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(function () {
    (async function () {
      const rec = await __resolveRecord();
      setRec(rec);
      setReady(true);
    })();
  }, []);

  if (!ready) return <Spin />;
  if (!rec) return <Empty description="No record" />;

  let names = $p.fields && $p.fields.length ? $p.fields : null;
  if (!names) {
    names = Object.keys(rec).filter(function (k) {
      return k !== 'createdAt' && k !== 'updatedAt' && k !== 'createdById' && k !== 'updatedById';
    });
  }

  return (
    <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: 12 }}>
      {$p.title ? <div style={{ fontWeight: 600, color: T.text, marginBottom: 8 }}>{$p.title}</div> : null}
      <Descriptions column={$p.columns || 1} size="small" bordered>
        {names.map(function (f) {
          return <Descriptions.Item key={f} label={f}>{show(rec, f)}</Descriptions.Item>;
        })}
      </Descriptions>
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 关联列表 — records of a native to-many relation of the current record */
export const relatedList: Template = {
  key: 'relatedList',
  scope: 'record',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Related list',
  description: 'List records of one of this record’s relations (popup / form)',
  icon: '🔗',
  category: 'Data',
  scenes: ['Popup', 'Form'],
  sort: 920,
  params: [
    {
      name: 'collection',
      type: 'collection',
      label: 'Record collection',
      required: true,
      hint: 'The popup record’s collection',
    },
    {
      name: 'relation',
      type: 'association',
      label: 'Relation',
      collectionFrom: 'collection',
      required: true,
      hint: 'A to-many relation defined on this collection',
    },
    recordPinParam,
    { name: 'limit', type: 'number', label: 'Max items', default: 10 },
    ...popupParams(['detail', 'view']),
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    ROW_POPUP_SNIPPET +
    `
const { List, Empty, Spin, Typography } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function label(rec) {
  const tf = $p.relation && $p.relation.titleField;
  if (tf && rec[tf] != null && rec[tf] !== '') {
    const v = rec[tf];
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return '#' + (rec.id != null ? rec.id : '');
}

function Comp() {
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(function () {
    (async function () {
      try {
        const rec = await __resolveRecord();
        const id = rec && rec.id;
        if (id == null || !$p.relation) { setReady(true); return; }
        // native association resource — no foreign-key knowledge needed
        const res = await ctx.api.request({
          url: $p.relation.source + '/' + id + '/' + $p.relation.name + ':list',
          params: { pageSize: $p.limit || 10, sort: ['-id'] },
        });
        setRows((res && res.data && res.data.data) || []);
      } catch (e) {
        ctx.message && ctx.message.error('Load failed: ' + ((e && e.message) || e));
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <Spin />;
  if (!rows.length) return <Empty description="No related records" />;

  return (
    <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '4px 12px' }}>
      <List
        size="small"
        dataSource={rows}
        renderItem={function (rec) {
          return <List.Item key={rec.id}><RowClick rec={rec}><Typography.Text>{label(rec)}</Typography.Text></RowClick></List.Item>;
        }}
      />
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 关联计数 — count of related records for the current record */
export const relatedCount: Template = {
  key: 'relatedCount',
  scope: 'record',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Related count',
  description: 'A big number — count of related records for this record (popup / form)',
  icon: '🔢',
  category: 'Stats',
  scenes: ['Popup', 'Form'],
  sort: 930,
  params: [
    {
      name: 'collection',
      type: 'collection',
      label: 'Record collection',
      required: true,
      hint: 'The popup record’s collection',
    },
    {
      name: 'relation',
      type: 'association',
      label: 'Relation',
      collectionFrom: 'collection',
      required: true,
      hint: 'A to-many relation defined on this collection',
    },
    recordPinParam,
    { name: 'label', type: 'text', label: 'Label' },
    ...popupParams(['records', 'view']),
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    BLOCK_POPUP_SNIPPET +
    `
// popup lists the RELATION records (not the base collection)
async function __popupListUrl() {
  const rec = await __resolveRecord();
  if (rec && rec.id != null && $p.relation) return $p.relation.source + '/' + rec.id + '/' + $p.relation.name + ':list';
  return null;
}

const { Spin } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function Comp() {
  const [count, setCount] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const rec = await __resolveRecord();
        const id = rec && rec.id;
        if (id == null || !$p.relation) { setCount(0); return; }
        const res = await ctx.api.request({
          url: $p.relation.source + '/' + id + '/' + $p.relation.name + ':list',
          params: { pageSize: 1 },
        });
        const c = res && res.data && res.data.meta && res.data.meta.count;
        setCount(c != null ? c : ((res && res.data && res.data.data) || []).length);
      } catch (e) {
        ctx.message && ctx.message.error('Load failed: ' + ((e && e.message) || e));
        setCount(0);
      }
    })();
  }, []);

  if (count === null) return <Spin />;
  return (
    <div style={{ padding: '16px 18px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      <div style={{ fontSize: 13, color: T.sub, marginBottom: 6 }}>{$p.label || ($p.relation && $p.relation.label) || ''}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, lineHeight: 1 }}>{Number(count).toLocaleString('en-US')}</div>
      <div style={{ marginTop: 10, height: 3, width: 44, borderRadius: 2, background: T.primary }} />
    </div>
  );
}

ctx.render(<ClickWrap><Comp /></ClickWrap>);
`,
};
