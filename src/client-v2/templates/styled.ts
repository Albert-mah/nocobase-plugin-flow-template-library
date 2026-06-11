import React from 'react';
import { registerPreview } from '../core/previews';
import { registerStyleThumbs } from '../core/styleThumbs';
import { resolveThemeTokens, ThemeTokens, themeParam } from '../core/themes';
import { Template } from '../core/types';
import { BLOCK_POPUP_SNIPPET, popupParams, recordPinParam, RESOLVE_RECORD_SNIPPET, ROW_POPUP_SNIPPET } from './shared';
import { RESOLVE_VALUE_SNIPPET, valueSourceOnSave, valueSourceParams } from './valueSource';

/**
 * Style-rich templates distilled from appslib (14220) visual patterns —
 * business logic stripped, only the visual structure kept and parameterized.
 *
 * Each family carries a `variant` styleSelect; the original appearance is kept
 * as one variant value (default) so already-deployed blocks never change. The
 * variant thumbnails + variant-aware gallery previews are registered at the
 * bottom of this file via registerStyleThumbs / registerPreview.
 */

/** 状态步骤条 — a record's enum field rendered as progress steps */
export const statusSteps: Template = {
  key: 'statusSteps',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'record',
  label: 'Status steps',
  description: 'Show a record’s status as a step progress bar',
  icon: '🪧',
  category: 'Style',
  scenes: ['Popup', 'Form'],
  sort: 912,
  params: [
    { name: 'collection', type: 'collection', label: 'Record collection', required: true },
    {
      name: 'field',
      type: 'field',
      label: 'Status field',
      collectionFrom: 'collection',
      accepts: 'enum',
      required: true,
      hint: 'Steps follow the field’s option order',
    },
    recordPinParam,
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'steps',
      label: 'Style',
      default: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Dots', value: 'dots' },
        { label: 'Arrows', value: 'arrow' },
        { label: 'Vertical', value: 'vertical' },
        { label: 'Numbered', value: 'numbered' },
        { label: 'Progress bar', value: 'progress-bar' },
        { label: 'Chevron', value: 'chevron' },
      ],
    },
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    `
const { Steps, Spin, Empty } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];

function Comp() {
  const [rec, setRec] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(function () {
    (async function () {
      const r = await __resolveRecord();
      setRec(r); setReady(true);
    })();
  }, []);

  if (!ready) return <Spin />;
  if (!enumOpts.length) return <Empty description="Status field has no options" />;
  const cur = rec ? rec[$p.field] : null;
  let idx = enumOpts.findIndex(function (o) { return String(o.value) === String(cur); });
  if (idx < 0) idx = 0;
  const labels = enumOpts.map(function (o) { return o.label || String(o.value); });
  const variant = $p.variant || 'default';
  const wrap = { padding: '14px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border };

  if (variant === 'dots') {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {labels.map(function (lab, i) {
            const done = i <= idx;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i < labels.length - 1 ? <span style={{ position: 'absolute', top: 6, left: '50%', width: '100%', height: 2, background: i < idx ? T.primary : T.border }} /> : null}
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: done ? T.primary : T.bg, border: '2px solid ' + (done ? T.primary : T.border), zIndex: 1, boxSizing: 'border-box' }} />
                <span style={{ fontSize: 12, marginTop: 8, color: i === idx ? T.text : T.sub, fontWeight: i === idx ? 600 : 400, textAlign: 'center' }}>{lab}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'arrow') {
    return (
      <div style={{ ...wrap, padding: '14px 16px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {labels.map(function (lab, i) {
            const done = i <= idx;
            return (
              <span key={i} style={{ position: 'relative', flex: '1 1 0', minWidth: 70, padding: '7px 14px 7px 18px', fontSize: 12.5, fontWeight: i === idx ? 700 : 500, color: done ? '#fff' : T.sub, background: done ? T.primary : T.card, clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {lab}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div style={wrap}>
        {labels.map(function (lab, i) {
          const done = i < idx, active = i === idx;
          const dot = done ? T.primary : (active ? T.primary : T.border);
          return (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: done || active ? dot : T.bg, border: '2px solid ' + dot, color: done || active ? '#fff' : T.sub, fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', boxSizing: 'border-box' }}>{done ? '✓' : i + 1}</span>
                {i < labels.length - 1 ? <span style={{ flex: 1, width: 2, background: i < idx ? T.primary : T.border, minHeight: 16, margin: '2px 0' }} /> : null}
              </div>
              <div style={{ paddingBottom: 14, fontSize: 13, color: active ? T.text : T.sub, fontWeight: active ? 600 : 400, lineHeight: '22px' }}>{lab}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'numbered') {
    return (
      <div style={{ ...wrap, display: 'flex', alignItems: 'center' }}>
        {labels.map(function (lab, i) {
          const done = i <= idx;
          return (
            <React.Fragment key={i}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: done ? T.primary : T.card, border: '1px solid ' + (done ? T.primary : T.border), color: done ? '#fff' : T.sub, fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: i === idx ? T.text : T.sub, fontWeight: i === idx ? 600 : 400 }}>{lab}</span>
              </span>
              {i < labels.length - 1 ? <span style={{ flex: 1, height: 1, background: i < idx ? T.primary : T.border, minWidth: 16, margin: '0 10px' }} /> : null}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  if (variant === 'progress-bar') {
    const pct = labels.length > 1 ? Math.round((idx / (labels.length - 1)) * 100) : 100;
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{labels[idx]}</span>
          <span style={{ fontSize: 12, color: T.sub }}>{'Step ' + (idx + 1) + ' / ' + labels.length + ' · ' + pct + '%'}</span>
        </div>
        <div style={{ position: 'relative', height: 8, background: T.card, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: pct + '%', background: 'linear-gradient(90deg,' + T.primary + ',' + T.primary + ')', borderRadius: 6, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          {labels.map(function (lab, i) {
            return <span key={i} style={{ fontSize: 11, color: i === idx ? T.primary : T.sub, fontWeight: i === idx ? 600 : 400, flex: 1, textAlign: i === 0 ? 'left' : (i === labels.length - 1 ? 'right' : 'center') }}>{lab}</span>;
          })}
        </div>
      </div>
    );
  }

  if (variant === 'chevron') {
    return (
      <div style={{ ...wrap, padding: 0, overflow: 'hidden', display: 'flex' }}>
        {labels.map(function (lab, i) {
          const done = i < idx, active = i === idx;
          const bg = done ? T.primary : (active ? T.primary : T.card);
          const fg = done || active ? '#fff' : T.sub;
          const first = i === 0, last = i === labels.length - 1;
          const clip = first
            ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
            : (last ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)' : 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)');
          return (
            <span key={i} style={{ flex: '1 1 0', minWidth: 64, marginLeft: first ? 0 : -10, padding: '10px 8px 10px ' + (first ? '14px' : '22px'), fontSize: 12.5, fontWeight: active ? 700 : 500, color: fg, background: bg, clipPath: clip, textAlign: 'center', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {done ? <span style={{ fontSize: 11 }}>✓</span> : <span style={{ width: 16, height: 16, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.25)' : 'transparent', border: active ? 'none' : '1px solid ' + T.border, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
              {lab}
            </span>
          );
        })}
      </div>
    );
  }

  // default — antd Steps
  return (
    <div style={wrap}>
      <Steps
        size="small"
        current={idx}
        items={enumOpts.map(function (o) { return { title: o.label || String(o.value) }; })}
      />
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 活动时间线 — icon-dot timeline of records (relation of current record, or a collection) */
export const timelineFeed: Template = {
  key: 'timelineFeed',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'record',
  label: 'Activity timeline',
  description: 'Icon-dot timeline of related records (or latest of a collection)',
  icon: '🧵',
  category: 'Data',
  scenes: ['Popup', 'Dashboard', 'Form'],
  sort: 913,
  params: [
    { name: 'collection', type: 'collection', label: 'Base collection', required: true },
    {
      name: 'relation',
      type: 'association',
      label: 'Relation (optional)',
      collectionFrom: 'collection',
      hint: 'Set → timeline of the current record’s relation; empty → latest of the collection',
    },
    { ...recordPinParam, showWhen: (p) => !!p.relation },
    {
      name: 'kindField',
      type: 'field',
      label: 'Kind field (icon/color)',
      collectionFrom: 'relation|collection',
      hint: 'Enum field — its options drive dot colors; empty = uniform dots',
    },
    { name: 'textField', type: 'field', label: 'Text field', collectionFrom: 'relation|collection', required: true },
    { name: 'timeField', type: 'field', label: 'Time field', collectionFrom: 'relation|collection', hint: 'Defaults to createdAt' },
    { name: 'limit', type: 'number', label: 'Max items', default: 10 },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'timeline',
      label: 'Style',
      default: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Compact', value: 'compact' },
        { label: 'Cards', value: 'card' },
        { label: 'Left line', value: 'left-line' },
        { label: 'Alternating', value: 'alternating' },
        { label: 'Icon left', value: 'icon-left' },
        { label: 'Minimal dots', value: 'minimal-dots' },
      ],
    },
    ...popupParams(['detail', 'view']),
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    ROW_POPUP_SNIPPET +
    `
const { Empty, Spin } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const kindOpts = Array.isArray($p.kindField__enum) ? $p.kindField__enum : [];
const COLOR = { blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1', magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d' };

function rel(v) {
  const d = new Date(v); if (isNaN(d.getTime())) return '';
  const a = Date.now() - d.getTime();
  const m = Math.floor(a / 60000), h = Math.floor(a / 3600000), dd = Math.floor(a / 86400000);
  if (a < 60000) return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  if (dd < 30) return dd + 'd ago';
  return d.toLocaleDateString();
}

