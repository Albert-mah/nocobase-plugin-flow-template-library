import React from 'react';
import { registerPreview } from '../core/previews';
import { registerStyleThumbs } from '../core/styleThumbs';
import { resolveThemeTokens, ThemeTokens, themeParam } from '../core/themes';
import { ParamSpec, Template } from '../core/types';
import { recordPinParam, USE_RECORD_SNIPPET } from './shared';

/**
 * Table column renderers. Curation: native field display already covers
 * select-tags / checkbox / currency formatting — these columns only do what
 * native can't (multi-field combos, relative time, conditional styling).
 *
 * Host interop: as a real column ctx.record is the row; inserted as a
 * block/item the record resolves via popup → ctx.record → pinned record
 * (collection + recordId params), so they work at page level too.
 *
 * Every column supports an optional click-popup (off by default): either an
 * auto row-detail drawer or an existing View popup picked from the table.
 *
 * Each column also offers a few compact visual variants (a `styleSelect`
 * param), each registering its own thumbnails + a live gallery preview from
 * THIS file — no core file is touched. Cell space is tiny, so variants stay
 * restrained: a swap of weight / chip / dot / bar, never a layout blowout.
 */

/** shared leading params: collection (auto-prefilled in a table) + record pin */
const RECORD_SOURCE_PARAMS: ParamSpec[] = [
  {
    name: 'collection',
    type: 'collection',
    label: 'Data collection',
    required: true,
    hint: 'Auto-filled inside a table; pick one when used at page level',
  },
  recordPinParam,
];

const POPUP_PARAMS: ParamSpec[] = [
  { name: 'enablePopup', type: 'boolean', label: 'Open popup on click', default: false },
  {
    name: 'popupMode',
    type: 'select',
    label: 'Popup content',
    default: 'detail',
    options: [
      { label: 'Row detail (auto)', value: 'detail' },
      { label: 'Existing view popup', value: 'view' },
    ],
    showWhen: (p) => !!p.enablePopup,
  },
  {
    name: 'popupViewUid',
    type: 'popupView',
    label: 'View popup to open',
    hint: 'A “View” action already configured on this table',
    showWhen: (p) => !!p.enablePopup && p.popupMode === 'view',
  },
];

/** shared body snippet: <Click>…</Click> wraps the cell when popup is enabled */
const POPUP_SNIPPET = `
function openRowPopup() {
  const rec = ctx.record || ctx.model.__rec || {};
  if ($p.popupMode === 'view' && $p.popupViewUid) {
    ctx.openView($p.popupViewUid, {
      mode: 'drawer',
      collectionName: (ctx.collection && ctx.collection.name) || $p.collection,
      filterByTk: rec.id,
      params: { filterByTk: rec.id },
    });
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
function Click(props) {
  if (!$p.enablePopup) return props.children;
  return <a onClick={openRowPopup} style={{ display: 'inline-block', color: 'inherit' }}>{props.children}</a>;
}
const T = $p.__theme || { primary: '#1677ff', bg: '#ffffff', card: '#fafafa', text: 'rgba(0,0,0,0.85)', sub: 'rgba(0,0,0,0.45)', border: '#f0f0f0' };
`;

const SHARED = USE_RECORD_SNIPPET + POPUP_SNIPPET;

// ════════════════════════════════════════════════════════════════════════════
// Variant thumbnails + live previews (registered on import; tiny by design)
// ════════════════════════════════════════════════════════════════════════════

type ThumbFC = React.FC<{ T: ThemeTokens }>;
type PreviewProps = { params?: any; ctx?: any };

/** preview frame mirroring core/previews.tsx so column previews match the rest */
const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(
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

const h = React.createElement;

// ── comboText ───────────────────────────────────────────────────────────────

registerStyleThumbs('combo', {
  twoLine: ({ T }) =>
    h('div', { style: { fontSize: 8, lineHeight: 1.25 } }, [
      h('div', { key: 'a', style: { fontWeight: 700, color: T.text } }, 'Alice Wu'),
      h('div', { key: 'b', style: { color: T.sub } }, '139… · Acme'),
    ]),
  inline: ({ T }) =>
    h('div', { style: { fontSize: 8.5, color: T.text } }, 'Alice Wu · 139… · Acme'),
  badge: ({ T }) =>
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 8 } }, [
      h('span', { key: 'a', style: { fontWeight: 700, color: T.text } }, 'Alice'),
      h('span', {
        key: 'b',
        style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 8, padding: '0 5px', color: T.sub },
      }, 'Acme'),
    ]),
  stacked: ({ T }) =>
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 8 } }, [
      h('span', { key: 'a', style: { width: 3, height: 18, borderRadius: 2, background: T.primary, display: 'inline-block' } }),
      h('div', { key: 'b', style: { lineHeight: 1.25 } }, [
        h('div', { key: 'x', style: { fontWeight: 700, color: T.text } }, 'Alice Wu'),
        h('div', { key: 'y', style: { color: T.sub } }, '139… · Acme'),
      ]),
    ]),
  pillGroup: ({ T }) =>
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 3 } },
      ['Alice', '139…', 'Acme'].map((s, i) =>
        h('span', {
          key: i,
          style: { fontSize: 7.5, color: i === 0 ? T.primary : T.sub, background: T.card, border: '1px solid ' + T.border, borderRadius: 8, padding: '0 5px' },
        }, s))),
  labelValue: ({ T }) =>
    h('div', { style: { fontSize: 8, lineHeight: 1.3 } },
      [['Name', 'Alice Wu'], ['Org', 'Acme']].map(([k, val], i) =>
        h('div', { key: i, style: { display: 'flex', gap: 4 } }, [
          h('span', { key: 'k', style: { color: T.sub, minWidth: 22 } }, k),
          h('span', { key: 'v', style: { color: T.text, fontWeight: 600 } }, val),
        ]))),
});

