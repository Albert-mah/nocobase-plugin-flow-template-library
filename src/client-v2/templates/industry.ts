import { themeParam } from '../core/themes';
import { popupParams, ROW_POPUP_SNIPPET } from './shared';
import { Template } from '../core/types';

/**
 * Industry mini-tools — distilled from past solutions (CRM demo, finance flows).
 */

/** 销售漏斗 — stage funnel with conversion rates (CRM classic) */
export const funnelStages: Template = {
  key: 'funnelStages',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'collection',
  label: 'Sales funnel',
  description: 'Stage funnel with counts and step conversion rates',
  icon: '🪜',
  category: 'Stats',
  scenes: ['Dashboard'],
  sort: 816,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    {
      name: 'stageField',
      type: 'field',
      label: 'Stage field',
      collectionFrom: 'collection',
      accepts: 'enum',
      required: true,
      hint: 'A select field — funnel steps follow its option order',
    },
    { name: 'label', type: 'text', label: 'Title' },
    themeParam,
  ],
  body: `
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

const enumOpts = Array.isArray($p.stageField__enum) ? $p.stageField__enum : [];
const COLOR = { blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1', magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d' };

function Funnel() {
  const [counts, setCounts] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(500);
        await ctx.resource.refresh();
        const rows = ctx.resource.getData() || [];
        const c = {};
        rows.forEach(function (r) { const v = r[$p.stageField]; if (v != null) c[String(v)] = (c[String(v)] || 0) + 1; });
        setCounts(c);
      } catch (e) { setCounts({}); }
    })();
  }, []);

  if (counts == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;

  // funnel steps follow the field's native option order
  const steps = enumOpts.map(function (o) {
    return { label: o.label || String(o.value), count: counts[String(o.value)] || 0, color: (o.color && COLOR[o.color]) || T.primary };
  });
  if (!steps.length) return <div style={{ padding: 12, color: T.sub }}>Stage field has no options.</div>;
  const max = steps.reduce(function (m, s) { return Math.max(m, s.count); }, 0) || 1;

  return (
    <div style={{ padding: '12px 16px', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {$p.label ? <div style={{ fontWeight: 600, color: T.text, marginBottom: 10 }}>{$p.label}</div> : null}
      {steps.map(function (s, i) {
        const prev = i > 0 ? steps[i - 1].count : null;
        const conv = prev ? Math.round((s.count / prev) * 100) : null;
        const w = Math.max(8, Math.round((s.count / max) * 100));
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: T.sub }}>{s.label}</span>
              <span>
                <b style={{ color: T.text }}>{s.count}</b>
                {conv != null ? <span style={{ color: conv >= 50 ? '#52c41a' : '#faad14', marginLeft: 8, fontSize: 11 }}>{'↳ ' + conv + '%'}</span> : null}
              </span>
            </div>
            <div style={{ height: 14, borderRadius: 7, width: w + '%', background: s.color, opacity: 0.85, margin: '0 auto', transition: 'width .3s' }} />
          </div>
        );
      })}
    </div>
  );
}

ctx.render(<Funnel />);
`,
};

/** 到期提醒 — records due within N days (finance / contracts / follow-ups) */
export const dueSoon: Template = {
  key: 'dueSoon',
  kind: 'block',
  alsoKinds: ['item'],
  scope: 'collection',
  label: 'Due soon',
  description: 'Records whose date falls within the next N days',
  icon: '🔔',
  category: 'Data',
  scenes: ['Dashboard'],
  sort: 817,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
    {
      name: 'dateField',
      type: 'field',
      label: 'Due-date field',
      collectionFrom: 'collection',
      accepts: 'date',
      required: true,
    },
    { name: 'titleField', type: 'field', label: 'Title field', collectionFrom: 'collection' },
    { name: 'days', type: 'number', label: 'Within (days)', default: 30 },
    { name: 'label', type: 'text', label: 'Title' },
    ...popupParams(['detail', 'view']),
    themeParam,
  ],
  body:
    ROW_POPUP_SNIPPET +
    `
const { Tag, Empty } = ctx.antd;
const { useState, useEffect } = ctx.React;
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };

function DueSoon() {
  const [rows, setRows] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize(500);
        await ctx.resource.refresh();
        const all = ctx.resource.getData() || [];
        const now = Date.now();
        const horizon = now + (Number($p.days) || 30) * 86400000;
        const hits = all
          .map(function (r) { const d = new Date(r[$p.dateField]); return { r: r, t: d.getTime() }; })
          .filter(function (x) { return !isNaN(x.t) && x.t >= now - 86400000 && x.t <= horizon; })
          .sort(function (a, b) { return a.t - b.t; })
          .slice(0, 20);
        setRows(hits);
      } catch (e) { setRows([]); }
    })();
  }, []);

  if (rows == null) return <div style={{ padding: 12, color: T.sub }}>Loading…</div>;
  if (!rows.length) return <Empty description={'Nothing due in ' + (Number($p.days) || 30) + ' days'} />;

  return (
    <div style={{ padding: '6px 0', background: T.bg, borderRadius: 10, border: '1px solid ' + T.border }}>
      {$p.label ? <div style={{ fontWeight: 600, color: T.text, padding: '4px 14px 8px' }}>{$p.label}</div> : null}
      {rows.map(function (x, i) {
        const rec = x.r;
        const daysLeft = Math.ceil((x.t - Date.now()) / 86400000);
        const color = daysLeft <= 7 ? 'red' : daysLeft <= 15 ? 'orange' : 'blue';
        const title = $p.titleField ? rec[$p.titleField] : ('#' + (rec.id != null ? rec.id : i));
        return (
          <RowClick rec={rec} key={rec.id != null ? rec.id : i}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
            <span style={{ flex: 1, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title == null || title === '' ? '—' : String(title)}
            </span>
            <span style={{ fontSize: 12, color: T.sub, margin: '0 10px', whiteSpace: 'nowrap' }}>
              {new Date(x.t).toLocaleDateString()}
            </span>
            <Tag color={color} style={{ margin: 0 }}>{daysLeft <= 0 ? 'today' : daysLeft + 'd'}</Tag>
          </div>
          </RowClick>
        );
      })}
    </div>
  );
}

ctx.render(<DueSoon />);
`,
};