function Comp() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const timeField = $p.timeField || 'createdAt';
        const limit = Number($p.limit) > 0 ? Number($p.limit) : 10;
        let url = null;
        if ($p.relation) {
          const rec = await __resolveRecord();
          if (rec && rec.id != null) url = $p.relation.source + '/' + rec.id + '/' + $p.relation.name + ':list';
        }
        if (!url) url = ($p.relation ? $p.relation.target : $p.collection) + ':list';
        const res = await ctx.api.request({ url: url, params: { pageSize: limit, sort: ['-' + timeField] } });
        setRows((res && res.data && res.data.data) || []);
      } catch (e) { setRows([]); }
    })();
  }, []);

  if (rows == null) return <Spin />;
  if (!rows.length) return <Empty description="No activity" />;

  const variant = $p.variant || 'default';
  const wrap = { padding: '10px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border };

  function info(r) {
    const kindRaw = $p.kindField ? r[$p.kindField] : null;
    const opt = kindOpts.find(function (o) { return String(o.value) === String(kindRaw); });
    const color = (opt && opt.color && COLOR[opt.color]) || T.primary;
    const glyph = (opt && opt.label ? String(opt.label) : (kindRaw ? String(kindRaw) : '•')).slice(0, 1).toUpperCase();
    const text = r[$p.textField];
    const time = rel(r[$p.timeField || 'createdAt']);
    const label = opt && opt.label ? opt.label : '';
    return { color: color, glyph: glyph, text: (text == null || text === '' ? '—' : String(text)), time: time, label: label };
  }

  if (variant === 'compact') {
    return (
      <div style={wrap}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.text}</span>
              <span style={{ fontSize: 11, color: T.sub, flexShrink: 0 }}>{d.time}</span>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 10, background: T.card, borderRadius: 8, borderLeft: '3px solid ' + d.color, padding: '9px 12px' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: d.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{d.glyph}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: T.sub }}>{d.label ? d.label + ' · ' : ''}{d.time}</div>
                <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, marginTop: 2, overflowWrap: 'break-word' }}>{d.text}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'left-line') {
    return (
      <div style={{ ...wrap, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 21, top: 16, bottom: 16, width: 2, background: T.border }} />
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 14 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: T.bg, border: '2px solid ' + d.color, marginLeft: 2, marginTop: 3, zIndex: 1, boxSizing: 'border-box', flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: T.sub }}>{d.label ? d.label + ' · ' : ''}{d.time}</div>
                <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, marginTop: 2, overflowWrap: 'break-word' }}>{d.text}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'alternating') {
    return (
      <div style={{ ...wrap, position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', top: 12, bottom: 12, width: 2, background: T.border, transform: 'translateX(-1px)' }} />
        {rows.map(function (r, i) {
          const d = info(r);
          const left = i % 2 === 0;
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', justifyContent: left ? 'flex-start' : 'flex-end', position: 'relative', marginBottom: 12 }}>
              <span style={{ position: 'absolute', left: '50%', top: 6, width: 12, height: 12, borderRadius: '50%', background: T.bg, border: '2px solid ' + d.color, transform: 'translateX(-50%)', zIndex: 1, boxSizing: 'border-box' }} />
              <div style={{ width: '46%', background: T.card, borderRadius: 8, padding: '8px 11px', textAlign: left ? 'right' : 'left' }}>
                <div style={{ fontSize: 11, color: T.sub }}>{d.label ? d.label + ' · ' : ''}{d.time}</div>
                <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, marginTop: 2, overflowWrap: 'break-word' }}>{d.text}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'icon-left') {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '8px 6px', borderRadius: 8, background: i % 2 === 1 ? T.card : 'transparent' }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: d.color + '1f', color: d.color, fontSize: 14, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{d.glyph}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.4, overflowWrap: 'break-word' }}>{d.text}</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{d.label ? d.label + ' · ' : ''}{d.time}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'minimal-dots') {
    return (
      <div style={{ ...wrap, position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 8, top: 16, bottom: 16, width: 1, background: T.border }} />
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ position: 'relative', paddingBottom: 13 }}>
              <span style={{ position: 'absolute', left: -18, top: 4, width: 7, height: 7, borderRadius: '50%', background: d.color, boxShadow: '0 0 0 3px ' + T.bg, zIndex: 1 }} />
              <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, overflowWrap: 'break-word' }}>{d.text}</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{d.label ? d.label + ' · ' : ''}{d.time}</div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  // default — dot + connecting line
  return (
    <div style={wrap}>
      {rows.map(function (r, i) {
        const d = info(r);
        return (
          <RowClick rec={r} key={r.id != null ? r.id : i}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: d.color, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {d.glyph}
              </span>
              {i < rows.length - 1 ? <span style={{ flex: 1, width: 2, background: T.border, marginTop: 2, minHeight: 10 }} /> : null}
            </div>
            <div style={{ paddingBottom: 14, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: T.sub }}>
                {d.label ? d.label + ' · ' : ''}{d.time}
              </div>
              <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, marginTop: 2, overflowWrap: 'break-word' }}>
                {d.text}
              </div>
            </div>
          </div>
          </RowClick>
        );
      })}
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 矩阵热图 — row × column counts (or avg of a number field) as gradient cells */
export const matrixHeatmap: Template = {
  key: 'matrixHeatmap',
  kind: 'block',
  scope: 'collection',
  label: 'Matrix heatmap',
  description: 'Row × column matrix with color-graded cells (count or average)',
  icon: '🟩',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 818,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'rowField', type: 'field', label: 'Row field', collectionFrom: 'collection', required: true },
    { name: 'colField', type: 'field', label: 'Column field', collectionFrom: 'collection', required: true },
    {
      name: 'valueField',
      type: 'field',
      label: 'Value field (average)',
      collectionFrom: 'collection',
      accepts: 'numeric',
      hint: 'Empty = count of records per cell',
    },
    { name: 'label', type: 'text', label: 'Title' },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function heat(v, max) {
  if (v == null || max <= 0) return T.card;
  const t = Math.max(0, Math.min(1, v / max));
  // white-blue → deep blue gradient
  const c = Math.round(235 - t * 165);
  return 'rgb(' + (c - 30) + ',' + c + ',255)';
}