registerPreview('comboText', ({ params }: PreviewProps) => {
  const T = resolvePreviewTheme(params);
  const v = (params && params.variant) || 'twoLine';
  const rows: [string, string][] = [
    ['王建国', '13800001111 · 拉克托斯科技'],
    ['李娜', '13900002222 · 弗莱网络'],
  ];
  return h(Frame, null,
    rows.map(([head, rest], i) => {
      if (v === 'inline') {
        return h('div', { key: i, style: { marginBottom: 8, fontSize: 13, color: T.text } }, head + ' · ' + rest);
      }
      if (v === 'badge') {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } }, [
          h('span', { key: 'a', style: { fontWeight: 600, fontSize: 13, color: T.text } }, head),
          h('span', {
            key: 'b',
            style: { fontSize: 11, color: T.sub, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '1px 8px' },
          }, rest),
        ]);
      }
      if (v === 'stacked') {
        return h('div', { key: i, style: { display: 'flex', gap: 8, marginBottom: 8 } }, [
          h('span', { key: 'a', style: { width: 3, borderRadius: 2, background: T.primary, alignSelf: 'stretch' } }),
          h('div', { key: 'b' }, [
            h('div', { key: 'x', style: { fontWeight: 600, fontSize: 13, color: T.text } }, head),
            h('div', { key: 'y', style: { fontSize: 11, color: T.sub } }, rest),
          ]),
        ]);
      }
      if (v === 'pillGroup') {
        const parts = [head].concat(rest.split(' · '));
        return h('div', { key: i, style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 } },
          parts.map((p, j) =>
            h('span', {
              key: j,
              style: { fontSize: 12, color: j === 0 ? T.primary : T.sub, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '1px 9px' },
            }, p)));
      }
      if (v === 'labelValue') {
        const labels = ['姓名', '电话', '公司'];
        const parts = [head].concat(rest.split(' · '));
        return h('div', { key: i, style: { marginBottom: 8 } },
          parts.map((p, j) =>
            h('div', { key: j, style: { display: 'flex', gap: 6, fontSize: 12, lineHeight: 1.5 } }, [
              h('span', { key: 'k', style: { color: T.sub, minWidth: 36 } }, labels[j] || ''),
              h('span', { key: 'v', style: { color: T.text, fontWeight: 600 } }, p),
            ])));
      }
      // twoLine (default)
      return h('div', { key: i, style: { marginBottom: 8 } }, [
        h('div', { key: 'x', style: { fontWeight: 600, fontSize: 13, color: T.text } }, head),
        h('div', { key: 'y', style: { fontSize: 11, color: T.sub } }, rest),
      ]);
    }),
  );
});

// ── relativeTime ────────────────────────────────────────────────────────────

registerStyleThumbs('reltime', {
  text: ({ T }) => h('div', { style: { fontSize: 9, color: T.text } }, '3h ago'),
  badge: ({ T }) =>
    h('span', {
      style: { fontSize: 8, color: T.primary, background: T.card, border: '1px solid ' + T.border, borderRadius: 8, padding: '1px 7px' },
    }, '3h ago'),
  dot: ({ T }) =>
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color: T.text } }, [
      h('span', { key: 'd', style: { width: 6, height: 6, borderRadius: '50%', background: T.primary, display: 'inline-block' } }),
      '3h ago',
    ]),
  icon: ({ T }) => h('span', { style: { fontSize: 9, color: T.sub } }, '🕑 3h ago'),
  colored: () => h('span', { style: { fontSize: 9, fontWeight: 600, color: '#52c41a' } }, '3h ago'),
  fullDate: ({ T }) => h('span', { style: { fontSize: 8, color: T.text } }, '06-10 14:30'),
});

registerPreview('relativeTime', ({ params }: PreviewProps) => {
  const T = resolvePreviewTheme(params);
  const v = (params && params.variant) || 'text';
  const samples = ['just now', '3h ago', '5d ago'];
  return h(Frame, null,
    samples.map((t, i) => {
      if (v === 'badge') {
        return h('div', { key: i, style: { marginBottom: 6 } },
          h('span', {
            style: { fontSize: 12, color: T.primary, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '1px 9px' },
          }, t),
        );
      }
      if (v === 'dot') {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, color: T.text } }, [
          h('span', { key: 'd', style: { width: 7, height: 7, borderRadius: '50%', background: T.primary } }),
          t,
        ]);
      }
      if (v === 'icon') {
        return h('div', { key: i, style: { marginBottom: 6, fontSize: 13, color: T.text } }, '🕑 ' + t);
      }
      if (v === 'colored') {
        const ageColor = i === 0 ? '#52c41a' : i === 1 ? '#faad14' : '#f5222d';
        return h('div', { key: i, style: { marginBottom: 6, fontSize: 13, fontWeight: 600, color: ageColor } }, t);
      }
      if (v === 'fullDate') {
        const dates = ['2026-06-10 14:30', '2026-06-07 09:12', '2026-06-05 18:45'];
        return h('div', { key: i, style: { marginBottom: 6, fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' } }, dates[i]);
      }
      return h('div', { key: i, style: { marginBottom: 6, color: T.text, fontSize: 13 } }, t);
    }),
  );
});

// ── avatarText ──────────────────────────────────────────────────────────────

registerStyleThumbs('avatar', {
  left: ({ T }) =>
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 9 } }, [
      h('span', { key: 'a', style: { width: 16, height: 16, borderRadius: '50%', background: T.primary, color: '#fff', fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, 'A'),
      h('span', { key: 'b', style: { color: T.text } }, 'Alice'),
    ]),
  stacked: ({ T }) =>
    h('div', { style: { textAlign: 'center', fontSize: 8 } }, [
      h('div', { key: 'a', style: { width: 18, height: 18, borderRadius: '50%', background: T.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 } }, 'A'),
      h('div', { key: 'b', style: { color: T.text, marginTop: 2 } }, 'Alice'),
    ]),
  initials: ({ T }) =>
    h('span', { style: { width: 22, height: 22, borderRadius: 6, background: T.card, border: '1px solid ' + T.border, color: T.primary, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, 'AW'),
  chip: ({ T }) =>
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: '1px 7px 1px 2px', fontSize: 8 } }, [
      h('span', { key: 'a', style: { width: 14, height: 14, borderRadius: '50%', background: T.primary, color: '#fff', fontSize: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, 'A'),
      h('span', { key: 'b', style: { color: T.text } }, 'Alice'),
    ]),
  avatarOnly: ({ T }) =>
    h('span', { style: { display: 'inline-flex', gap: 3 } },
      [['A', T.primary], ['L', '#52c41a'], ['W', '#faad14']].map(([c, bg], i) =>
        h('span', { key: i, style: { width: 16, height: 16, borderRadius: '50%', background: bg, color: '#fff', fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: i ? -5 : 0, border: '1px solid #fff' } }, c))),
  statusDot: ({ T }) =>
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9 } }, [
      h('span', { key: 'a', style: { width: 7, height: 7, borderRadius: '50%', background: '#52c41a', display: 'inline-block' } }),
      h('span', { key: 'b', style: { color: T.text } }, 'Alice'),
    ]),
});