function Comp() {
  const [data, setData] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(500);
        await ctx.resource.refresh();
        const rows = ctx.resource.getData() || [];
        const cells = {}; const rowsSet = []; const colsSet = [];
        rows.forEach(function (r) {
          const rk = String(r[$p.rowField] == null || r[$p.rowField] === '' ? '—' : r[$p.rowField]);
          const ck = String(r[$p.colField] == null || r[$p.colField] === '' ? '—' : r[$p.colField]);
          if (rowsSet.indexOf(rk) < 0) rowsSet.push(rk);
          if (colsSet.indexOf(ck) < 0) colsSet.push(ck);
          const key = rk + '\\u0001' + ck;
          if (!cells[key]) cells[key] = { n: 0, sum: 0 };
          cells[key].n += 1;
          const v = Number(r[$p.valueField]);
          if (!isNaN(v)) cells[key].sum += v;
        });
        setData({ cells: cells, rows: rowsSet.sort().slice(0, 12), cols: colsSet.sort().slice(0, 8) });
      } catch (e) { setData({ cells: {}, rows: [], cols: [] }); }
    })();
  }, []);

  if (data == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;
  if (!data.rows.length) return <div style={{ padding: 12, color: T.sub }}>No data.</div>;

  const valOf = function (rk, ck) {
    const c = data.cells[rk + '\\u0001' + ck];
    if (!c) return null;
    return $p.valueField ? (c.n ? c.sum / c.n : null) : c.n;
  };
  let max = 0;
  data.rows.forEach(function (rk) { data.cols.forEach(function (ck) { const v = valOf(rk, ck); if (v != null && v > max) max = v; }); });

  return (
    <div style={{ padding: '14px 16px', overflowX: 'auto', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {$p.label ? <div style={{ fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div> : null}
      <table style={{ borderCollapse: 'separate', borderSpacing: 3 }}>
        <thead>
          <tr>
            <th />
            {data.cols.map(function (ck) {
              return <th key={ck} style={{ fontSize: 11, fontWeight: 600, color: T.sub, padding: '2px 6px', textAlign: 'center' }}>{ck}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(function (rk) {
            return (
              <tr key={rk}>
                <td style={{ fontSize: 12, fontWeight: 600, color: T.sub, padding: '2px 8px 2px 0', whiteSpace: 'nowrap' }}>{rk}</td>
                {data.cols.map(function (ck) {
                  const v = valOf(rk, ck);
                  const txt = v == null ? '' : ($p.valueField ? (Math.round(v * 10) / 10) : v);
                  return (
                    <td key={ck}>
                      <div style={{ background: heat(v, max), color: v != null && v / (max || 1) > 0.55 ? '#fff' : '#555', borderRadius: 6, minWidth: 44, padding: '8px 0', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                        {txt}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

ctx.render(<Comp />);
`,
};

/** 渐变横幅 — gradient hero banner with title + optional live count */
export const heroBanner: Template = {
  key: 'heroBanner',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'any',
  label: 'Gradient banner',
  description: 'A gradient hero banner with title, subtitle and optional live count',
  icon: '🎨',
  category: 'Style',
  scenes: ['Dashboard', 'Popup'],
  sort: 806,
  params: [
    { name: 'title', type: 'text', label: 'Title', required: true },
    { name: 'subtitle', type: 'text', label: 'Subtitle' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'hero',
      label: 'Layout',
      default: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Split', value: 'split' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Stat banner', value: 'stat-banner' },
        { label: 'Outline', value: 'outline' },
        { label: 'Centered', value: 'centered' },
        { label: 'Boxed', value: 'boxed' },
      ],
    },
    themeParam,
    { name: 'customGradient', type: 'boolean', label: 'Custom gradient', default: false },
    { name: 'customFrom', type: 'color', label: 'From color', default: '#4f46e5', showWhen: (p) => !!p.customGradient },
    { name: 'customTo', type: 'color', label: 'To color', default: '#9333ea', showWhen: (p) => !!p.customGradient },
    ...valueSourceParams({ optional: true }),
    ...popupParams(['records', 'view']),
  ],
  onSave: valueSourceOnSave,
  body:
    RESOLVE_VALUE_SNIPPET +
    BLOCK_POPUP_SNIPPET +
    `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0', gradient: 'linear-gradient(135deg,#1677ff,#13c2c2)' };
// legacy configs: a bare collection means "count badge"
if (!$p.valueSource && $p.collection) $p.valueSource = 'aggregate';

function gradientOf() {
  if ($p.customGradient) return 'linear-gradient(135deg,' + ($p.customFrom || '#4f46e5') + ',' + ($p.customTo || '#9333ea') + ')';
  return T.gradient || 'linear-gradient(135deg,#1677ff,#13c2c2)';
}
// the gradient still drives the accent in every layout — variant only changes structure
function primaryOf() {
  if ($p.customGradient) return $p.customFrom || '#4f46e5';
  return T.primary || '#1677ff';
}

function Comp() {
  const [count, setCount] = useState(null);
  useEffect(function () {
    if (!$p.valueSource || $p.valueSource === 'none') return;
    (async function () {
      try { setCount(await __resolveValue()); } catch (e) {}
    })();
  }, []);

  const title = $p.title || '';
  const sub = $p.subtitle || '';
  const variant = $p.variant || 'default';
  const grad = gradientOf();
  const num = count != null ? count.toLocaleString() : null;

  if (variant === 'minimal') {
    return (
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 6, alignSelf: 'stretch', borderRadius: 4, background: grad, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: 0.2 }}>{title}</div>
          {sub ? <div style={{ fontSize: 13, color: T.sub, marginTop: 6, maxWidth: 560 }}>{sub}</div> : null}
        </div>
        {num != null ? <span style={{ fontSize: 24, fontWeight: 700, color: primaryOf(), flexShrink: 0 }}>{num}</span> : null}
      </div>
    );
  }

  if (variant === 'outline') {
    return (
      <div style={{ background: T.bg, border: '2px solid transparent', borderRadius: 12, padding: '22px 26px', position: 'relative', backgroundImage: 'linear-gradient(' + T.bg + ',' + T.bg + '),' + grad, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: 0.2 }}>{title}</div>
        {sub ? <div style={{ fontSize: 13, color: T.sub, marginTop: 6, maxWidth: 560 }}>{sub}</div> : null}
        {num != null ? (
          <span style={{ position: 'absolute', right: 22, top: 20, background: grad, color: '#fff', borderRadius: 16, padding: '4px 14px', fontSize: 14, fontWeight: 700 }}>{num}</span>
        ) : null}
      </div>
    );
  }

  if (variant === 'split') {
    return (
      <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid ' + T.border, minHeight: 96 }}>
        <div style={{ width: 150, background: grad, position: 'relative', flexShrink: 0, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          {num != null ? <span style={{ color: '#fff', fontSize: 30, fontWeight: 800, zIndex: 1 }}>{num}</span> : <span style={{ color: '#fff', fontSize: 30, zIndex: 1 }}>★</span>}
        </div>
        <div style={{ flex: 1, background: T.bg, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: T.text }}>{title}</div>
          {sub ? <div style={{ fontSize: 13, color: T.sub, marginTop: 6 }}>{sub}</div> : null}
        </div>
      </div>
    );
  }

  if (variant === 'stat-banner') {
    return (
      <div style={{ background: grad, borderRadius: 12, padding: '20px 26px', color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div style={{ position: 'absolute', left: -30, bottom: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ minWidth: 0, zIndex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>{title}</div>
          {sub ? <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 460 }}>{sub}</div> : null}
        </div>
        <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.16)', borderRadius: 12, padding: '12px 20px', zIndex: 1, flexShrink: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{num != null ? num : '—'}</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>total</div>
        </div>
      </div>
    );
  }

  if (variant === 'centered') {
    return (
      <div style={{ background: grad, borderRadius: 12, padding: '28px 26px', color: '#fff', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', left: -40, top: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', right: -40, bottom: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        {num != null ? <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, zIndex: 1, position: 'relative' }}>{num}</div> : null}
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: 0.2, marginTop: num != null ? 6 : 0, zIndex: 1, position: 'relative' }}>{title}</div>
        {sub ? <div style={{ fontSize: 13, opacity: 0.85, marginTop: 7, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', zIndex: 1, position: 'relative' }}>{sub}</div> : null}
      </div>
    );
  }

  if (variant === 'boxed') {
    return (
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 14, padding: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ background: grad, borderRadius: 10, padding: '20px 22px', color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'absolute', right: -24, top: -24, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 0.2 }}>{title}</div>
            {sub ? <div style={{ fontSize: 13, opacity: 0.85, marginTop: 5 }}>{sub}</div> : null}
          </div>
          {num != null ? (
            <span style={{ background: '#fff', color: primaryOf(), borderRadius: 12, padding: '8px 16px', fontSize: 22, fontWeight: 800, lineHeight: 1, zIndex: 1, flexShrink: 0 }}>{num}</span>
          ) : null}
        </div>
      </div>
    );
  }

  // default — full gradient hero with floating bubbles + corner badge
  return (
    <div style={{ background: grad, borderRadius: 12, padding: '22px 26px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', right: 40, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>{title}</div>
      {sub ? <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, maxWidth: 560 }}>{sub}</div> : null}
      {num != null ? (
        <span style={{ position: 'absolute', right: 22, top: 20, background: 'rgba(255,255,255,0.18)', borderRadius: 16, padding: '4px 14px', fontSize: 14, fontWeight: 700 }}>
          {num}
        </span>
      ) : null}
    </div>
  );
}

ctx.render(<ClickWrap><Comp /></ClickWrap>);
`,
};


/** 环形占比图 — SVG donut of a field's value distribution (option colors) */
export const donutChart: Template = {
  key: 'donutChart',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'collection',
  label: 'Donut chart',
  description: 'Share-of-total donut with legend, colored by the field’s options',
  icon: '🍩',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 819,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'field', type: 'field', label: 'Group-by field', collectionFrom: 'collection', required: true },
    { name: 'label', type: 'text', label: 'Title' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'donut',
      label: 'Style',
      default: 'default',
      options: [
        { label: 'Donut', value: 'default' },
        { label: 'Pie', value: 'pie' },
        { label: 'Half donut', value: 'half-donut' },
        { label: 'Bars', value: 'bars' },
        { label: 'Progress rings', value: 'progress-ring' },
        { label: 'Stacked bar', value: 'stacked-bar' },
        { label: 'Gauge', value: 'gauge' },
      ],
    },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const enumOpts = Array.isArray($p.field__enum) ? $p.field__enum : [];
const COLOR = { blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1', magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d' };
const FALLBACK = ['#1677ff', '#52c41a', '#faad14', '#fa541c', '#722ed1', '#13c2c2', '#eb2f96', '#a0d911'];

function Donut() {
  const [parts, setParts] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(500);
        await ctx.resource.refresh();
        const rows = ctx.resource.getData() || [];
        const counts = {};
        rows.forEach(function (r) { const v = r[$p.field]; if (v != null && v !== '') counts[String(v)] = (counts[String(v)] || 0) + 1; });
        let arr = Object.keys(counts).map(function (k, i) {
          const o = enumOpts.find(function (e) { return String(e.value) === k; });
          return { label: (o && o.label) || k, count: counts[k], color: (o && o.color && COLOR[o.color]) || FALLBACK[i % FALLBACK.length] };
        });
        arr.sort(function (a, b) { return b.count - a.count; });
        setParts(arr.slice(0, 8));
      } catch (e) { setParts([]); }
    })();
  }, []);

  if (parts == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;
  if (!parts.length) return <div style={{ padding: 12, color: T.sub }}>No data.</div>;

  const total = parts.reduce(function (a, p2) { return a + p2.count; }, 0) || 1;
  const variant = $p.variant || 'default';
  const wrap = { padding: '14px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border };

  const legend = (
    <div style={{ minWidth: 150 }}>
      {parts.map(function (p2, i) {
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p2.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: T.sub }}>{p2.label}</span>
            <b style={{ color: T.text }}>{Math.round((p2.count / total) * 100)}%</b>
          </div>
        );
      })}
    </div>
  );

  if (variant === 'bars') {
    const maxC = parts.reduce(function (m, p2) { return Math.max(m, p2.count); }, 0) || 1;
    return (
      <div style={wrap}>
        {$p.label ? <div style={{ fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div> : null}
        {parts.map(function (p2, i) {
          return (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ color: T.sub }}>{p2.label}</span>
                <span><b style={{ color: T.text }}>{p2.count}</b> <span style={{ color: T.sub }}>· {Math.round((p2.count / total) * 100)}%</span></span>
              </div>
              <div style={{ background: T.card, borderRadius: 5, height: 9 }}>
                <div style={{ width: (p2.count / maxC) * 100 + '%', height: '100%', background: p2.color, borderRadius: 5 }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'progress-ring') {
    return (
      <div style={wrap}>
        {$p.label ? <div style={{ fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {parts.map(function (p2, i) {
            const frac = p2.count / total;
            const R = 24, CIRC = 2 * Math.PI * R;
            return (
              <div key={i} style={{ textAlign: 'center', width: 72 }}>
                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto' }}>
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r={R} fill="none" stroke={T.card} strokeWidth="7" />
                    <circle cx="32" cy="32" r={R} fill="none" stroke={p2.color} strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={(frac * CIRC) + ' ' + CIRC} transform="rotate(-90 32 32)" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: T.text }}>{Math.round(frac * 100)}%</div>
                </div>
                <div style={{ fontSize: 11.5, color: T.sub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p2.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'stacked-bar') {
    return (
      <div style={wrap}>
        {$p.label ? <div style={{ fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div> : null}
        <div style={{ display: 'flex', height: 26, borderRadius: 7, overflow: 'hidden', border: '1px solid ' + T.border }}>
          {parts.map(function (p2, i) {
            const pct = (p2.count / total) * 100;
            return <div key={i} title={p2.label} style={{ width: pct + '%', background: p2.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{pct >= 12 ? Math.round(pct) + '%' : ''}</div>;
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12 }}>
          {parts.map(function (p2, i) {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: p2.color }} />
                <span style={{ color: T.sub }}>{p2.label}</span>
                <b style={{ color: T.text }}>{Math.round((p2.count / total) * 100)}%</b>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'gauge') {
    // a 270° gauge: the largest segment's share against the whole
    const top = parts[0];
    const frac = top.count / total;
    const R = 54, CIRC = 2 * Math.PI * R, sweep = 0.75; // 270°
    return (
      <div style={wrap}>
        {$p.label ? <div style={{ fontWeight: 600, marginBottom: 6, color: T.text }}>{$p.label}</div> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 140, height: 124, flexShrink: 0 }}>
            <svg width="140" height="124">
              <circle cx="70" cy="70" r={R} fill="none" stroke={T.card} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={(sweep * CIRC) + ' ' + CIRC} transform="rotate(135 70 70)" />
              <circle cx="70" cy="70" r={R} fill="none" stroke={top.color} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={(frac * sweep * CIRC) + ' ' + CIRC} transform="rotate(135 70 70)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: top.color }}>{Math.round(frac * 100) + '%'}</div>
                <div style={{ fontSize: 11, color: T.sub, marginTop: 3, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top.label}</div>
              </div>
            </div>
          </div>
          {legend}
        </div>
      </div>
    );
  }

  // svg arc charts (default donut / pie / half-donut)
  const half = variant === 'half-donut';
  const R = 52, CIRC = 2 * Math.PI * R;
  const span = half ? 0.5 : 1; // half-donut only sweeps the top semicircle
  const stroke = variant === 'pie' ? 52 : 22; // pie = solid (stroke == radius)
  let offset = 0;
  const arcs = parts.map(function (p2, i) {
    const frac = (p2.count / total) * span;
    const seg = (
      <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={p2.color} strokeWidth={stroke}
        strokeDasharray={(frac * CIRC) + ' ' + CIRC} strokeDashoffset={-offset * CIRC}
        transform="rotate(-90 70 70)" />
    );
    offset += frac;
    return seg;
  });

  const svgH = half ? 78 : 140;
  return (
    <div style={wrap}>
      {$p.label ? <div style={{ fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 140, height: svgH, flexShrink: 0 }}>
          <svg width="140" height={svgH}>{arcs}</svg>
          {variant === 'default' ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: T.text }}>{total}</div>
                <div style={{ fontSize: 10, color: T.sub, marginTop: 2 }}>total</div>
              </div>
            </div>
          ) : null}
          {half ? (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{total}</span>
              <span style={{ fontSize: 10, color: T.sub, marginLeft: 4 }}>total</span>
            </div>
          ) : null}
        </div>
        {legend}
      </div>
    </div>
  );
}

ctx.render(<Donut />);
`,
};

/** 日历热图 — GitHub-style activity density by a date field */
export const calendarHeatmap: Template = {
  key: 'calendarHeatmap',
  kind: 'block',
  scope: 'collection',
  label: 'Calendar heatmap',
  description: 'GitHub-style daily activity grid from a date field',
  icon: '📆',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 820,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    { name: 'dateField', type: 'field', label: 'Date field', collectionFrom: 'collection', accepts: 'date', hint: 'Defaults to createdAt' },
    { name: 'weeks', type: 'number', label: 'Weeks to show', default: 16 },
    { name: 'label', type: 'text', label: 'Title' },
    themeParam,
  ],
  body: `
const { Tooltip } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function Heat() {
  const [days, setDays] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(500);
        if (ctx.resource.setSort) ctx.resource.setSort(['-' + ($p.dateField || 'createdAt')]);
        await ctx.resource.refresh();
        const rows = ctx.resource.getData() || [];
        const counts = {};
        rows.forEach(function (r) {
          const d = new Date(r[$p.dateField || 'createdAt']);
          if (isNaN(d.getTime())) return;
          const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
          counts[key] = (counts[key] || 0) + 1;
        });
        setDays(counts);
      } catch (e) { setDays({}); }
    })();
  }, []);

  if (days == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;

  const weeks = Math.max(4, Math.min(32, Number($p.weeks) || 16));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // align grid to end on today's week (columns = weeks, rows = 7 days)
  const cols = [];
  let max = 0;
  for (let w = weeks - 1; w >= 0; w--) {
    const col = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(today.getTime() - (w * 7 + d) * 86400000);
      const key = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
      const n = days[key] || 0;
      if (n > max) max = n;
      col.push({ key: key, n: n, label: dt.toLocaleDateString() });
    }
    cols.push(col);
  }
  const shade = function (n) {
    if (!n) return T.card;
    const t = Math.min(1, n / (max || 1));
    // pale → deep green (GitHub style)
    const r2 = Math.round(235 - t * 195), g2 = Math.round(245 - t * 75), b2 = Math.round(235 - t * 175);
    return 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
  };

  return (
    <div style={{ padding: '14px 16px', overflowX: 'auto', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {$p.label ? <div style={{ fontWeight: 600, marginBottom: 10, color: T.text }}>{$p.label}</div> : null}
      <div style={{ display: 'flex', gap: 3 }}>
        {cols.map(function (col, ci) {
          return (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {col.map(function (cell) {
                return (
                  <Tooltip key={cell.key} title={cell.label + ' · ' + cell.n}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: shade(cell.n), display: 'block' }} />
                  </Tooltip>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: T.sub, marginTop: 8 }}>last {weeks} weeks · max {max}/day</div>
    </div>
  );
}

ctx.render(<Heat />);
`,
};

/** 评论流 — avatar + bubble feed (relation of current record, or a collection) */
export const commentFeed: Template = {
  key: 'commentFeed',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'record',
  label: 'Comment feed',
  description: 'Avatar + bubble feed of related records (or latest of a collection)',
  icon: '💬',
  category: 'Data',
  scenes: ['Popup', 'Dashboard', 'Form'],
  sort: 914,
  params: [
    { name: 'collection', type: 'collection', label: 'Base collection', required: true },
    {
      name: 'relation',
      type: 'association',
      label: 'Relation (optional)',
      collectionFrom: 'collection',
      hint: 'Set → feed of the current record’s relation; empty → latest of the collection',
    },
    { ...recordPinParam, showWhen: (p) => !!p.relation },
    { name: 'authorField', type: 'field', label: 'Author field', collectionFrom: 'relation|collection', hint: 'Name shown above the bubble' },
    { name: 'textField', type: 'field', label: 'Text field', collectionFrom: 'relation|collection', required: true },
    { name: 'timeField', type: 'field', label: 'Time field', collectionFrom: 'relation|collection', hint: 'Defaults to createdAt' },
    { name: 'limit', type: 'number', label: 'Max items', default: 8 },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'comment',
      label: 'Style',
      default: 'default',
      options: [
        { label: 'Bubble', value: 'default' },
        { label: 'Card', value: 'card' },
        { label: 'Compact', value: 'compact' },
        { label: 'Threaded', value: 'threaded' },
        { label: 'Chat bubbles', value: 'chat-bubbles' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Boxed', value: 'boxed' },
      ],
    },
    ...popupParams(['detail', 'view']),
    themeParam,
  ],
  body:
    RESOLVE_RECORD_SNIPPET +
    ROW_POPUP_SNIPPET +
    `
const { Empty, Spin } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const PALETTE = ['#1677ff', '#52c41a', '#faad14', '#fa541c', '#722ed1', '#eb2f96', '#13c2c2', '#2f54eb'];

function rel(v) {
  const d = new Date(v); if (isNaN(d.getTime())) return '';
  const a = Date.now() - d.getTime();
  const m = Math.floor(a / 60000), h = Math.floor(a / 3600000), dd = Math.floor(a / 86400000);
  if (a < 60000) return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  if (dd < 30) return dd + 'd ago';
  return d.toLocaleDateString();
}

function Comp() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        const timeField = $p.timeField || 'createdAt';
        const limit = Number($p.limit) > 0 ? Number($p.limit) : 8;
        let url = null;
        if ($p.relation) {
          const rec = await __resolveRecord();
          if (rec && rec.id != null) url = $p.relation.source + '/' + rec.id + '/' + $p.relation.name + ':list';
        }
        if (!url) url = ($p.relation ? $p.relation.target : $p.collection) + ':list';
        const res = await ctx.api.request({ url: url, params: { pageSize: limit, sort: ['-' + timeField] } });
        setRows((res && res.data && res.data.data) || []);
      } catch (e) { setRows([]); }
    })();
  }, []);

  if (rows == null) return <Spin />;
  if (!rows.length) return <Empty description="No comments" />;

  const variant = $p.variant || 'default';
  const wrap = { padding: '10px 14px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border };

  function info(r) {
    const author = $p.authorField ? String(r[$p.authorField] || '?') : '?';
    let sum = 0; for (let k = 0; k < author.length; k++) sum += author.charCodeAt(k);
    const color = PALETTE[sum % PALETTE.length];
    const text = r[$p.textField];
    const time = rel(r[$p.timeField || 'createdAt']);
    return { author: author, color: color, text: (text == null || text === '' ? '—' : String(text)), time: time };
  }

  if (variant === 'compact') {
    return (
      <div style={wrap}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0, transform: 'translateY(1px)' }} />
              <b style={{ fontSize: 12, color: T.text, flexShrink: 0 }}>{d.author === '?' ? '—' : d.author}</b>
              <span style={{ flex: 1, fontSize: 12.5, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.text}</span>
              <span style={{ fontSize: 11, color: T.sub, flexShrink: 0 }}>{d.time}</span>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: d.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{d.author.slice(0, 1).toUpperCase()}</span>
                <b style={{ fontSize: 12.5, color: T.text, flex: 1 }}>{d.author === '?' ? '—' : d.author}</b>
                <span style={{ fontSize: 11, color: T.sub }}>{d.time}</span>
              </div>
              <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5, overflowWrap: 'break-word' }}>{d.text}</div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'threaded') {
    return (
      <div style={{ ...wrap, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 28, top: 16, bottom: 16, width: 2, background: T.border }} />
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, position: 'relative' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: d.color, color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1, border: '2px solid ' + T.bg, boxSizing: 'border-box' }}>{d.author.slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12 }}>
                  <b style={{ color: T.text }}>{d.author === '?' ? '—' : d.author}</b>
                  <span style={{ color: T.sub, marginLeft: 8, fontSize: 11 }}>{d.time}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 12.5, color: T.text, lineHeight: 1.5, overflowWrap: 'break-word' }}>{d.text}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'chat-bubbles') {
    // alternate sides like a messaging thread (right = even rows / "me")
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(function (r, i) {
          const d = info(r);
          const right = i % 2 === 0;
          const av = <span style={{ width: 28, height: 28, borderRadius: '50%', background: d.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{d.author.slice(0, 1).toUpperCase()}</span>;
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 8, flexDirection: right ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {av}
              <div style={{ maxWidth: '74%', minWidth: 0 }}>
                <div style={{ fontSize: 11, color: T.sub, marginBottom: 3, textAlign: right ? 'right' : 'left' }}>{d.author === '?' ? '—' : d.author}<span style={{ marginLeft: 6 }}>{d.time}</span></div>
                <div style={{ background: right ? d.color : T.card, color: right ? '#fff' : T.text, borderRadius: right ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px', fontSize: 12.5, lineHeight: 1.5, overflowWrap: 'break-word' }}>{d.text}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column' }}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ padding: '9px 0', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <b style={{ fontSize: 12.5, color: d.color }}>{d.author === '?' ? '—' : d.author}</b>
                <span style={{ fontSize: 11, color: T.sub }}>{d.time}</span>
              </div>
              <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5, marginTop: 3, overflowWrap: 'break-word' }}>{d.text}</div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  if (variant === 'boxed') {
    return (
      <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map(function (r, i) {
          const d = info(r);
          return (
            <RowClick rec={r} key={r.id != null ? r.id : i}>
            <div style={{ display: 'flex', gap: 11, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '11px 13px', borderLeft: '3px solid ' + d.color }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: d.color, color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{d.author.slice(0, 1).toUpperCase()}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 12.5, color: T.text }}>{d.author === '?' ? '—' : d.author}</b>
                  <span style={{ fontSize: 11, color: T.sub, flexShrink: 0 }}>{d.time}</span>
                </div>
                <div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5, marginTop: 4, overflowWrap: 'break-word' }}>{d.text}</div>
              </div>
            </div>
            </RowClick>
          );
        })}
      </div>
    );
  }

  // default — bubble
  return (
    <div style={wrap}>
      {rows.map(function (r, i) {
        const d = info(r);
        return (
          <RowClick rec={r} key={r.id != null ? r.id : i}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: d.color, color: '#fff', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              {d.author.slice(0, 1).toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12 }}>
                <b style={{ color: T.text }}>{d.author === '?' ? '—' : d.author}</b>
                <span style={{ color: T.sub, marginLeft: 8, fontSize: 11 }}>{d.time}</span>
              </div>
              <div style={{ marginTop: 4, background: T.card, borderRadius: '2px 10px 10px 10px', padding: '8px 11px', fontSize: 12.5, color: T.text, lineHeight: 1.5, overflowWrap: 'break-word' }}>
                {d.text}
              </div>
            </div>
          </div>
          </RowClick>
        );
      })}
    </div>
  );
}

ctx.render(<Comp />);
`,
};

// ───────────────────────────────────────────────────────────────────────────
// Variant thumbnails (style picker cards) + variant-aware gallery previews.
// styled.ts is a .ts file (JSX is only legal inside the body template strings
// above), so these real components are authored with React.createElement via
// the tiny `h` helper instead of JSX syntax.
// ───────────────────────────────────────────────────────────────────────────

const h = React.createElement;
const F = React.Fragment;

type ThumbProps = { T: ThemeTokens };
type PreviewProps = { params?: any };

const PreviewFrame: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  h(
    'div',
    {
      style: {
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: 12,
        minHeight: 118,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      },
    },
    children,
  );

// ── status steps ────────────────────────────────────────────────────────────

const STEP_LABELS = ['A', 'B', 'C'];

const StepsDefault: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 3 } },
      STEP_LABELS.map((l, i) =>
        h(F, { key: i },
          h('span', { style: { width: 14, height: 14, borderRadius: '50%', background: i < 2 ? T.primary : T.bg, border: i < 2 ? 'none' : '1px solid ' + T.border, color: i < 2 ? '#fff' : T.sub, fontSize: 8, display: 'grid', placeItems: 'center', flexShrink: 0 } }, i < 2 ? '✓' : i + 1),
          i < 2 ? h('span', { style: { flex: 1, height: 1, background: i < 1 ? T.primary : T.border } }) : null,
        ),
      ),
    ),
  );

const StepsDots: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    h('div', { style: { display: 'flex', alignItems: 'center' } },
      STEP_LABELS.map((l, i) =>
        h(F, { key: i },
          h('span', { style: { width: 9, height: 9, borderRadius: '50%', background: i <= 1 ? T.primary : T.bg, border: '2px solid ' + (i <= 1 ? T.primary : T.border), boxSizing: 'border-box', flexShrink: 0 } }),
          i < 2 ? h('span', { style: { flex: 1, height: 2, background: i < 1 ? T.primary : T.border } }) : null,
        ),
      ),
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 7, color: T.sub, marginTop: 4 } },
      STEP_LABELS.map((l, i) => h('span', { key: i }, l)),
    ),
  );

const ARROW_CLIP = 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%, 6px 50%)';

const StepsArrow: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 6px' } },
    h('div', { style: { display: 'flex', gap: 2 } },
      STEP_LABELS.map((l, i) =>
        h('span', { key: i, style: { flex: 1, padding: '4px 2px 4px 6px', fontSize: 8, fontWeight: 600, color: i < 2 ? '#fff' : T.sub, background: i < 2 ? T.primary : T.card, clipPath: ARROW_CLIP, textAlign: 'center' } }, l),
      ),
    ),
  );

const StepsVertical: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    STEP_LABELS.map((l, i) =>
      h('div', { key: i, style: { display: 'flex', gap: 6, alignItems: 'center' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
          h('span', { style: { width: 13, height: 13, borderRadius: '50%', background: i <= 1 ? T.primary : T.bg, border: '2px solid ' + (i <= 1 ? T.primary : T.border), color: i <= 1 ? '#fff' : T.sub, fontSize: 7, fontWeight: 700, display: 'grid', placeItems: 'center', boxSizing: 'border-box' } }, i < 1 ? '✓' : i + 1),
          i < 2 ? h('span', { style: { width: 2, height: 8, background: i < 1 ? T.primary : T.border } }) : null,
        ),
        h('span', { style: { fontSize: 8, color: i === 1 ? T.text : T.sub, fontWeight: i === 1 ? 600 : 400, lineHeight: '13px' } }, l),
      ),
    ),
  );

const StepsNumbered: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    h('div', { style: { display: 'flex', alignItems: 'center' } },
      STEP_LABELS.map((l, i) =>
        h(F, { key: i },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
            h('span', { style: { width: 15, height: 15, borderRadius: '50%', background: i <= 1 ? T.primary : T.card, border: '1px solid ' + (i <= 1 ? T.primary : T.border), color: i <= 1 ? '#fff' : T.sub, fontSize: 8, fontWeight: 700, display: 'grid', placeItems: 'center' } }, i + 1),
            h('span', { style: { fontSize: 8, color: i === 1 ? T.text : T.sub } }, l),
          ),
          i < 2 ? h('span', { style: { flex: 1, height: 1, background: i < 1 ? T.primary : T.border, margin: '0 4px' } }) : null,
        ),
      ),
    ),
  );

const StepsProgressBar: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 } },
      h('span', { style: { fontSize: 9, fontWeight: 700, color: T.text } }, 'B'),
      h('span', { style: { fontSize: 8, color: T.sub } }, '50%'),
    ),
    h('div', { style: { height: 6, background: T.card, borderRadius: 4, overflow: 'hidden' } },
      h('div', { style: { width: '50%', height: '100%', background: T.primary, borderRadius: 4 } }),
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 7, color: T.sub } },
      STEP_LABELS.map((l, i) => h('span', { key: i, style: { color: i === 1 ? T.primary : T.sub } }, l)),
    ),
  );