const AVATAR_PALETTE = ['#1677ff', '#52c41a', '#faad14', '#fa541c', '#722ed1', '#eb2f96', '#13c2c2', '#2f54eb'];
function avatarColor(s: string): string {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

registerPreview('avatarText', ({ params }: PreviewProps) => {
  const T = resolvePreviewTheme(params);
  const v = (params && params.variant) || 'left';
  const rows: [string, string, string][] = [['王', '王建国', avatarColor('王建国')], ['李', '李娜', avatarColor('李娜')]];
  return h(Frame, null,
    rows.map(([ini, name, c], i) => {
      if (v === 'stacked') {
        return h('div', { key: i, style: { display: 'inline-block', textAlign: 'center', marginRight: 16 } }, [
          h('div', { key: 'a', style: { width: 26, height: 26, borderRadius: '50%', background: c, color: '#fff', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ini),
          h('div', { key: 'b', style: { fontSize: 12, color: T.text, marginTop: 3 } }, name),
        ]);
      }
      if (v === 'initials') {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }, [
          h('span', { key: 'a', style: { width: 24, height: 24, borderRadius: 6, background: T.card, border: '1px solid ' + T.border, color: c, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, name.slice(0, 2)),
          h('span', { key: 'b', style: { fontSize: 13, color: T.text } }, name),
        ]);
      }
      if (v === 'chip') {
        return h('div', { key: i, style: { marginBottom: 6 } },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '2px 10px 2px 3px' } }, [
            h('span', { key: 'a', style: { width: 20, height: 20, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ini),
            h('span', { key: 'b', style: { fontSize: 13, color: T.text } }, name),
          ]),
        );
      }
      if (v === 'avatarOnly') {
        return h('div', { key: i, style: { marginBottom: 6 } },
          h('span', { style: { width: 26, height: 26, borderRadius: '50%', background: c, color: '#fff', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ini));
      }
      if (v === 'statusDot') {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }, [
          h('span', { key: 'a', style: { width: 9, height: 9, borderRadius: '50%', background: c } }),
          h('span', { key: 'b', style: { fontSize: 13, color: T.text } }, name),
        ]);
      }
      // left (default)
      return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }, [
        h('span', { key: 'a', style: { width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ini),
        h('span', { key: 'b', style: { fontSize: 13, color: T.text } }, name),
      ]);
    }),
  );
});

// ── highlightNumber ─────────────────────────────────────────────────────────

const GOOD = '#52c41a';
const BAD = '#f5222d';

registerStyleThumbs('highlight', {
  plain: () => h('b', { style: { fontSize: 11, color: GOOD } }, '128k'),
  badge: () => h('span', { style: { fontSize: 8, color: '#fff', background: GOOD, borderRadius: 8, padding: '1px 7px', fontWeight: 700 } }, '128k'),
  bar: ({ T }) =>
    h('div', { style: { fontSize: 8 } }, [
      h('b', { key: 'a', style: { color: GOOD } }, '128k'),
      h('div', { key: 'b', style: { height: 4, borderRadius: 2, background: T.card, marginTop: 3 } },
        h('div', { style: { width: '72%', height: '100%', borderRadius: 2, background: GOOD } })),
    ]),
  arrow: () => h('b', { style: { fontSize: 10, color: GOOD } }, '▲ 128k'),
  dotPrefix: () =>
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 } }, [
      h('span', { key: 'd', style: { width: 7, height: 7, borderRadius: '50%', background: GOOD, display: 'inline-block' } }),
      h('b', { key: 'n', style: { color: GOOD } }, '128k'),
    ]),
  pillBg: () =>
    h('span', { style: { fontSize: 9, color: GOOD, background: 'rgba(82,196,26,0.14)', borderRadius: 6, padding: '1px 7px', fontWeight: 700 } }, '128k'),
});