const StepsChevron: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: 0, overflow: 'hidden', display: 'flex' } },
    STEP_LABELS.map((l, i) => {
      const done = i < 1, active = i === 1, first = i === 0, last = i === STEP_LABELS.length - 1;
      const clip = first
        ? 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)'
        : (last ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 7px 50%)' : 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%, 7px 50%)');
      return h('span', { key: i, style: { flex: 1, marginLeft: first ? 0 : -5, padding: '7px 3px', fontSize: 8, fontWeight: active ? 700 : 500, color: done || active ? '#fff' : T.sub, background: done || active ? T.primary : T.card, clipPath: clip, textAlign: 'center' } }, l);
    }),
  );

registerStyleThumbs('steps', { default: StepsDefault, dots: StepsDots, arrow: StepsArrow, vertical: StepsVertical, numbered: StepsNumbered, 'progress-bar': StepsProgressBar, chevron: StepsChevron });

// ── timeline thumbs ─────────────────────────────────────────────────────────

const TL_ROWS: [string, (t: ThemeTokens) => string][] = [
  ['C', (t) => t.primary],
  ['M', () => '#52c41a'],
  ['N', () => '#722ed1'],
];

const TimelineDefault: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 6 } },
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
          h('span', { style: { width: 15, height: 15, borderRadius: '50%', background: c(T), color: '#fff', fontSize: 8, fontWeight: 700, display: 'grid', placeItems: 'center' } }, g),
          i < 2 ? h('span', { style: { flex: 1, width: 2, background: T.border, minHeight: 5 } }) : null,
        ),
        h('div', { style: { height: 5, flex: 1, background: T.card, borderRadius: 3, marginTop: 5 } }),
      ),
    ),
  );