registerPreview('highlightNumber', ({ params }: PreviewProps) => {
  const T = resolvePreviewTheme(params);
  const v = (params && params.variant) || 'plain';
  const rows: [string, boolean][] = [['128,600', true], ['42,300', false], ['96,100', true]];
  return h(Frame, null,
    rows.map(([val, good], i) => {
      const color = good ? GOOD : BAD;
      if (v === 'badge') {
        return h('div', { key: i, style: { marginBottom: 5 } },
          h('span', { style: { fontSize: 12, color: '#fff', background: color, borderRadius: 10, padding: '1px 9px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, val));
      }
      if (v === 'bar') {
        return h('div', { key: i, style: { marginBottom: 6 } }, [
          h('b', { key: 'a', style: { color, fontVariantNumeric: 'tabular-nums', fontSize: 13 } }, val),
          h('div', { key: 'b', style: { height: 5, borderRadius: 3, background: T.card, marginTop: 3, maxWidth: 140 } },
            h('div', { style: { width: (good ? 78 : 34) + '%', height: '100%', borderRadius: 3, background: color } })),
        ]);
      }
      if (v === 'arrow') {
        return h('div', { key: i, style: { marginBottom: 5 } },
          h('b', { style: { color, fontVariantNumeric: 'tabular-nums', fontSize: 13 } }, (good ? '▲ ' : '▼ ') + val));
      }
      if (v === 'dotPrefix') {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 } }, [
          h('span', { key: 'd', style: { width: 9, height: 9, borderRadius: '50%', background: color } }),
          h('b', { key: 'n', style: { color, fontVariantNumeric: 'tabular-nums', fontSize: 13 } }, val),
        ]);
      }
      if (v === 'pillBg') {
        const tint = good ? 'rgba(82,196,26,0.14)' : 'rgba(245,34,45,0.12)';
        return h('div', { key: i, style: { marginBottom: 5 } },
          h('span', { style: { fontSize: 12, color, background: tint, borderRadius: 7, padding: '1px 9px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, val));
      }
      // plain (default)
      return h('div', { key: i, style: { marginBottom: 5 } },
        h('b', { style: { color, fontVariantNumeric: 'tabular-nums', fontSize: 13 } }, val));
    }),
  );
});

// ── progressBar ─────────────────────────────────────────────────────────────

registerStyleThumbs('progcol', {
  bar: ({ T }) =>
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 8 } }, [
      h('div', { key: 'a', style: { flex: 1, height: 6, borderRadius: 3, background: T.card } },
        h('div', { style: { width: '64%', height: '100%', borderRadius: 3, background: T.primary } })),
      h('span', { key: 'b', style: { color: T.sub } }, '64%'),
    ]),
  ring: ({ T }) => {
    const C = 2 * Math.PI * 9;
    return h('svg', { width: 26, height: 26 }, [
      h('circle', { key: 'a', cx: 13, cy: 13, r: 9, fill: 'none', stroke: T.card, strokeWidth: 4 }),
      h('circle', { key: 'b', cx: 13, cy: 13, r: 9, fill: 'none', stroke: T.primary, strokeWidth: 4, strokeDasharray: (0.64 * C) + ' ' + C, strokeLinecap: 'round', transform: 'rotate(-90 13 13)' }),
    ]);
  },
  stripes: ({ T }) =>
    h('div', { style: { height: 8, borderRadius: 4, background: T.card, overflow: 'hidden' } },
      h('div', { style: { width: '64%', height: '100%', backgroundImage: 'repeating-linear-gradient(45deg,' + T.primary + ',' + T.primary + ' 4px,rgba(255,255,255,0.4) 4px,rgba(255,255,255,0.4) 8px)' } })),
  text: ({ T }) =>
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 9 } }, [
      h('b', { key: 'a', style: { color: T.primary, width: 24 } }, '64%'),
      h('div', { key: 'b', style: { flex: 1, height: 5, borderRadius: 3, background: T.card } },
        h('div', { style: { width: '64%', height: '100%', borderRadius: 3, background: T.primary } })),
    ]),
  segments: ({ T }) =>
    h('div', { style: { display: 'flex', gap: 2 } },
      [0, 1, 2, 3, 4].map((i) =>
        h('span', { key: i, style: { width: 6, height: 7, borderRadius: 1, background: i < 3 ? T.primary : T.card } }))),
  dots: ({ T }) =>
    h('div', { style: { display: 'flex', gap: 3 } },
      [0, 1, 2, 3, 4].map((i) =>
        h('span', { key: i, style: { width: 6, height: 6, borderRadius: '50%', background: i < 3 ? T.primary : T.border } }))),
});

registerPreview('progressBar', ({ params }: PreviewProps) => {
  const T = resolvePreviewTheme(params);
  const v = (params && params.variant) || 'bar';
  const rows: [string, number][] = [['Q1', 82], ['Q2', 47], ['Q3', 95]];
  return h(Frame, null,
    rows.map(([n, pct], i) => {
      let viz: React.ReactNode;
      if (v === 'ring') {
        const C = 2 * Math.PI * 13;
        viz = h('div', { style: { position: 'relative', width: 36, height: 36 } }, [
          h('svg', { key: 's', width: 36, height: 36 }, [
            h('circle', { key: 'a', cx: 18, cy: 18, r: 13, fill: 'none', stroke: T.card, strokeWidth: 5 }),
            h('circle', { key: 'b', cx: 18, cy: 18, r: 13, fill: 'none', stroke: T.primary, strokeWidth: 5, strokeDasharray: ((pct / 100) * C) + ' ' + C, strokeLinecap: 'round', transform: 'rotate(-90 18 18)' }),
          ]),
          h('div', { key: 't', style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: T.text } }, pct),
        ]);
      } else if (v === 'stripes') {
        viz = h('div', { style: { flex: 1, height: 10, borderRadius: 5, background: T.card, overflow: 'hidden' } },
          h('div', { style: { width: pct + '%', height: '100%', backgroundImage: 'repeating-linear-gradient(45deg,' + T.primary + ',' + T.primary + ' 6px,rgba(255,255,255,0.45) 6px,rgba(255,255,255,0.45) 12px)' } }));
      } else if (v === 'text') {
        viz = h(React.Fragment, null, [
          h('b', { key: 'p', style: { width: 34, fontSize: 12, color: T.primary, fontVariantNumeric: 'tabular-nums' } }, pct + '%'),
          h('div', { key: 'b', style: { flex: 1, height: 7, borderRadius: 4, background: T.card } },
            h('div', { style: { width: pct + '%', height: '100%', borderRadius: 4, background: T.primary } })),
        ]);
      } else if (v === 'segments') {
        const total = 10, on = Math.round((pct / 100) * total);
        viz = h('div', { style: { display: 'flex', gap: 3, flex: 1 } },
          Array.from({ length: total }).map((_, k) =>
            h('span', { key: k, style: { flex: 1, height: 10, borderRadius: 2, background: k < on ? T.primary : T.card } })));
      } else if (v === 'dots') {
        const total = 10, on = Math.round((pct / 100) * total);
        viz = h('div', { style: { display: 'flex', gap: 4 } },
          Array.from({ length: total }).map((_, k) =>
            h('span', { key: k, style: { width: 9, height: 9, borderRadius: '50%', background: k < on ? T.primary : T.border } })));
      } else {
        // bar (default)
        viz = h('div', { style: { flex: 1, height: 7, borderRadius: 4, background: T.card } },
          h('div', { style: { width: pct + '%', height: '100%', borderRadius: 4, background: T.primary } }));
      }
      return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }, [
        h('span', { key: 'n', style: { width: 22, fontSize: 11, color: T.sub } }, n),
        viz,
      ]);
    }),
  );
});

// ── ratingDots ──────────────────────────────────────────────────────────────