const TimelineCompact: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: c(T) } }),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 2 } }),
        h('span', { style: { width: 14, height: 4, background: T.border, borderRadius: 2 } }),
      ),
    ),
  );

const TimelineCard: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 } },
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 6, background: T.card, borderRadius: 5, borderLeft: '3px solid ' + c(T), padding: '5px 6px', alignItems: 'center' } },
        h('span', { style: { width: 13, height: 13, borderRadius: '50%', background: c(T), color: '#fff', fontSize: 7, fontWeight: 700, display: 'grid', placeItems: 'center' } }, g),
        h('div', { style: { flex: 1, height: 4, background: T.bg, borderRadius: 2 } }),
      ),
    ),
  );

const TimelineLeftLine: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', position: 'relative' } },
    h('div', { style: { position: 'absolute', left: 14, top: 11, bottom: 11, width: 2, background: T.border } }),
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 8, position: 'relative', marginBottom: i < 2 ? 7 : 0 } },
        h('span', { style: { width: 9, height: 9, borderRadius: '50%', background: T.bg, border: '2px solid ' + c(T), boxSizing: 'border-box', zIndex: 1, marginTop: 1 } }),
        h('div', { style: { flex: 1, height: 5, background: T.card, borderRadius: 3, marginTop: 2 } }),
      ),
    ),
  );

const TimelineAlternating: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', position: 'relative' } },
    h('div', { style: { position: 'absolute', left: '50%', top: 11, bottom: 11, width: 2, background: T.border, transform: 'translateX(-1px)' } }),
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end', position: 'relative', marginBottom: i < 2 ? 5 : 0 } },
        h('span', { style: { position: 'absolute', left: '50%', top: 2, width: 8, height: 8, borderRadius: '50%', background: T.bg, border: '2px solid ' + c(T), transform: 'translateX(-50%)', boxSizing: 'border-box', zIndex: 1 } }),
        h('div', { style: { width: '42%', height: 11, background: T.card, borderRadius: 3 } }),
      ),
    ),
  );

const TimelineIconLeft: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 2 } },
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 7, alignItems: 'center', padding: '4px 4px', borderRadius: 5, background: i % 2 === 1 ? T.card : 'transparent' } },
        h('span', { style: { width: 18, height: 18, borderRadius: 5, background: c(T) + '1f', color: c(T), fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center' } }, g),
        h('div', { style: { flex: 1 } },
          h('div', { style: { height: 4, background: T.card, borderRadius: 2, marginBottom: 3 } }),
          h('div', { style: { width: '55%', height: 3, background: T.border, borderRadius: 2 } }),
        ),
      ),
    ),
  );

const TimelineMinimalDots: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px 8px 18px', position: 'relative' } },
    h('div', { style: { position: 'absolute', left: 11, top: 12, bottom: 12, width: 1, background: T.border } }),
    TL_ROWS.map(([g, c], i) =>
      h('div', { key: i, style: { position: 'relative', marginBottom: i < 2 ? 7 : 0 } },
        h('span', { style: { position: 'absolute', left: -10, top: 1, width: 6, height: 6, borderRadius: '50%', background: c(T), boxShadow: '0 0 0 2px ' + T.bg } }),
        h('div', { style: { height: 4, background: T.card, borderRadius: 2, marginBottom: 3 } }),
        h('div', { style: { width: '45%', height: 3, background: T.border, borderRadius: 2 } }),
      ),
    ),
  );

registerStyleThumbs('timeline', { default: TimelineDefault, compact: TimelineCompact, card: TimelineCard, 'left-line': TimelineLeftLine, alternating: TimelineAlternating, 'icon-left': TimelineIconLeft, 'minimal-dots': TimelineMinimalDots });

// ── hero banner thumbs ──────────────────────────────────────────────────────

const HeroDefault: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.gradient, borderRadius: 6, padding: '9px 10px', color: '#fff', position: 'relative', overflow: 'hidden' } },
    h('div', { style: { position: 'absolute', right: -10, top: -10, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' } }),
    h('div', { style: { fontSize: 11, fontWeight: 700 } }, 'Hub'),
    h('div', { style: { fontSize: 8, opacity: 0.85, marginTop: 2 } }, 'track targets'),
    h('span', { style: { position: 'absolute', right: 8, top: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '1px 7px', fontSize: 8, fontWeight: 700 } }, '128'),
  );

const HeroSplit: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid ' + T.border } },
    h('div', { style: { width: 34, background: T.gradient, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 13, fontWeight: 800 } }, '128'),
    h('div', { style: { flex: 1, background: T.bg, padding: '9px 9px' } },
      h('div', { style: { fontSize: 11, fontWeight: 700, color: T.text } }, 'Hub'),
      h('div', { style: { fontSize: 8, color: T.sub, marginTop: 2 } }, 'track targets'),
    ),
  );

const HeroMinimal: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8 } },
    h('span', { style: { width: 4, alignSelf: 'stretch', borderRadius: 3, background: T.gradient } }),
    h('div', { style: { flex: 1 } },
      h('div', { style: { fontSize: 11, fontWeight: 700, color: T.text } }, 'Hub'),
      h('div', { style: { fontSize: 8, color: T.sub, marginTop: 2 } }, 'track targets'),
    ),
    h('span', { style: { fontSize: 13, fontWeight: 700, color: T.primary } }, '128'),
  );

const HeroStatBanner: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.gradient, borderRadius: 6, padding: '8px 10px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, overflow: 'hidden' } },
    h('div', null,
      h('div', { style: { fontSize: 11, fontWeight: 700 } }, 'Hub'),
      h('div', { style: { fontSize: 8, opacity: 0.85, marginTop: 2 } }, 'track targets'),
    ),
    h('div', { style: { background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '4px 8px', textAlign: 'center' } },
      h('div', { style: { fontSize: 13, fontWeight: 800, lineHeight: 1 } }, '128'),
      h('div', { style: { fontSize: 6, opacity: 0.85 } }, 'total'),
    ),
  );

const outlineGradBg = (T: ThemeTokens) => 'linear-gradient(' + T.bg + ',' + T.bg + '),' + T.gradient;

const HeroOutline: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, borderRadius: 6, padding: '9px 10px', position: 'relative', border: '2px solid transparent', backgroundImage: outlineGradBg(T), backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' } },
    h('div', { style: { fontSize: 11, fontWeight: 700, color: T.text } }, 'Hub'),
    h('div', { style: { fontSize: 8, color: T.sub, marginTop: 2 } }, 'track targets'),
    h('span', { style: { position: 'absolute', right: 8, top: 8, background: T.gradient, color: '#fff', borderRadius: 8, padding: '1px 7px', fontSize: 8, fontWeight: 700 } }, '128'),
  );