registerStyleThumbs('rating', {
  stars: ({ T }) => h('span', { style: { fontSize: 10, color: T.primary, letterSpacing: 1 } }, '★★★★☆'),
  dots: ({ T }) =>
    h('span', { style: { display: 'inline-flex', gap: 3 } },
      [0, 1, 2, 3, 4].map((i) => h('span', { key: i, style: { width: 6, height: 6, borderRadius: '50%', background: i < 4 ? T.primary : T.border, display: 'inline-block' } }))),
  bar: ({ T }) =>
    h('div', { style: { width: 30, height: 6, borderRadius: 3, background: T.card } },
      h('div', { style: { width: '80%', height: '100%', borderRadius: 3, background: T.primary } })),
  number: ({ T }) =>
    h('span', { style: { fontSize: 9, color: T.text } }, [
      h('span', { key: 's', style: { color: T.primary } }, '★ '),
      h('b', { key: 'n' }, '4.0'),
      h('span', { key: 'o', style: { color: T.sub } }, '/5'),
    ]),
  hearts: () => h('span', { style: { fontSize: 10, letterSpacing: 1 } }, '❤️❤️❤️❤️🤍'),
  faces: () => h('span', { style: { fontSize: 13 } }, '🙂'),
});

registerPreview('ratingDots', ({ params }: PreviewProps) => {
  const T = resolvePreviewTheme(params);
  const v = (params && params.variant) || 'stars';
  const outOf = 5;
  const scores = [5, 3, 4];
  return h(Frame, null,
    scores.map((score, i) => {
      if (v === 'dots') {
        return h('div', { key: i, style: { display: 'flex', gap: 4, marginBottom: 6 } },
          Array.from({ length: outOf }).map((_, j) =>
            h('span', { key: j, style: { width: 10, height: 10, borderRadius: '50%', background: j < score ? T.primary : T.border } })));
      }
      if (v === 'bar') {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } }, [
          h('div', { key: 'b', style: { width: 90, height: 7, borderRadius: 4, background: T.card } },
            h('div', { style: { width: (score / outOf) * 100 + '%', height: '100%', borderRadius: 4, background: T.primary } })),
          h('span', { key: 'n', style: { fontSize: 11, color: T.sub } }, score + '/' + outOf),
        ]);
      }
      if (v === 'number') {
        return h('div', { key: i, style: { marginBottom: 6, fontSize: 14, color: T.text } }, [
          h('span', { key: 's', style: { color: T.primary } }, '★ '),
          h('b', { key: 'n' }, score.toFixed(1)),
          h('span', { key: 'o', style: { color: T.sub, fontSize: 12 } }, ' / ' + outOf),
        ]);
      }
      if (v === 'hearts') {
        return h('div', { key: i, style: { marginBottom: 4, fontSize: 15, letterSpacing: 2 } }, heartString(score, outOf));
      }
      if (v === 'faces') {
        return h('div', { key: i, style: { marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 } }, [
          h('span', { key: 'f', style: { fontSize: 20 } }, faceEmoji(score, outOf)),
          h('span', { key: 'n', style: { fontSize: 12, color: T.sub } }, score + '/' + outOf),
        ]);
      }
      // stars (default)
      return h('div', { key: i, style: { marginBottom: 4, fontSize: 16, letterSpacing: 2, color: T.primary } }, starString(score, outOf));
    }),
  );
});

function starString(score: number, outOf: number): string {
  let s = '';
  for (let i = 0; i < outOf; i++) s += i < score ? '★' : '☆';
  return s;
}

function heartString(score: number, outOf: number): string {
  const r = Math.round(score);
  let s = '';
  for (let i = 0; i < outOf; i++) s += i < r ? '❤️' : '🤍';
  return s;
}

const FACE_EMOJI = ['😡', '🙁', '😐', '🙂', '😄'];
function faceEmoji(score: number, outOf: number): string {
  const ratio = outOf > 0 ? score / outOf : 0;
  const idx = Math.min(FACE_EMOJI.length - 1, Math.max(0, Math.round(ratio * (FACE_EMOJI.length - 1))));
  return FACE_EMOJI[idx];
}

/** previews are static (no live data) → just the theme tokens */
function resolvePreviewTheme(params?: any): ThemeTokens {
  return resolveThemeTokens(params?.theme);
}

// ════════════════════════════════════════════════════════════════════════════
// Templates
// ════════════════════════════════════════════════════════════════════════════

/** 多字段拼接列 — combine several fields into one cell */
export const comboText: Template = {
  key: 'comboText',
  scope: 'record',
  kind: 'column',
  label: 'Multi-field text',
  description: 'Combine several fields in one cell — title/subtitle, inline, badge or accent',
  icon: '🧬',
  category: 'Data',
  scenes: ['Table'],
  sort: 808,
  params: [
    ...RECORD_SOURCE_PARAMS,
    { name: 'fields', type: 'fields', label: 'Fields to combine', collectionFrom: 'collection', required: true },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'combo',
      label: 'Style',
      default: 'twoLine',
      options: [
        { label: 'Title + subtitle', value: 'twoLine' },
        { label: 'Inline (joined)', value: 'inline' },
        { label: 'Name + badge', value: 'badge' },
        { label: 'Accent bar', value: 'stacked' },
        { label: 'Pill group', value: 'pillGroup' },
        { label: 'Label : value', value: 'labelValue' },
      ],
    },
    { name: 'separator', type: 'text', label: 'Separator', default: ' · ', hint: 'Used between joined/subtitle parts' },
    themeParam,
    ...POPUP_PARAMS,
  ],
  body:
    SHARED +
    `
function Cell() {
  const rec = useRecord() || {};
  const vals = ($p.fields || []).map(function (f) { const v = rec[f]; return v == null ? '' : String(v); });
  if (!vals.filter(Boolean).length) return <span style={{ color: T.sub }}>—</span>;
  const sep = $p.separator || ' · ';
  const v = $p.variant || 'twoLine';
  if (v === 'inline') {
    return <Click><span style={{ color: T.text }}>{vals.filter(Boolean).join(sep)}</span></Click>;
  }
  const head = vals[0] || '—';
  const rest = vals.slice(1).filter(Boolean).join(sep);
  if (v === 'badge') {
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, color: T.text }}>{head}</span>
          {rest ? <span style={{ fontSize: 12, color: T.sub, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '1px 8px' }}>{rest}</span> : null}
        </span>
      </Click>
    );
  }
  if (v === 'stacked') {
    return (
      <Click>
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <span style={{ width: 3, borderRadius: 2, background: T.primary, alignSelf: 'stretch' }} />
          <span style={{ lineHeight: 1.35 }}>
            <span style={{ fontWeight: 600, display: 'block', color: T.text }}>{head}</span>
            {rest ? <span style={{ fontSize: 12, color: T.sub, display: 'block' }}>{rest}</span> : null}
          </span>
        </span>
      </Click>
    );
  }
  if (v === 'pillGroup') {
    const parts = vals.filter(Boolean);
    return (
      <Click>
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
          {parts.map(function (p, j) {
            return <span key={j} style={{ fontSize: 12, color: j === 0 ? T.primary : T.sub, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '1px 9px' }}>{p}</span>;
          })}
        </span>
      </Click>
    );
  }
  if (v === 'labelValue') {
    const fields = $p.fields || [];
    return (
      <Click>
        <span style={{ display: 'inline-block', lineHeight: 1.45 }}>
          {vals.map(function (val, j) {
            if (!val) return null;
            return (
              <span key={j} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: T.sub, minWidth: 56 }}>{String(fields[j] || '')}</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{val}</span>
              </span>
            );
          })}
        </span>
      </Click>
    );
  }
  // twoLine (default)
  return (
    <Click>
      <span style={{ lineHeight: 1.35 }}>
        <span style={{ fontWeight: 600, display: 'block', color: T.text }}>{head}</span>
        {rest ? <span style={{ fontSize: 12, color: T.sub, display: 'block' }}>{rest}</span> : null}
      </span>
    </Click>
  );
}
ctx.render(<Cell />);
`,
};