const HeroCentered: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.gradient, borderRadius: 6, padding: '10px 10px', color: '#fff', position: 'relative', overflow: 'hidden', textAlign: 'center' } },
    h('div', { style: { position: 'absolute', left: -12, top: -12, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }),
    h('div', { style: { position: 'absolute', right: -12, bottom: -14, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' } }),
    h('div', { style: { fontSize: 16, fontWeight: 800, lineHeight: 1, position: 'relative' } }, '128'),
    h('div', { style: { fontSize: 11, fontWeight: 700, marginTop: 3, position: 'relative' } }, 'Hub'),
    h('div', { style: { fontSize: 7, opacity: 0.85, marginTop: 2, position: 'relative' } }, 'track targets'),
  );

const HeroBoxed: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: 3 } },
    h('div', { style: { background: T.gradient, borderRadius: 5, padding: '8px 9px', color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8 } },
      h('div', { style: { position: 'absolute', right: -10, top: -10, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' } }),
      h('div', { style: { flex: 1, zIndex: 1 } },
        h('div', { style: { fontSize: 11, fontWeight: 700 } }, 'Hub'),
        h('div', { style: { fontSize: 7, opacity: 0.85, marginTop: 1 } }, 'track targets'),
      ),
      h('span', { style: { background: '#fff', color: T.primary, borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 800, zIndex: 1 } }, '128'),
    ),
  );

registerStyleThumbs('hero', { default: HeroDefault, split: HeroSplit, minimal: HeroMinimal, 'stat-banner': HeroStatBanner, outline: HeroOutline, centered: HeroCentered, boxed: HeroBoxed });

// ── donut thumbs ────────────────────────────────────────────────────────────

const donutParts = (T: ThemeTokens) => [
  { c: T.primary, f: 0.45 },
  { c: '#52c41a', f: 0.3 },
  { c: '#faad14', f: 0.25 },
];

const donutArcThumb = (mode: 'default' | 'pie' | 'half-donut'): React.FC<ThumbProps> => {
  const Thumb: React.FC<ThumbProps> = ({ T }) => {
    const half = mode === 'half-donut';
    const R = 22, C = 2 * Math.PI * R;
    const span = half ? 0.5 : 1;
    const sw = mode === 'pie' ? 22 : 9;
    let off = 0;
    const hh = half ? 40 : 56;
    return h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h('div', { style: { position: 'relative', width: 56, height: hh } },
        h('svg', { width: 56, height: hh, style: { overflow: 'visible' } },
          donutParts(T).map((p2, i) => {
            const frac = p2.f * span;
            const el = h('circle', { key: i, cx: 28, cy: 28, r: R, fill: 'none', stroke: p2.c, strokeWidth: sw, strokeDasharray: (frac * C) + ' ' + C, strokeDashoffset: -off * C, transform: 'rotate(-90 28 28)' });
            off += frac;
            return el;
          }),
        ),
        mode === 'default' ? h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: T.text } }, '86') : null,
      ),
    );
  };
  return Thumb;
};

const DonutBars: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    donutParts(T).map((p2, i) =>
      h('div', { key: i, style: { marginBottom: 5 } },
        h('div', { style: { height: 7, background: T.card, borderRadius: 4 } },
          h('div', { style: { width: p2.f * 100 + '%', height: '100%', background: p2.c, borderRadius: 4 } }),
        ),
      ),
    ),
  );

const DonutProgressRing: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', display: 'flex', gap: 7, justifyContent: 'center' } },
    donutParts(T).map((p2, i) => {
      const R = 12, C = 2 * Math.PI * R;
      return h('div', { key: i, style: { position: 'relative', width: 32, height: 32 } },
        h('svg', { width: 32, height: 32 },
          h('circle', { cx: 16, cy: 16, r: R, fill: 'none', stroke: T.card, strokeWidth: 4 }),
          h('circle', { cx: 16, cy: 16, r: R, fill: 'none', stroke: p2.c, strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: (p2.f * C) + ' ' + C, transform: 'rotate(-90 16 16)' }),
        ),
        h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 700, color: T.text } }, Math.round(p2.f * 100)),
      );
    }),
  );

const DonutStackedBar: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    h('div', { style: { display: 'flex', height: 16, borderRadius: 5, overflow: 'hidden' } },
      donutParts(T).map((p2, i) =>
        h('div', { key: i, style: { width: p2.f * 100 + '%', background: p2.c } }),
      ),
    ),
    h('div', { style: { display: 'flex', gap: 8, marginTop: 6 } },
      donutParts(T).map((p2, i) =>
        h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 3 } },
          h('span', { style: { width: 6, height: 6, borderRadius: 2, background: p2.c } }),
          h('span', { style: { fontSize: 7, color: T.sub } }, Math.round(p2.f * 100) + '%'),
        ),
      ),
    ),
  );

const DonutGauge: React.FC<ThumbProps> = ({ T }) => {
  const top = donutParts(T)[0];
  const R = 22, C = 2 * Math.PI * R, sweep = 0.75;
  return h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
    h('div', { style: { position: 'relative', width: 56, height: 50 } },
      h('svg', { width: 56, height: 50, style: { overflow: 'visible' } },
        h('circle', { cx: 28, cy: 28, r: R, fill: 'none', stroke: T.card, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: (sweep * C) + ' ' + C, transform: 'rotate(135 28 28)' }),
        h('circle', { cx: 28, cy: 28, r: R, fill: 'none', stroke: top.c, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: (top.f * sweep * C) + ' ' + C, transform: 'rotate(135 28 28)' }),
      ),
      h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: top.c } }, Math.round(top.f * 100) + '%'),
    ),
  );
};

registerStyleThumbs('donut', { default: donutArcThumb('default'), pie: donutArcThumb('pie'), 'half-donut': donutArcThumb('half-donut'), bars: DonutBars, 'progress-ring': DonutProgressRing, 'stacked-bar': DonutStackedBar, gauge: DonutGauge });

// ── comment thumbs ──────────────────────────────────────────────────────────

const CM_ROWS: [string, (t: ThemeTokens) => string][] = [
  ['W', (t) => t.primary],
  ['L', () => '#52c41a'],
];

const CommentDefault: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    CM_ROWS.map(([a, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 6, marginBottom: i < 1 ? 7 : 0 } },
        h('span', { style: { width: 16, height: 16, borderRadius: '50%', background: c(T), color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a),
        h('div', { style: { flex: 1 } },
          h('div', { style: { width: 26, height: 4, background: T.border, borderRadius: 2, marginBottom: 3 } }),
          h('div', { style: { height: 11, background: T.card, borderRadius: '1px 6px 6px 6px' } }),
        ),
      ),
    ),
  );

const CommentCard: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 } },
    CM_ROWS.map(([a, c], i) =>
      h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px 6px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 } },
          h('span', { style: { width: 13, height: 13, borderRadius: '50%', background: c(T), color: '#fff', fontSize: 7, fontWeight: 700, display: 'grid', placeItems: 'center' } }, a),
          h('div', { style: { width: 24, height: 4, background: T.border, borderRadius: 2 } }),
        ),
        h('div', { style: { height: 5, background: T.bg, borderRadius: 2 } }),
      ),
    ),
  );

const CommentCompact: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    CM_ROWS.map(([a, c], i) =>
      h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < 1 ? '1px solid ' + T.border : 'none' } },
        h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: c(T) } }),
        h('span', { style: { width: 18, height: 4, background: T.border, borderRadius: 2 } }),
        h('div', { style: { flex: 1, height: 4, background: T.card, borderRadius: 2 } }),
      ),
    ),
  );

const CommentThreaded: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', position: 'relative' } },
    h('div', { style: { position: 'absolute', left: 16, top: 12, bottom: 12, width: 2, background: T.border } }),
    CM_ROWS.map(([a, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 6, marginBottom: i < 1 ? 8 : 0, position: 'relative' } },
        h('span', { style: { width: 17, height: 17, borderRadius: '50%', background: c(T), color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1, border: '2px solid ' + T.bg, boxSizing: 'border-box' } }, a),
        h('div', { style: { flex: 1 } },
          h('div', { style: { width: 26, height: 4, background: T.border, borderRadius: 2, marginBottom: 3 } }),
          h('div', { style: { height: 5, background: T.card, borderRadius: 2 } }),
        ),
      ),
    ),
  );

const CommentChatBubbles: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: 6 } },
    CM_ROWS.map(([a, c], i) => {
      const right = i % 2 === 0;
      return h('div', { key: i, style: { display: 'flex', gap: 5, flexDirection: right ? 'row-reverse' : 'row', alignItems: 'flex-end' } },
        h('span', { style: { width: 15, height: 15, borderRadius: '50%', background: c(T), color: '#fff', fontSize: 8, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a),
        h('div', { style: { maxWidth: '70%', height: 13, background: right ? c(T) : T.card, borderRadius: right ? '7px 7px 1px 7px' : '7px 7px 7px 1px', width: i === 0 ? 56 : 40 } }),
      );
    }),
  );

const CommentMinimal: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '8px 9px' } },
    CM_ROWS.map(([a, c], i) =>
      h('div', { key: i, style: { padding: '4px 0', borderBottom: i < 1 ? '1px solid ' + T.border : 'none' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
          h('span', { style: { width: 18, height: 4, background: c(T), borderRadius: 2 } }),
          h('span', { style: { width: 10, height: 3, background: T.border, borderRadius: 2 } }),
        ),
        h('div', { style: { height: 4, background: T.card, borderRadius: 2 } }),
      ),
    ),
  );

const CommentBoxed: React.FC<ThumbProps> = ({ T }) =>
  h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: 5 } },
    CM_ROWS.map(([a, c], i) =>
      h('div', { key: i, style: { display: 'flex', gap: 6, background: T.card, border: '1px solid ' + T.border, borderLeft: '3px solid ' + c(T), borderRadius: 5, padding: '5px 6px' } },
        h('span', { style: { width: 15, height: 15, borderRadius: 4, background: c(T), color: '#fff', fontSize: 8, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a),
        h('div', { style: { flex: 1 } },
          h('div', { style: { width: 24, height: 4, background: T.border, borderRadius: 2, marginBottom: 3 } }),
          h('div', { style: { height: 4, background: T.bg, borderRadius: 2 } }),
        ),
      ),
    ),
  );

registerStyleThumbs('comment', { default: CommentDefault, card: CommentCard, compact: CommentCompact, threaded: CommentThreaded, 'chat-bubbles': CommentChatBubbles, minimal: CommentMinimal, boxed: CommentBoxed });

// ───────────────────────────────────────────────────────────────────────────
// Variant-aware gallery previews (full cards). Registered late so they replace
// the core previews.tsx defaults; they read params?.variant + theme and fall
// back to representative mock data.
// ───────────────────────────────────────────────────────────────────────────

// status steps preview
const StatusStepsPreviewV: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'default';
  const labels = ['报价', '审批', '发货', '完成'];
  const idx = 1;
  const wrap = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '10px 12px' };

  if (variant === 'dots') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        h('div', { style: { display: 'flex', alignItems: 'flex-start' } },
          labels.map((lab, i) =>
            h('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' } },
              i < labels.length - 1 ? h('span', { style: { position: 'absolute', top: 5, left: '50%', width: '100%', height: 2, background: i < idx ? T.primary : T.border } }) : null,
              h('span', { style: { width: 12, height: 12, borderRadius: '50%', background: i <= idx ? T.primary : T.bg, border: '2px solid ' + (i <= idx ? T.primary : T.border), zIndex: 1, boxSizing: 'border-box' } }),
              h('span', { style: { fontSize: 10, marginTop: 6, color: i === idx ? T.text : T.sub } }, lab),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'arrow') {
    const clip = 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)';
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        h('div', { style: { display: 'flex', gap: 3 } },
          labels.map((lab, i) =>
            h('span', { key: i, style: { flex: 1, padding: '5px 4px 5px 8px', fontSize: 10, fontWeight: 600, color: i <= idx ? '#fff' : T.sub, background: i <= idx ? T.primary : T.card, clipPath: clip, textAlign: 'center', whiteSpace: 'nowrap' } }, lab),
          ),
        ),
      ),
    );
  }
  if (variant === 'vertical') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        labels.map((lab, i) =>
          h('div', { key: i, style: { display: 'flex', gap: 9 } },
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
              h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: i <= idx ? T.primary : T.bg, border: '2px solid ' + (i <= idx ? T.primary : T.border), color: i <= idx ? '#fff' : T.sub, fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', boxSizing: 'border-box' } }, i < idx ? '✓' : i + 1),
              i < labels.length - 1 ? h('span', { style: { flex: 1, width: 2, background: i < idx ? T.primary : T.border, minHeight: 8, margin: '1px 0' } }) : null,
            ),
            h('div', { style: { fontSize: 11, color: i === idx ? T.text : T.sub, fontWeight: i === idx ? 600 : 400, lineHeight: '18px' } }, lab),
          ),
        ),
      ),
    );
  }
  if (variant === 'numbered') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', alignItems: 'center' } },
        labels.map((lab, i) =>
          h(F, { key: i },
            h('span', { style: { display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' } },
              h('span', { style: { width: 19, height: 19, borderRadius: '50%', background: i <= idx ? T.primary : T.card, border: '1px solid ' + (i <= idx ? T.primary : T.border), color: i <= idx ? '#fff' : T.sub, fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' } }, i + 1),
              h('span', { style: { fontSize: 10.5, color: i === idx ? T.text : T.sub } }, lab),
            ),
            i < labels.length - 1 ? h('span', { style: { flex: 1, height: 1, background: i < idx ? T.primary : T.border, minWidth: 8, margin: '0 6px' } }) : null,
          ),
        ),
      ),
    );
  }
  if (variant === 'progress-bar') {
    const pct = Math.round((idx / (labels.length - 1)) * 100);
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: T.text } }, labels[idx]),
          h('span', { style: { fontSize: 10.5, color: T.sub } }, 'Step ' + (idx + 1) + ' / ' + labels.length + ' · ' + pct + '%'),
        ),
        h('div', { style: { height: 7, background: T.card, borderRadius: 5, overflow: 'hidden' } },
          h('div', { style: { width: pct + '%', height: '100%', background: T.primary, borderRadius: 5 } }),
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 6 } },
          labels.map((lab, i) =>
            h('span', { key: i, style: { fontSize: 10, color: i === idx ? T.primary : T.sub, fontWeight: i === idx ? 600 : 400, flex: 1, textAlign: i === 0 ? 'left' : (i === labels.length - 1 ? 'right' : 'center') } }, lab),
          ),
        ),
      ),
    );
  }
  if (variant === 'chevron') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, padding: 0, overflow: 'hidden', display: 'flex' } },
        labels.map((lab, i) => {
          const done = i < idx, active = i === idx, first = i === 0, last = i === labels.length - 1;
          const clip = first
            ? 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%)'
            : (last ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 11px 50%)' : 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%, 11px 50%)');
          return h('span', { key: i, style: { flex: 1, marginLeft: first ? 0 : -8, padding: '9px 4px 9px ' + (first ? '10px' : '16px'), fontSize: 10.5, fontWeight: active ? 700 : 500, color: done || active ? '#fff' : T.sub, background: done || active ? T.primary : T.card, clipPath: clip, textAlign: 'center', whiteSpace: 'nowrap' } }, lab);
        }),
      ),
    );
  }
  return h(PreviewFrame, null,
    h('div', { style: wrap },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 } },
        labels.map((lab, i) =>
          h(F, { key: i },
            h('span', { style: { display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' } },
              h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: i <= idx ? T.primary : T.bg, border: i <= idx ? 'none' : '1px solid ' + T.border, color: i <= idx ? '#fff' : T.sub, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, i <= idx ? '✓' : i + 1),
              h('span', { style: { color: i <= idx ? T.text : T.sub } }, lab),
            ),
            i < labels.length - 1 ? h('span', { style: { flex: 1, height: 1, background: i < idx ? T.primary : T.border, minWidth: 12 } }) : null,
          ),
        ),
      ),
    ),
  );
};