/** 相对时间列 — "3 hours ago", full time on hover */
export const relativeTime: Template = {
  key: 'relativeTime',
  scope: 'record',
  kind: 'column',
  label: 'Relative time',
  description: '“3 hours ago” style time, full timestamp on hover — text, badge, dot or icon',
  icon: '⏳',
  category: 'Style',
  scenes: ['Table'],
  sort: 809,
  params: [
    ...RECORD_SOURCE_PARAMS,
    { name: 'field', type: 'field', label: 'Date field', collectionFrom: 'collection', required: true, accepts: 'date' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'reltime',
      label: 'Style',
      default: 'text',
      options: [
        { label: 'Plain text', value: 'text' },
        { label: 'Badge', value: 'badge' },
        { label: 'Status dot', value: 'dot' },
        { label: 'Clock icon', value: 'icon' },
        { label: 'Colored by age', value: 'colored' },
        { label: 'Full date', value: 'fullDate' },
      ],
    },
    themeParam,
    ...POPUP_PARAMS,
  ],
  body:
    SHARED +
    `
const { Tooltip } = ctx.antd;
function rel(v) {
  const d = new Date(v); if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const past = diff >= 0; const a = Math.abs(diff);
  const m = Math.floor(a / 60000), h = Math.floor(a / 3600000), dd = Math.floor(a / 86400000);
  let s;
  if (a < 60000) s = 'just now';
  else if (m < 60) s = m + 'm';
  else if (h < 24) s = h + 'h';
  else if (dd < 30) s = dd + 'd';
  else return d.toLocaleDateString();
  return a < 60000 ? s : (past ? s + ' ago' : 'in ' + s);
}
function Cell() {
  const rec = useRecord();
  const val = rec ? rec[$p.field] : null;
  if (!val) return <span style={{ color: T.sub }}>—</span>;
  const r = rel(val) || String(val);
  const full = String(new Date(val).toLocaleString());
  const v = $p.variant || 'text';
  let inner;
  if (v === 'badge') {
    inner = <span style={{ fontSize: 12, color: T.primary, background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: '1px 9px' }}>{r}</span>;
  } else if (v === 'dot') {
    inner = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.text }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.primary }} />{r}
      </span>
    );
  } else if (v === 'icon') {
    inner = <span style={{ color: T.text }}>🕑 {r}</span>;
  } else if (v === 'colored') {
    const days = Math.abs(Date.now() - new Date(val).getTime()) / 86400000;
    const ageColor = days < 1 ? '#52c41a' : days < 7 ? '#faad14' : '#f5222d';
    inner = <span style={{ fontWeight: 600, color: ageColor }}>{r}</span>;
  } else if (v === 'fullDate') {
    inner = <span style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{full}</span>;
  } else {
    inner = <span style={{ color: T.text }}>{r}</span>;
  }
  const tip = v === 'fullDate' ? r : full;
  return <Click><Tooltip title={tip}>{inner}</Tooltip></Click>;
}
ctx.render(<Cell />);
`,
};

/** 头像+文本列 — colored initial avatar + label */
export const avatarText: Template = {
  key: 'avatarText',
  scope: 'record',
  kind: 'column',
  label: 'Avatar + text',
  description: 'A colored initial avatar with the value — left, stacked, initials box or chip',
  icon: '🧑',
  category: 'Style',
  scenes: ['Table'],
  sort: 812,
  params: [
    ...RECORD_SOURCE_PARAMS,
    { name: 'field', type: 'field', label: 'Text field', collectionFrom: 'collection', required: true },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'avatar',
      label: 'Style',
      default: 'left',
      options: [
        { label: 'Avatar left', value: 'left' },
        { label: 'Stacked', value: 'stacked' },
        { label: 'Initials box', value: 'initials' },
        { label: 'Chip', value: 'chip' },
        { label: 'Avatar only', value: 'avatarOnly' },
        { label: 'Status dot', value: 'statusDot' },
      ],
    },
    themeParam,
    ...POPUP_PARAMS,
  ],
  body:
    SHARED +
    `
const PALETTE = ['#1677ff', '#52c41a', '#faad14', '#fa541c', '#722ed1', '#eb2f96', '#13c2c2', '#2f54eb'];
function Cell() {
  const rec = useRecord();
  const raw = rec ? rec[$p.field] : null;
  if (raw == null || raw === '') return <span style={{ color: T.sub }}>—</span>;
  const s = String(raw);
  let sum = 0; for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  const color = PALETTE[sum % PALETTE.length];
  const ini = s.slice(0, 1).toUpperCase();
  const v = $p.variant || 'left';
  if (v === 'stacked') {
    return (
      <Click>
        <span style={{ display: 'inline-block', textAlign: 'center' }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: color, color: '#fff', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{ini}</span>
          <span style={{ display: 'block', fontSize: 12, color: T.text, marginTop: 2 }}>{s}</span>
        </span>
      </Click>
    );
  }
  if (v === 'initials') {
    const two = s.replace(/\\s+/g, ' ').trim().split(' ').map(function (w) { return w.slice(0, 1); }).join('').slice(0, 2).toUpperCase() || ini;
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: T.card, border: '1px solid ' + T.border, color: color, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{two}</span>
          <span style={{ color: T.text }}>{s}</span>
        </span>
      </Click>
    );
  }
  if (v === 'chip') {
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.card, border: '1px solid ' + T.border, borderRadius: 14, padding: '2px 10px 2px 3px' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: color, color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</span>
          <span style={{ color: T.text }}>{s}</span>
        </span>
      </Click>
    );
  }
  if (v === 'avatarOnly') {
    const Tip = ctx.antd.Tooltip;
    return (
      <Click>
        <Tip title={s}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</span>
        </Tip>
      </Click>
    );
  }
  if (v === 'statusDot') {
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ color: T.text }}>{s}</span>
        </span>
      </Click>
    );
  }
  // left (default)
  return (
    <Click>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: color, color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</span>
        <span style={{ color: T.text }}>{s}</span>
      </span>
    </Click>
  );
}
ctx.render(<Cell />);
`,
};