registerPreview('statusSteps', StatusStepsPreviewV);

// timeline preview
const TimelineFeedPreviewV: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'default';
  const items: [string, string, string, string][] = [
    ['C', T.primary, 'Call · 2h ago', '约好下周复访'],
    ['M', '#52c41a', 'Mail · 1d ago', '已发报价单 V2'],
    ['N', '#722ed1', 'Note · 3d ago', '客户关注数据安全'],
  ];
  const wrap = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px' };

  if (variant === 'compact') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        items.map(([g, c, meta, txt], i) =>
          h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' } },
            h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: c } }),
            h('span', { style: { flex: 1, fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, txt),
            h('span', { style: { fontSize: 9, color: T.sub } }, meta.split(' · ')[1]),
          ),
        ),
      ),
    );
  }
  if (variant === 'card') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 6 } },
        items.map(([g, c, meta, txt], i) =>
          h('div', { key: i, style: { display: 'flex', gap: 8, background: T.card, borderRadius: 7, borderLeft: '3px solid ' + c, padding: '6px 8px' } },
            h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: c, color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center' } }, g),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 9, color: T.sub } }, meta),
              h('div', { style: { fontSize: 11, color: T.text } }, txt),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'left-line') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, position: 'relative' } },
        h('div', { style: { position: 'absolute', left: 18, top: 14, bottom: 14, width: 2, background: T.border } }),
        items.map(([g, c, meta, txt], i) =>
          h('div', { key: i, style: { display: 'flex', gap: 10, position: 'relative', paddingBottom: 8 } },
            h('span', { style: { width: 10, height: 10, borderRadius: '50%', background: T.bg, border: '2px solid ' + c, marginTop: 2, zIndex: 1, boxSizing: 'border-box' } }),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 9, color: T.sub } }, meta),
              h('div', { style: { fontSize: 11, color: T.text } }, txt),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'alternating') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, position: 'relative' } },
        h('div', { style: { position: 'absolute', left: '50%', top: 10, bottom: 10, width: 2, background: T.border, transform: 'translateX(-1px)' } }),
        items.map(([g, c, meta, txt], i) =>
          h('div', { key: i, style: { display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end', position: 'relative', marginBottom: 6 } },
            h('span', { style: { position: 'absolute', left: '50%', top: 4, width: 9, height: 9, borderRadius: '50%', background: T.bg, border: '2px solid ' + c, transform: 'translateX(-50%)', zIndex: 1, boxSizing: 'border-box' } }),
            h('div', { style: { width: '45%', background: T.card, borderRadius: 6, padding: '5px 7px', textAlign: i % 2 === 0 ? 'right' : 'left' } },
              h('div', { style: { fontSize: 8, color: T.sub } }, meta),
              h('div', { style: { fontSize: 10, color: T.text } }, txt),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'icon-left') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 2 } },
        items.map(([g, c, meta, txt], i) =>
          h('div', { key: i, style: { display: 'flex', gap: 9, alignItems: 'center', padding: '6px 5px', borderRadius: 7, background: i % 2 === 1 ? T.card : 'transparent' } },
            h('span', { style: { width: 28, height: 28, borderRadius: 8, background: c + '1f', color: c, fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 } }, g),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 11, color: T.text } }, txt),
              h('div', { style: { fontSize: 9, color: T.sub, marginTop: 1 } }, meta),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'minimal-dots') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, position: 'relative', paddingLeft: 20 } },
        h('div', { style: { position: 'absolute', left: 12, top: 14, bottom: 14, width: 1, background: T.border } }),
        items.map(([g, c, meta, txt], i) =>
          h('div', { key: i, style: { position: 'relative', paddingBottom: 9 } },
            h('span', { style: { position: 'absolute', left: -12, top: 3, width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: '0 0 0 3px ' + T.bg, zIndex: 1 } }),
            h('div', { style: { fontSize: 11, color: T.text } }, txt),
            h('div', { style: { fontSize: 9, color: T.sub, marginTop: 1 } }, meta),
          ),
        ),
      ),
    );
  }
  return h(PreviewFrame, null,
    h('div', { style: { ...wrap, paddingBottom: 2 } },
      items.map(([g, c, meta, txt], i) =>
        h('div', { key: i, style: { display: 'flex', gap: 8 } },
          h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
            h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: c, color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center' } }, g),
            i < 2 ? h('span', { style: { flex: 1, width: 2, background: T.border, minHeight: 6 } }) : null,
          ),
          h('div', { style: { paddingBottom: 8 } },
            h('div', { style: { fontSize: 9, color: T.sub } }, meta),
            h('div', { style: { fontSize: 11, color: T.text } }, txt),
          ),
        ),
      ),
    ),
  );
};

registerPreview('timelineFeed', TimelineFeedPreviewV);