/** 阈值高亮列 — color a number red/green against a threshold */
export const highlightNumber: Template = {
  key: 'highlightNumber',
  scope: 'record',
  kind: 'column',
  label: 'Threshold highlight',
  description: 'Color a number good/bad against a threshold — plain, badge, mini-bar or trend arrow',
  icon: '🚦',
  category: 'Style',
  scenes: ['Table'],
  sort: 813,
  params: [
    ...RECORD_SOURCE_PARAMS,
    { name: 'field', type: 'field', label: 'Number field', collectionFrom: 'collection', required: true, accepts: 'numeric' },
    { name: 'threshold', type: 'number', label: 'Threshold', required: true },
    {
      name: 'goodWhen',
      type: 'select',
      label: 'Good when',
      default: 'gte',
      options: [
        { label: '≥ threshold (higher is better)', value: 'gte' },
        { label: '≤ threshold (lower is better)', value: 'lte' },
      ],
    },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'highlight',
      label: 'Style',
      default: 'plain',
      options: [
        { label: 'Colored number', value: 'plain' },
        { label: 'Pill badge', value: 'badge' },
        { label: 'Number + bar', value: 'bar' },
        { label: 'Trend arrow', value: 'arrow' },
        { label: 'Dot prefix', value: 'dotPrefix' },
        { label: 'Soft pill', value: 'pillBg' },
      ],
    },
    { name: 'barMax', type: 'number', label: 'Bar max (100%)', showWhen: (p) => p.variant === 'bar', hint: 'Value treated as a full bar; defaults to 2× threshold' },
    themeParam,
    ...POPUP_PARAMS,
  ],
  body:
    SHARED +
    `
const GOOD = '#52c41a', BAD = '#f5222d';
function Cell() {
  const rec = useRecord();
  const raw = rec ? rec[$p.field] : null;
  const val = Number(raw);
  if (raw == null || raw === '' || isNaN(val)) return <span style={{ color: T.sub }}>—</span>;
  const t = Number($p.threshold) || 0;
  const good = $p.goodWhen === 'lte' ? val <= t : val >= t;
  const color = good ? GOOD : BAD;
  const txt = val.toLocaleString();
  const v = $p.variant || 'plain';
  if (v === 'badge') {
    return <Click><span style={{ color: '#fff', background: color, borderRadius: 10, padding: '1px 9px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{txt}</span></Click>;
  }
  if (v === 'arrow') {
    return <Click><b style={{ color: color, fontVariantNumeric: 'tabular-nums' }}>{($p.goodWhen === 'lte' ? (good ? '▼ ' : '▲ ') : (good ? '▲ ' : '▼ ')) + txt}</b></Click>;
  }
  if (v === 'bar') {
    const max = Number($p.barMax) || (t * 2) || (Math.abs(val) || 1);
    const pct = Math.min(100, Math.max(0, Math.round((val / max) * 100)));
    return (
      <Click>
        <span style={{ display: 'inline-block', minWidth: 90 }}>
          <b style={{ color: color, fontVariantNumeric: 'tabular-nums' }}>{txt}</b>
          <span style={{ display: 'block', height: 5, borderRadius: 3, background: T.card, marginTop: 3 }}>
            <span style={{ display: 'block', width: pct + '%', height: '100%', borderRadius: 3, background: color }} />
          </span>
        </span>
      </Click>
    );
  }
  if (v === 'dotPrefix') {
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <b style={{ color: color, fontVariantNumeric: 'tabular-nums' }}>{txt}</b>
        </span>
      </Click>
    );
  }
  if (v === 'pillBg') {
    const tint = good ? 'rgba(82,196,26,0.14)' : 'rgba(245,34,45,0.12)';
    return <Click><span style={{ color: color, background: tint, borderRadius: 7, padding: '1px 9px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{txt}</span></Click>;
  }
  // plain (default)
  return <Click><b style={{ color: color, fontVariantNumeric: 'tabular-nums' }}>{txt}</b></Click>;
}
ctx.render(<Cell />);
`,
};

/** 进度条列 — kept: native has no bar rendering for plain numbers */
export const progressBar: Template = {
  key: 'progressBar',
  scope: 'record',
  kind: 'column',
  label: 'Progress bar',
  description: 'Render a numeric field as a small bar, ring, stripes or labeled bar',
  icon: '📈',
  category: 'Style',
  scenes: ['Table'],
  sort: 810,
  params: [
    ...RECORD_SOURCE_PARAMS,
    { name: 'field', type: 'field', label: 'Number field', collectionFrom: 'collection', required: true, accepts: 'numeric', hint: 'The numeric value for this column.' },
    { name: 'max', type: 'number', label: 'Max (100%)', default: 100, hint: 'Value treated as 100%.' },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'progcol',
      label: 'Style',
      default: 'bar',
      options: [
        { label: 'Bar', value: 'bar' },
        { label: 'Ring', value: 'ring' },
        { label: 'Stripes', value: 'stripes' },
        { label: 'Percent + bar', value: 'text' },
        { label: 'Segments', value: 'segments' },
        { label: 'Dot scale', value: 'dots' },
      ],
    },
    themeParam,
    ...POPUP_PARAMS,
  ],
  body:
    SHARED +
    `
const { Progress } = ctx.antd;
function Cell() {
  const rec = useRecord();
  const val = Number(rec ? rec[$p.field] : null);
  const n = isNaN(val) ? 0 : val;
  const max = Number($p.max) || 100;
  const pct = Math.min(100, Math.max(0, Math.round((n / max) * 100)));
  const v = $p.variant || 'bar';
  if (v === 'ring') {
    return <Click><span><Progress type="circle" percent={pct} size={36} strokeColor={T.primary} trailColor={T.card} /></span></Click>;
  }
  if (v === 'stripes') {
    return (
      <Click>
        <span style={{ display: 'inline-block', minWidth: 110, verticalAlign: 'middle' }}>
          <span style={{ display: 'block', height: 10, borderRadius: 5, background: T.card, overflow: 'hidden' }}>
            <span style={{ display: 'block', width: pct + '%', height: '100%', backgroundImage: 'repeating-linear-gradient(45deg,' + T.primary + ',' + T.primary + ' 6px,rgba(255,255,255,0.45) 6px,rgba(255,255,255,0.45) 12px)' }} />
          </span>
        </span>
      </Click>
    );
  }
  if (v === 'text') {
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
          <b style={{ color: T.primary, fontVariantNumeric: 'tabular-nums', width: 38 }}>{pct + '%'}</b>
          <span style={{ flex: 1, height: 7, borderRadius: 4, background: T.card }}>
            <span style={{ display: 'block', width: pct + '%', height: '100%', borderRadius: 4, background: T.primary }} />
          </span>
        </span>
      </Click>
    );
  }
  if (v === 'segments') {
    const total = 10, on = Math.round((pct / 100) * total);
    return (
      <Click>
        <span style={{ display: 'inline-flex', gap: 2, minWidth: 100, verticalAlign: 'middle' }}>
          {Array.from({ length: total }).map(function (_, k) {
            return <span key={k} style={{ flex: 1, height: 9, borderRadius: 2, background: k < on ? T.primary : T.card }} />;
          })}
        </span>
      </Click>
    );
  }
  if (v === 'dots') {
    const total = 10, on = Math.round((pct / 100) * total);
    return (
      <Click>
        <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
          {Array.from({ length: total }).map(function (_, k) {
            return <span key={k} style={{ width: 9, height: 9, borderRadius: '50%', background: k < on ? T.primary : T.border }} />;
          })}
        </span>
      </Click>
    );
  }
  // bar (default)
  return <Click><span style={{ display: 'inline-block', minWidth: 110 }}><Progress percent={pct} size="small" strokeColor={T.primary} trailColor={T.card} /></span></Click>;
}
ctx.render(<Cell />);
`,
};

/** 评分列 — kept: quick readonly rating */
export const ratingDots: Template = {
  key: 'ratingDots',
  scope: 'record',
  kind: 'column',
  label: 'Rating',
  description: 'Render a 0..N number as a readonly rating — stars, dots, bar or number',
  icon: '⭐',
  category: 'Style',
  scenes: ['Table'],
  sort: 814,
  params: [
    ...RECORD_SOURCE_PARAMS,
    { name: 'field', type: 'field', label: 'Score field', collectionFrom: 'collection', required: true, accepts: 'numeric' },
    { name: 'outOf', type: 'number', label: 'Out of (max)', default: 5 },
    {
      name: 'variant',
      type: 'styleSelect',
      thumbs: 'rating',
      label: 'Style',
      default: 'stars',
      options: [
        { label: 'Stars', value: 'stars' },
        { label: 'Dots', value: 'dots' },
        { label: 'Bar', value: 'bar' },
        { label: 'Number / N', value: 'number' },
        { label: 'Hearts', value: 'hearts' },
        { label: 'Emoji face', value: 'faces' },
      ],
    },
    themeParam,
    ...POPUP_PARAMS,
  ],
  body:
    SHARED +
    `
const { Rate } = ctx.antd;
function Cell() {
  const rec = useRecord();
  const raw = rec ? rec[$p.field] : null;
  const val = Number(raw);
  const count = Number($p.outOf) || 5;
  const score = isNaN(val) ? 0 : Math.max(0, Math.min(count, val));
  const v = $p.variant || 'stars';
  if (v === 'dots') {
    const rounded = Math.round(score);
    return (
      <Click>
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {Array.from({ length: count }).map(function (_, j) {
            return <span key={j} style={{ width: 10, height: 10, borderRadius: '50%', background: j < rounded ? T.primary : T.border }} />;
          })}
        </span>
      </Click>
    );
  }
  if (v === 'bar') {
    const pct = Math.round((score / count) * 100);
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 80, height: 7, borderRadius: 4, background: T.card }}>
            <span style={{ display: 'block', width: pct + '%', height: '100%', borderRadius: 4, background: T.primary }} />
          </span>
          <span style={{ fontSize: 12, color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{score + '/' + count}</span>
        </span>
      </Click>
    );
  }
  if (v === 'number') {
    return (
      <Click>
        <span style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: T.primary }}>★ </span><b>{score.toFixed(1)}</b>
          <span style={{ color: T.sub }}>{' / ' + count}</span>
        </span>
      </Click>
    );
  }
  if (v === 'hearts') {
    const r = Math.round(score);
    let str = '';
    for (let k = 0; k < count; k++) str += k < r ? '❤️' : '🤍';
    return <Click><span style={{ fontSize: 14, letterSpacing: 1 }}>{str}</span></Click>;
  }
  if (v === 'faces') {
    const faces = ['😡', '🙁', '😐', '🙂', '😄'];
    const ratio = count > 0 ? score / count : 0;
    const idx = Math.min(faces.length - 1, Math.max(0, Math.round(ratio * (faces.length - 1))));
    return (
      <Click>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{faces[idx]}</span>
          <span style={{ fontSize: 12, color: T.sub, fontVariantNumeric: 'tabular-nums' }}>{score + '/' + count}</span>
        </span>
      </Click>
    );
  }
  // stars (default)
  return <Click><span><Rate disabled allowHalf value={score} count={count} style={{ fontSize: 13, color: T.primary }} /></span></Click>;
}
ctx.render(<Cell />);
`,
};