// hero banner preview
const HeroBannerPreviewV: React.FC<PreviewProps> = ({ params }) => {
  const grad = params?.customGradient
    ? 'linear-gradient(135deg,' + (params?.customFrom || '#4f46e5') + ',' + (params?.customTo || '#9333ea') + ')'
    : resolveThemeTokens(params?.theme).gradient;
  const T = resolveThemeTokens(params?.theme);
  const primary = params?.customGradient ? params?.customFrom || '#4f46e5' : T.primary;
  const variant = params?.variant || 'default';
  const title = params?.title || 'Q3 Sales Hub';
  const sub = params?.subtitle || 'Track pipeline & targets in one place';

  if (variant === 'minimal') {
    return h(PreviewFrame, null,
      h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 } },
        h('span', { style: { width: 5, alignSelf: 'stretch', borderRadius: 3, background: grad } }),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 15, fontWeight: 700, color: T.text } }, title),
          h('div', { style: { fontSize: 11, color: T.sub, marginTop: 3 } }, sub),
        ),
        h('span', { style: { fontSize: 18, fontWeight: 700, color: primary } }, '128'),
      ),
    );
  }
  if (variant === 'outline') {
    return h(PreviewFrame, null,
      h('div', { style: { background: T.bg, borderRadius: 10, padding: '14px 16px', position: 'relative', border: '2px solid transparent', backgroundImage: 'linear-gradient(' + T.bg + ',' + T.bg + '),' + grad, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' } },
        h('div', { style: { fontSize: 15, fontWeight: 700, color: T.text } }, title),
        h('div', { style: { fontSize: 11, color: T.sub, marginTop: 3 } }, sub),
        h('span', { style: { position: 'absolute', right: 12, top: 12, background: grad, color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 } }, '128'),
      ),
    );
  }
  if (variant === 'split') {
    return h(PreviewFrame, null,
      h('div', { style: { display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid ' + T.border } },
        h('div', { style: { width: 60, background: grad, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' } },
          h('div', { style: { position: 'absolute', right: -12, top: -12, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' } }),
          h('span', { style: { color: '#fff', fontSize: 20, fontWeight: 800, zIndex: 1 } }, '128'),
        ),
        h('div', { style: { flex: 1, background: T.bg, padding: '12px 14px' } },
          h('div', { style: { fontSize: 14, fontWeight: 700, color: T.text } }, title),
          h('div', { style: { fontSize: 11, color: T.sub, marginTop: 3 } }, sub),
        ),
      ),
    );
  }
  if (variant === 'stat-banner') {
    return h(PreviewFrame, null,
      h('div', { style: { background: grad, borderRadius: 10, padding: '12px 16px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative', overflow: 'hidden' } },
        h('div', { style: { minWidth: 0 } },
          h('div', { style: { fontSize: 15, fontWeight: 700 } }, title),
          h('div', { style: { fontSize: 11, opacity: 0.85, marginTop: 3 } }, sub),
        ),
        h('div', { style: { background: 'rgba(255,255,255,0.16)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', flexShrink: 0 } },
          h('div', { style: { fontSize: 20, fontWeight: 800, lineHeight: 1 } }, '128'),
          h('div', { style: { fontSize: 9, opacity: 0.85, marginTop: 3 } }, 'total'),
        ),
      ),
    );
  }
  if (variant === 'centered') {
    return h(PreviewFrame, null,
      h('div', { style: { background: grad, borderRadius: 10, padding: '16px 14px', color: '#fff', position: 'relative', overflow: 'hidden', textAlign: 'center' } },
        h('div', { style: { position: 'absolute', left: -24, top: -24, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' } }),
        h('div', { style: { position: 'absolute', right: -24, bottom: -28, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' } }),
        h('div', { style: { fontSize: 26, fontWeight: 800, lineHeight: 1, position: 'relative' } }, '128'),
        h('div', { style: { fontSize: 14, fontWeight: 700, marginTop: 4, position: 'relative' } }, title),
        h('div', { style: { fontSize: 11, opacity: 0.85, marginTop: 4, position: 'relative' } }, sub),
      ),
    );
  }
  if (variant === 'boxed') {
    return h(PreviewFrame, null,
      h('div', { style: { background: T.bg, border: '1px solid ' + T.border, borderRadius: 12, padding: 4 } },
        h('div', { style: { background: grad, borderRadius: 8, padding: '13px 14px', color: '#fff', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { position: 'absolute', right: -16, top: -16, width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' } }),
          h('div', { style: { flex: 1, minWidth: 0, zIndex: 1 } },
            h('div', { style: { fontSize: 14, fontWeight: 700 } }, title),
            h('div', { style: { fontSize: 11, opacity: 0.85, marginTop: 3 } }, sub),
          ),
          h('span', { style: { background: '#fff', color: primary, borderRadius: 10, padding: '6px 12px', fontSize: 16, fontWeight: 800, lineHeight: 1, zIndex: 1, flexShrink: 0 } }, '128'),
        ),
      ),
    );
  }
  return h(PreviewFrame, null,
    h('div', { style: { background: grad, borderRadius: 10, padding: '14px 16px', color: '#fff', position: 'relative', overflow: 'hidden' } },
      h('div', { style: { position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' } }),
      h('div', { style: { fontSize: 15, fontWeight: 700 } }, title),
      h('div', { style: { fontSize: 11, opacity: 0.85, marginTop: 3 } }, sub),
      h('span', { style: { position: 'absolute', right: 12, top: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 } }, '128'),
    ),
  );
};

registerPreview('heroBanner', HeroBannerPreviewV);

// donut preview
const DonutChartPreviewV: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'default';
  const parts = [
    { l: '赢单', v: 45, c: T.primary },
    { l: '跟进', v: 30, c: '#52c41a' },
    { l: '流失', v: 25, c: '#faad14' },
  ];
  const wrap = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px' };

  const legend = h('div', { style: { fontSize: 11 } },
    parts.map((p2, i) =>
      h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
        h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: p2.c } }),
        h('span', { style: { color: T.sub } }, p2.l),
        h('b', { style: { color: T.text } }, p2.v + '%'),
      ),
    ),
  );

  if (variant === 'bars') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        parts.map((p2, i) =>
          h('div', { key: i, style: { marginBottom: 7 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 } },
              h('span', { style: { color: T.sub } }, p2.l),
              h('b', { style: { color: T.text } }, p2.v + '%'),
            ),
            h('div', { style: { background: T.card, borderRadius: 4, height: 8 } },
              h('div', { style: { width: (p2.v / 45) * 100 + '%', height: '100%', background: p2.c, borderRadius: 4 } }),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'progress-ring') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', gap: 12, justifyContent: 'center' } },
        parts.map((p2, i) => {
          const R = 18, C = 2 * Math.PI * R;
          return h('div', { key: i, style: { textAlign: 'center' } },
            h('div', { style: { position: 'relative', width: 46, height: 46, margin: '0 auto' } },
              h('svg', { width: 46, height: 46 },
                h('circle', { cx: 23, cy: 23, r: R, fill: 'none', stroke: T.card, strokeWidth: 5 }),
                h('circle', { cx: 23, cy: 23, r: R, fill: 'none', stroke: p2.c, strokeWidth: 5, strokeLinecap: 'round', strokeDasharray: (p2.v / 100) * C + ' ' + C, transform: 'rotate(-90 23 23)' }),
              ),
              h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: T.text } }, p2.v + '%'),
            ),
            h('div', { style: { fontSize: 10, color: T.sub, marginTop: 2 } }, p2.l),
          );
        }),
      ),
    );
  }

  if (variant === 'stacked-bar') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        h('div', { style: { display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', border: '1px solid ' + T.border } },
          parts.map((p2, i) =>
            h('div', { key: i, style: { width: p2.v + '%', background: p2.c, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 } }, p2.v >= 12 ? p2.v + '%' : ''),
          ),
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 9 } },
          parts.map((p2, i) =>
            h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 } },
              h('span', { style: { width: 8, height: 8, borderRadius: 3, background: p2.c } }),
              h('span', { style: { color: T.sub } }, p2.l),
              h('b', { style: { color: T.text } }, p2.v + '%'),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'gauge') {
    const top = parts[0];
    const R2 = 26, C2 = 2 * Math.PI * R2, sweep = 0.75;
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' } },
          h('div', { style: { position: 'relative', width: 70, height: 62 } },
            h('svg', { width: 70, height: 62, style: { overflow: 'visible' } },
              h('circle', { cx: 35, cy: 35, r: R2, fill: 'none', stroke: T.card, strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: (sweep * C2) + ' ' + C2, transform: 'rotate(135 35 35)' }),
              h('circle', { cx: 35, cy: 35, r: R2, fill: 'none', stroke: top.c, strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: ((top.v / 100) * sweep * C2) + ' ' + C2, transform: 'rotate(135 35 35)' }),
            ),
            h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800, color: top.c } }, top.v + '%'),
          ),
          legend,
        ),
      ),
    );
  }

  const half = variant === 'half-donut';
  const R = 26, C = 2 * Math.PI * R;
  const span = half ? 0.5 : 1;
  const sw = variant === 'pie' ? 26 : 11;
  const hh = half ? 42 : 70;
  let off = 0;
  return h(PreviewFrame, null,
    h('div', { style: wrap },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' } },
        h('div', { style: { position: 'relative', width: 70, height: hh } },
          h('svg', { width: 70, height: hh, style: { overflow: 'visible' } },
            parts.map((p2, i) => {
              const frac = (p2.v / 100) * span;
              const el = h('circle', { key: i, cx: 35, cy: 35, r: R, fill: 'none', stroke: p2.c, strokeWidth: sw, strokeDasharray: frac * C + ' ' + C, strokeDashoffset: -off * C, transform: 'rotate(-90 35 35)' });
              off += frac;
              return el;
            }),
          ),
          variant === 'default' ? h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: T.text } }, '86') : null,
          half ? h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', fontSize: 12, fontWeight: 700, color: T.text } }, '86') : null,
        ),
        legend,
      ),
    ),
  );
};

registerPreview('donutChart', DonutChartPreviewV);

// comment feed preview
const CommentFeedPreviewV: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const variant = params?.variant || 'default';
  const items: [string, string, string, string, string][] = [
    ['王', T.primary, '王建国', '2h ago', '客户确认下周到访,准备演示环境'],
    ['李', '#52c41a', '李娜', '1d ago', '报价单已发,等待回复'],
  ];
  const wrap = { background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px' };

  if (variant === 'compact') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        items.map(([a, c, name, time, txt], i) =>
          h('div', { key: i, style: { display: 'flex', alignItems: 'baseline', gap: 7, padding: '4px 0', borderBottom: i < 1 ? '1px solid ' + T.border : 'none' } },
            h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: c, transform: 'translateY(1px)' } }),
            h('b', { style: { fontSize: 11, color: T.text } }, name),
            h('span', { style: { flex: 1, fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, txt),
            h('span', { style: { fontSize: 9, color: T.sub } }, time),
          ),
        ),
      ),
    );
  }
  if (variant === 'card') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 6 } },
        items.map(([a, c, name, time, txt], i) =>
          h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 8, padding: '7px 9px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 } },
              h('span', { style: { width: 18, height: 18, borderRadius: '50%', background: c, color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center' } }, a),
              h('b', { style: { fontSize: 11, color: T.text, flex: 1 } }, name),
              h('span', { style: { fontSize: 9, color: T.sub } }, time),
            ),
            h('div', { style: { fontSize: 11, color: T.text, lineHeight: 1.5 } }, txt),
          ),
        ),
      ),
    );
  }
  if (variant === 'threaded') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, position: 'relative' } },
        h('div', { style: { position: 'absolute', left: 19, top: 14, bottom: 14, width: 2, background: T.border } }),
        items.map(([a, c, name, time, txt], i) =>
          h('div', { key: i, style: { display: 'flex', gap: 8, marginBottom: i < 1 ? 8 : 0, position: 'relative' } },
            h('span', { style: { width: 20, height: 20, borderRadius: '50%', background: c, color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0, zIndex: 1, border: '2px solid ' + T.bg, boxSizing: 'border-box' } }, a),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 10 } },
                h('b', { style: { color: T.text } }, name),
                h('span', { style: { color: T.sub, marginLeft: 6 } }, time),
              ),
              h('div', { style: { fontSize: 11, color: T.text, marginTop: 2, lineHeight: 1.5 } }, txt),
            ),
          ),
        ),
      ),
    );
  }
  if (variant === 'chat-bubbles') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 8 } },
        items.map(([a, c, name, time, txt], i) => {
          const right = i % 2 === 0;
          return h('div', { key: i, style: { display: 'flex', gap: 6, flexDirection: right ? 'row-reverse' : 'row', alignItems: 'flex-end' } },
            h('span', { style: { width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a),
            h('div', { style: { maxWidth: '74%', minWidth: 0 } },
              h('div', { style: { fontSize: 9, color: T.sub, marginBottom: 2, textAlign: right ? 'right' : 'left' } }, name + ' · ' + time),
              h('div', { style: { background: right ? c : T.card, color: right ? '#fff' : T.text, borderRadius: right ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding: '6px 10px', fontSize: 11, lineHeight: 1.5 } }, txt),
            ),
          );
        }),
      ),
    );
  }
  if (variant === 'minimal') {
    return h(PreviewFrame, null,
      h('div', { style: wrap },
        items.map(([a, c, name, time, txt], i) =>
          h('div', { key: i, style: { padding: '6px 0', borderBottom: i < 1 ? '1px solid ' + T.border : 'none' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 7 } },
              h('b', { style: { fontSize: 11, color: c } }, name),
              h('span', { style: { fontSize: 9, color: T.sub } }, time),
            ),
            h('div', { style: { fontSize: 11, color: T.text, lineHeight: 1.5, marginTop: 2 } }, txt),
          ),
        ),
      ),
    );
  }
  if (variant === 'boxed') {
    return h(PreviewFrame, null,
      h('div', { style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 7 } },
        items.map(([a, c, name, time, txt], i) =>
          h('div', { key: i, style: { display: 'flex', gap: 9, background: T.card, border: '1px solid ' + T.border, borderLeft: '3px solid ' + c, borderRadius: 8, padding: '8px 10px' } },
            h('span', { style: { width: 24, height: 24, borderRadius: 7, background: c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 7 } },
                h('b', { style: { fontSize: 11, color: T.text } }, name),
                h('span', { style: { fontSize: 9, color: T.sub } }, time),
              ),
              h('div', { style: { fontSize: 11, color: T.text, lineHeight: 1.5, marginTop: 3 } }, txt),
            ),
          ),
        ),
      ),
    );
  }
  return h(PreviewFrame, null,
    h('div', { style: { ...wrap, paddingBottom: 1 } },
      items.map(([a, c, name, time, txt], i) =>
        h('div', { key: i, style: { display: 'flex', gap: 7, marginBottom: 7 } },
          h('span', { style: { width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 } }, a),
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: 10, color: T.sub } }, name + ' · ' + time),
            h('div', { style: { background: T.card, borderRadius: '2px 8px 8px 8px', padding: '4px 8px', fontSize: 11, marginTop: 2, color: T.text } }, txt),
          ),
        ),
      ),
    ),
  );
};

registerPreview('commentFeed', CommentFeedPreviewV);
