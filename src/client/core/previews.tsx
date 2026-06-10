import { Alert, Button, Col, Input, Progress, Rate, Row, Switch, Tag } from 'antd';
import { PHONE_PLATFORMS } from './styleThumbs';
import { resolveThemeTokens } from './themes';
import React, { useEffect, useState } from 'react';

/**
 * Preview thumbnails for the gallery. Each is a React.FC<{params?, ctx?}>:
 * without props it renders MOCK sample data; when the user configures the
 * selected template, `params` (and `ctx` for real data fetches) are passed in
 * so the preview reflects the actual choices live.
 */

type PreviewProps = { params?: any; ctx?: any };

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: '#fafafa',
      border: '1px solid #f0f0f0',
      borderRadius: 6,
      padding: 12,
      minHeight: 118,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

/** fetch up to `limit` rows of a collection through the settings ctx (live previews) */
function useLiveRows(ctx: any, collection: string | undefined, limit: number) {
  const [state, setState] = useState<{ rows: any[]; count: number | null }>({ rows: [], count: null });
  useEffect(() => {
    let alive = true;
    if (!ctx?.api || !collection) {
      setState({ rows: [], count: null });
      return;
    }
    ctx.api
      .request({ url: collection + ':list', params: { pageSize: limit } })
      .then((res: any) => {
        if (!alive) return;
        setState({
          rows: res?.data?.data || [],
          count: res?.data?.meta?.count ?? (res?.data?.data || []).length,
        });
      })
      .catch(() => alive && setState({ rows: [], count: null }));
    return () => {
      alive = false;
    };
  }, [ctx, collection, limit]);
  return state;
}

// ── blocks (page) ──────────────────────────────────────────────────────────

const KpiPreview: React.FC<PreviewProps> = ({ params, ctx }) => {
  const src = params?.valueSource || 'aggregate';
  const live = useLiveRows(
    ctx,
    src === 'aggregate' ? params?.collection : undefined,
    params?.fn && params.fn !== 'count' ? 100 : 1,
  );
  const T = resolveThemeTokens(params?.theme);

  // value: mock 128600 until the user picks a data source — switching ONLY the
  // theme/style must never blank the number
  let value: any = 128600;
  if (params && src === 'aggregate' && params.collection) {
    value = '—';
    if (!params.fn || params.fn === 'count') value = live.count ?? '—';
    else if (params.field) {
      const nums = live.rows.map((r) => Number(r[params.field])).filter((n) => !isNaN(n));
      if (params.fn === 'sum') value = nums.reduce((a, b) => a + b, 0);
      else if (params.fn === 'avg') value = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 0;
      else if (params.fn === 'max') value = nums.length ? Math.max(...nums) : 0;
      else if (params.fn === 'min') value = nums.length ? Math.min(...nums) : 0;
    }
  }
  // sql/js sources: preview keeps the mock number — use the inline param-side test

  const num = typeof value === 'number' ? value.toLocaleString() : String(value);
  const display = (params?.prefix ?? (params ? '' : '¥')) + num + (params?.suffix ? ' ' + params.suffix : '');
  const title = params?.label || params?.collection || 'Revenue';
  const variant = params?.variant || 'minimal';

  let card: React.ReactNode;
  if (variant === 'gradient') {
    card = (
      <div style={{ background: T.gradient, borderRadius: 10, padding: '12px 14px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -18, top: -18, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{display}</div>
      </div>
    );
  } else if (variant === 'icon') {
    card = (
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, display: 'grid', placeItems: 'center', fontSize: 19, flexShrink: 0 }}>
          {params?.icon || '📊'}
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 11, color: T.sub }}>{title}</span>
          <span style={{ display: 'block', fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1.15 }}>{display}</span>
        </span>
      </div>
    );
  } else if (variant === 'outline') {
    card = (
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.primary, padding: '10px 14px' }}>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.primary, lineHeight: 1 }}>{display}</div>
      </div>
    );
  } else {
    card = (
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 }}>{display}</div>
        <div style={{ marginTop: 8, height: 3, width: 36, borderRadius: 2, background: T.primary }} />
      </div>
    );
  }

  return <Frame>{card}</Frame>;
};

const CardPreview: React.FC<PreviewProps> = ({ params, ctx }) => {
  const live = useLiveRows(ctx, params?.collection, 3);
  const T = resolveThemeTokens(params?.theme);
  const mock = [
    ['ACME', '¥12,000'],
    ['Globex', '¥8,400'],
    ['Initech', '¥5,200'],
  ];
  const realCards =
    params && live.rows.length
      ? live.rows.slice(0, 3).map((r) => {
          const title = params.titleField ? r[params.titleField] : r.id != null ? '#' + r.id : '—';
          const sub = (params.fields || [])
            .slice(0, 1)
            .map((f: string) => String(r[f] ?? ''))
            .join(' ');
          return [String(title ?? '—'), sub];
        })
      : null;
  const cards = realCards || mock;
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: 8 }}>
        <Row gutter={6}>
          {cards.map(([n, v], i) => (
            <Col span={8} key={i}>
              <div style={{ border: '1px solid ' + T.border, borderRadius: 4, padding: '6px 8px', background: T.card }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</div>
                <div style={{ color: T.sub, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v || ' '}</div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </Frame>
  );
};

const ANTD_HEX: Record<string, string> = {
  blue: '#1677ff', green: '#52c41a', gold: '#faad14', volcano: '#fa541c', purple: '#722ed1',
  magenta: '#eb2f96', cyan: '#13c2c2', geekblue: '#2f54eb', orange: '#fa8c16', lime: '#a0d911', red: '#f5222d',
};

const DistributionPreview: React.FC<PreviewProps> = ({ params, ctx }) => {
  const live = useLiveRows(ctx, params?.collection, 200);
  const T = resolveThemeTokens(params?.theme);
  let bars: { label: string; count: number; color: string }[];
  if (params?.field && live.rows.length) {
    const enumOpts: any[] = Array.isArray(params.field__enum) ? params.field__enum : [];
    const counts: Record<string, number> = {};
    live.rows.forEach((r) => {
      const v = r[params.field] == null || r[params.field] === '' ? '(empty)' : String(r[params.field]);
      counts[v] = (counts[v] || 0) + 1;
    });
    bars = Object.keys(counts)
      .map((k) => {
        const o = enumOpts.find((e) => String(e.value) === k);
        return { label: o?.label || k, count: counts[k], color: (o?.color && (ANTD_HEX[o.color] || o.color)) || T.primary };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  } else {
    bars = [
      { label: 'Confirmed', count: 42, color: T.primary },
      { label: 'Pending', count: 28, color: T.primary },
      { label: 'Draft', count: 13, color: T.primary },
    ];
  }
  const max = bars.reduce((m, b) => Math.max(m, b.count), 0) || 1;
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '8px 10px' }}>
        {bars.map((b, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2, color: T.sub }}>
              <span>{b.label}</span>
              <b style={{ color: T.text }}>{b.count}</b>
            </div>
            <div style={{ background: T.card, borderRadius: 4, height: 7 }}>
              <div style={{ width: (b.count / max) * 100 + '%', height: '100%', background: b.color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const ProgressGoalPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '8px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: T.text }}>{params?.label || 'Q3 sales goal'}</div>
        <Progress percent={68} status="active" strokeColor={T.primary} trailColor={T.card} />
        <div style={{ marginTop: 2, fontSize: 12, color: T.sub }}>
          <b style={{ color: T.text }}>68,000</b> / 100,000 (68%)
        </div>
      </div>
    </Frame>
  );
};

const RecentListPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ width: '100%', background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '4px 10px' }}>
        {[
          ['Order #1042 confirmed', 'ACME · ¥12,000', 'Jun 9'],
          ['New lead added', 'Globex Inc', 'Jun 9'],
          ['Invoice #88 paid', 'Initech', 'Jun 8'],
        ].map(([title, sub, time], i) => (
          <div key={i} style={{ padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{title}</span>
              <span style={{ fontSize: 10, color: T.sub, marginLeft: 8 }}>{time}</span>
            </div>
            <div style={{ fontSize: 11, color: T.sub }}>{sub}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const NoticeBannerPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: 8 }}>
        <Alert showIcon type={params?.type || 'info'} message={params?.title || 'Heads up'} description={params?.text || 'Month-end close is on the 30th.'} />
      </div>
    </Frame>
  );
};

const LeaderboardPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ width: '100%', background: T.bg, borderRadius: 8, border: '1px solid ' + T.border, padding: '4px 10px' }}>
        {[
          ['🥇', 'ACME Corp', '¥128,600'],
          ['🥈', 'Globex Inc', '¥94,200'],
          ['🥉', 'Initech', '¥71,800'],
        ].map(([rank, name, val], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '3px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' }}>
            <span style={{ width: 24, textAlign: 'center', fontSize: 14 }}>{rank}</span>
            <span style={{ flex: 1, fontSize: 12, margin: '0 8px', color: T.text }}>{name}</span>
            <b style={{ fontSize: 12, color: T.text }}>{val}</b>
          </div>
        ))}
      </div>
    </Frame>
  );
};

// ── custom (SQL / JS) ────────────────────────────────────────────────────────

/** SQL preview — manual Run only (auto-executing SQL while typing is dangerous) */
const SqlBlockPreview: React.FC<PreviewProps> = ({ params, ctx }) => {
  const [res, setRes] = useState<{ rows: any[]; err: string | null; ran: boolean }>({ rows: [], err: null, ran: false });
  const [running, setRunning] = useState(false);
  const sql = params?.sql;

  const run = () => {
    if (!ctx?.api || !sql || !String(sql).trim()) return;
    setRunning(true);
    ctx.api
      .request({ url: 'flowSql:run', method: 'post', data: { sql, type: 'selectRows', dataSourceKey: 'main' } })
      .then((r: any) => {
        const data = r?.data?.data ?? r?.data;
        setRes({ rows: Array.isArray(data) ? data.slice(0, 4) : data ? [data] : [], err: null, ran: true });
      })
      .catch((e: any) =>
        setRes({ rows: [], err: e?.response?.data?.errors?.[0]?.message || e?.message || 'SQL failed', ran: true }),
      )
      .finally(() => setRunning(false));
  };

  if (!params) {
    return (
      <Frame>
        <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#888' }}>
          <div style={{ color: '#1677ff' }}>SELECT</div>
          <div>&nbsp;&nbsp;status, count(*) AS total</div>
          <div><span style={{ color: '#1677ff' }}>FROM</span> orders <span style={{ color: '#1677ff' }}>GROUP BY</span> status</div>
          <div style={{ marginTop: 8, borderTop: '1px dashed #ddd', paddingTop: 6, color: '#555' }}>
            confirmed · 42&nbsp;&nbsp;|&nbsp;&nbsp;pending · 28
          </div>
        </div>
      </Frame>
    );
  }
  const runBar = (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button size="small" type="primary" ghost loading={running} onClick={run} data-sql-run>
        ▶ Run
      </Button>
      <span style={{ fontSize: 11, color: '#999' }}>runs the SQL once — nothing executes while typing</span>
    </div>
  );

  let bodyEl: React.ReactNode;
  if (res.err) bodyEl = <div style={{ color: '#cf1322', fontSize: 12 }}>{res.err}</div>;
  else if (!res.ran) bodyEl = <div style={{ color: '#999', fontSize: 12 }}>Click ▶ Run to preview the result</div>;
  else if (!res.rows.length) bodyEl = <div style={{ color: '#999', fontSize: 12 }}>No rows</div>;
  else {
    const cols = Object.keys(res.rows[0]).slice(0, 4);
    bodyEl = (
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
        <thead>
          <tr>{cols.map((c) => <th key={c} style={{ textAlign: 'left', padding: '2px 6px', color: '#888', borderBottom: '1px solid #eee' }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {res.rows.map((r, i) => (
            <tr key={i}>{cols.map((c) => <td key={c} style={{ padding: '2px 6px', borderBottom: '1px solid #f5f5f5' }}>{r[c] == null ? '—' : String(r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div>
      {runBar}
      <Frame>{bodyEl}</Frame>
    </div>
  );
};

const JsFreePreview: React.FC<PreviewProps> = () => (
  <Frame>
    <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11, color: '#888' }}>
      <div><span style={{ color: '#722ed1' }}>function</span> MyBlock() {'{'}</div>
      <div>&nbsp;&nbsp;<span style={{ color: '#722ed1' }}>return</span> &lt;Card&gt;…&lt;/Card&gt;;</div>
      <div>{'}'}</div>
      <div>ctx.render(&lt;MyBlock /&gt;);</div>
      <div style={{ marginTop: 6, color: '#aaa' }}>Renders on the page after save · editable anytime</div>
    </div>
  </Frame>
);

// ── filters ──────────────────────────────────────────────────────────────────

const PillFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const enumOpts: any[] = Array.isArray(params?.field__enum) ? params.field__enum : [];
  const pills = enumOpts.length
    ? [{ label: params?.allLabel || 'All', active: true }, ...enumOpts.slice(0, 3).map((o) => ({ label: o.label || String(o.value), active: false }))]
    : [
        { label: 'All', active: true },
        { label: 'Active', active: false },
        { label: 'Pending', active: false },
        { label: 'Closed', active: false },
      ];
  return (
    <Frame>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {pills.map((p2, i) => (
          <span
            key={i}
            style={{
              padding: '2px 12px', borderRadius: 14, fontSize: 12,
              border: '1px solid ' + (p2.active ? '#1677ff' : '#d9d9d9'),
              background: p2.active ? '#1677ff' : '#fff',
              color: p2.active ? '#fff' : 'rgba(0,0,0,0.72)',
            }}
          >
            {p2.label}
          </span>
        ))}
      </div>
    </Frame>
  );
};

const TreeFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const enumOpts: any[] = Array.isArray(params?.field__enum) ? params.field__enum : [];
  const nodes = enumOpts.length
    ? enumOpts.slice(0, 3).map((o) => o.label || String(o.value))
    : ['East region', 'North region', 'South region'];
  return (
    <Frame>
      <div style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>📂 {params?.title || 'All'}</div>
        {nodes.map((n, i) => (
          <div key={i} style={{ padding: '2px 0 2px 18px', color: i === 0 ? '#1677ff' : 'rgba(0,0,0,0.72)' }}>
            {i === 0 ? '▸ ' : '· '}{n}
          </div>
        ))}
      </div>
    </Frame>
  );
};

// ── blocks (popup) ─────────────────────────────────────────────────────────

const RecordSummaryPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const rows: [string, string][] = [
    ['company', 'ACME Inc.'],
    ['phone', '03-1234-5678'],
    ['email', 'hi@acme.co'],
  ];
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '6px 10px' }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', fontSize: 11, padding: '4px 0', borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none' }}>
            <span style={{ width: 64, color: T.sub }}>{k}</span>
            <span style={{ flex: 1, color: T.text }}>{v}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const RelatedListPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const items = ['Call · 2026-06-01', 'Call · 2026-05-28', 'Email · 2026-05-20'];
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '2px 10px' }}>
        {items.map((t, i) => (
          <div key={i} style={{ fontSize: 11, color: T.text, padding: '5px 0', borderBottom: i < items.length - 1 ? '1px solid ' + T.border : 'none' }}>
            {t}
          </div>
        ))}
      </div>
    </Frame>
  );
};

const RelatedCountPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>{params?.label || 'Orders'}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 }}>24</div>
        <div style={{ marginTop: 8, height: 3, width: 36, borderRadius: 2, background: T.primary }} />
      </div>
    </Frame>
  );
};

// ── actions (row + toolbar) ──────────────────────────────────────────────────

const QuickFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const enumOpts: any[] = Array.isArray(params?.field__enum) ? params.field__enum : [];
  const labels = enumOpts.length
    ? [params?.allLabel || 'All', ...enumOpts.map((o) => o.label || String(o.value))]
    : ['All', 'Active', 'Pending', 'Closed'];
  const first = enumOpts.length ? enumOpts[0] : { label: 'Active', color: 'green' };
  return (
    <Frame>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #d9d9d9',
            borderRadius: 6, padding: '4px 10px', background: '#fff', fontSize: 13 }}
        >
          <Tag color={first.color || 'green'} style={{ margin: 0 }}>{first.label}</Tag>
          <span style={{ color: '#bbb' }}>▾</span>
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{labels.slice(0, 5).join(' · ')}</div>
      </div>
    </Frame>
  );
};

const AutoRefreshPreview = () => (
  <Frame>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      <Switch defaultChecked size="small" />
      <span style={{ fontSize: 13 }}>Auto refresh · 10s</span>
    </div>
  </Frame>
);

const RowPrintPreview = () => (
  <Frame>
    <div style={{ textAlign: 'center' }}>
      <Button>🖨 Print</Button>
    </div>
  </Frame>
);

const RowOpenRelatedPreview = () => (
  <Frame>
    <div>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <Button type="link" size="small">
          🔍 Related
        </Button>
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 4, background: '#fff', fontSize: 11 }}>
        <div style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>Order #1024</div>
        <div style={{ padding: '3px 8px' }}>Order #1025</div>
      </div>
    </div>
  </Frame>
);

const ExportCsvPreview = () => (
  <Frame>
    <div style={{ textAlign: 'center' }}>
      <Button type="primary" ghost>
        ⬇️ Export CSV
      </Button>
      <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>3 selected · export.csv</div>
    </div>
  </Frame>
);

// ── form items ───────────────────────────────────────────────────────────────

const FormCalcPreview = () => (
  <Frame>
    <div>
      <div style={{ fontSize: 12, color: '#888' }}>Qty 4 × Price ¥320</div>
      <div style={{ marginTop: 6 }}>
        <span style={{ color: '#888', marginRight: 8 }}>Total</span>
        <b style={{ fontSize: 20 }}>¥1,280</b>
      </div>
    </div>
  </Frame>
);

const FormConcatPreview = () => (
  <Frame>
    <div>
      <div style={{ fontSize: 12, color: '#888' }}>first = John · last = Doe</div>
      <div style={{ marginTop: 6 }}>
        <span style={{ color: '#888', marginRight: 8 }}>Full name</span>
        <b style={{ fontSize: 16 }}>John Doe</b>
      </div>
    </div>
  </Frame>
);

const CharCounterPreview = () => (
  <Frame>
    <div>
      <Input size="small" defaultValue="Hello world" style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 13 }}>
        <span style={{ color: '#888' }}>
          <b>11</b> / 200
        </span>
      </div>
    </div>
  </Frame>
);

const CopyFromFieldPreview = () => (
  <Frame>
    <div>
      <Input size="small" addonBefore="billing" defaultValue="221B Baker St" style={{ marginBottom: 4 }} />
      <Input size="small" addonBefore="shipping" defaultValue="221B Baker St" />
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>📋 billing → shipping ✓</div>
    </div>
  </Frame>
);

// ── table columns ─────────────────────────────────────────────────────────────

const ProgressBarPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      {[
        ['Q1', 82],
        ['Q2', 47],
        ['Q3', 95],
      ].map(([n, p], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 22, fontSize: 11, color: T.sub }}>{n}</span>
          <div style={{ flex: 1 }}>
            <Progress percent={p as number} size="small" strokeColor={T.primary} />
          </div>
        </div>
      ))}
    </Frame>
  );
};

const RatingDotsPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      {[5, 3, 4].map((s, i) => (
        <div key={i} style={{ marginBottom: 1 }}>
          <Rate disabled allowHalf value={s} count={5} style={{ fontSize: 13, color: T.primary }} />
        </div>
      ))}
    </Frame>
  );
};


const ComboTextPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      {[['王建国', '13800001111 · 拉克托斯科技'], ['李娜', '13900002222 · 弗莱网络']].map(([t, sub], i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{t}</div>
          <div style={{ fontSize: 11, color: T.sub }}>{sub}</div>
        </div>
      ))}
    </Frame>
  );
};

const RelativeTimePreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      {['just now', '3h ago', '5d ago'].map((t, i) => (
        <div key={i} style={{ marginBottom: 4, color: T.text, fontSize: 13 }}>{t}</div>
      ))}
    </Frame>
  );
};

const AvatarTextPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      {[['王', '王建国', '#1677ff'], ['李', '李娜', '#52c41a']].map(([a, n, c], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: c as string, color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{a}</span>
          <span style={{ fontSize: 13, color: T.text }}>{n}</span>
        </div>
      ))}
    </Frame>
  );
};

const HighlightNumberPreview: React.FC<PreviewProps> = () => (
  <Frame>
    {[['128,600', '#52c41a'], ['42,300', '#f5222d'], ['96,100', '#52c41a']].map(([v, c], i) => (
      <div key={i} style={{ marginBottom: 4 }}>
        <b style={{ color: c as string, fontVariantNumeric: 'tabular-nums' }}>{v}</b>
      </div>
    ))}
  </Frame>
);


// ── form linkage + industry ─────────────────────────────────────────────────

const FormToggleBlocksPreview: React.FC<PreviewProps> = () => (
  <Frame>
    <div style={{ fontSize: 12, textAlign: 'center' }}>
      <div style={{ marginBottom: 6 }}><Input size="small" defaultValue="keyword…" style={{ width: 140 }} /></div>
      <div style={{ color: '#999' }}>has value → <s>category cards</s> hidden 👁️</div>
    </div>
  </Frame>
);

const FormDrivenFilterPreview: React.FC<PreviewProps> = () => (
  <Frame>
    <div style={{ fontSize: 12 }}>
      <Input size="small" defaultValue="install" style={{ marginBottom: 6 }} />
      <div style={{ border: '1px solid #eee', borderRadius: 4, background: '#fff', fontSize: 11 }}>
        <div style={{ padding: '3px 8px', borderBottom: '1px solid #f0f0f0' }}>How to install…</div>
        <div style={{ padding: '3px 8px' }}>Install guide for…</div>
      </div>
      <div style={{ color: '#999', marginTop: 4, fontSize: 11 }}>🔎 form value filters the target block</div>
    </div>
  </Frame>
);

const FormAutoFillPreview: React.FC<PreviewProps> = () => (
  <Frame>
    <div style={{ fontSize: 12 }}>
      <Input size="small" addonBefore="客户" defaultValue="ACME" style={{ marginBottom: 4 }} />
      <Input size="small" addonBefore="电话" defaultValue="03-1234-5678" style={{ marginBottom: 4 }} />
      <div style={{ color: '#52c41a', fontSize: 11 }}>🪄 filled 2 field(s) from lookup</div>
    </div>
  </Frame>
);

const FormSubtotalPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const fnLabel: Record<string, string> = { sum: 'Total', avg: 'Average', count: 'Count', min: 'Min', max: 'Max' };
  const fn = params?.fn || 'sum';
  const title = params?.label || fnLabel[fn] || 'Total';
  const num = fn === 'count' ? '4' : '1,842.40';
  const writeBack = params?.mode === 'writeBack';
  return (
    <Frame>
      <div style={{ fontSize: 11, color: '#bbb', marginBottom: 6 }}>
        {[['Airfare', '684.00'], ['Lodging', '840.00'], ['Meals', '78.40'], ['Transport', '240.00']].map(([n, a], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{n}</span>
            <span>{a}</span>
          </div>
        ))}
      </div>
      {writeBack ? (
        <div style={{ fontSize: 11, color: T.sub }}>🧮 {title} → amount = {(params?.prefix || '') + num}</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 12px', background: T.card, borderRadius: 8, border: '1px solid ' + T.border }}>
          <span style={{ fontSize: 12, color: T.sub, fontWeight: 500, marginRight: 10 }}>{title}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.primary }}>{(params?.prefix || '') + num + (params?.suffix ? ' ' + params.suffix : '')}</span>
        </div>
      )}
    </Frame>
  );
};

const FunnelStagesPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '8px 12px' }}>
        {[['Lead', 100, 100], ['Qualified', 64, 64], ['Won', 28, 28]].map(([l, c, w], i) => (
          <div key={i} style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: T.sub }}>{l}</span>
              <b style={{ color: T.text }}>{c}</b>
            </div>
            <div style={{ height: 10, borderRadius: 5, width: `${w}%`, background: T.primary, opacity: 0.85, margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </Frame>
  );
};

const DueSoonPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, borderRadius: 10, border: '1px solid ' + T.border, padding: '4px 10px' }}>
        {[['合同续约 — ACME', '6/15', '5d', 'red'], ['应收账款 #88', '6/22', '12d', 'orange'], ['保险到期 — 货车A', '7/05', '25d', 'blue']].map(([t, d, left, c], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: 11, padding: '4px 0', borderBottom: i < 2 ? '1px solid ' + T.border : 'none' }}>
            <span style={{ flex: 1, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t}</span>
            <span style={{ color: T.sub, margin: '0 6px' }}>{d}</span>
            <Tag color={c as string} style={{ margin: 0, fontSize: 10, lineHeight: '14px' }}>{left}</Tag>
          </div>
        ))}
      </div>
    </Frame>
  );
};

// ── style-rich (appslib-distilled) ──────────────────────────────────────────

const HeroBannerPreview: React.FC<PreviewProps> = ({ params }) => {
  const bg = params?.customGradient
    ? `linear-gradient(135deg,${params?.customFrom || '#4f46e5'},${params?.customTo || '#9333ea'})`
    : resolveThemeTokens(params?.theme).gradient;
  return (
  <Frame>
    <div style={{ background: bg, borderRadius: 10, padding: '14px 16px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ fontSize: 15, fontWeight: 700 }}>{params?.title || 'Q3 Sales Hub'}</div>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 3 }}>{params?.subtitle || 'Track pipeline & targets in one place'}</div>
      <span style={{ position: 'absolute', right: 12, top: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>128</span>
    </div>
  </Frame>
  );
};

const StatusStepsPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          {[['报价', true], ['审批', true], ['发货', false], ['完成', false]].map(([t, done], i) => (
            <React.Fragment key={i}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: done ? T.primary : T.bg, border: done ? 'none' : '1px solid ' + T.border, color: done ? '#fff' : T.sub, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done ? '✓' : i + 1}
                </span>
                <span style={{ color: done ? T.text : T.sub }}>{t}</span>
              </span>
              {i < 3 ? <span style={{ flex: 1, height: 1, background: i < 1 ? T.primary : T.border, minWidth: 12 }} /> : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    </Frame>
  );
};

const TimelineFeedPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const items: [string, string, string, string][] = [
    ['C', T.primary, 'Call · 2h ago', '约好下周复访'],
    ['M', '#52c41a', 'Mail · 1d ago', '已发报价单 V2'],
    ['N', '#722ed1', 'Note · 3d ago', '客户关注数据安全'],
  ];
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px 2px' }}>
        {items.map(([g, c, meta, txt], i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: c, color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{g}</span>
              {i < 2 ? <span style={{ flex: 1, width: 2, background: T.border, minHeight: 6 }} /> : null}
            </div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontSize: 9, color: T.sub }}>{meta}</div>
              <div style={{ fontSize: 11, color: T.text }}>{txt}</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const MatrixHeatmapPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 2, margin: '0 auto' }}>
          <tbody>
            {[['销售', [9, 4, 1]], ['售后', [3, 7, 2]], ['市场', [1, 2, 6]]].map(([row, vals]: any, i) => (
              <tr key={i}>
                <td style={{ fontSize: 10, fontWeight: 600, color: T.sub, paddingRight: 6 }}>{row}</td>
                {vals.map((v: number, j: number) => (
                  <td key={j}>
                    <div style={{ background: `rgb(${205 - v * 18},${235 - v * 18},255)`, color: v > 5 ? '#fff' : '#555', borderRadius: 4, width: 34, padding: '5px 0', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>{v}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
};

const DonutChartPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const parts = [
    { c: T.primary, f: 0.45 },
    { c: '#52c41a', f: 0.3 },
    { c: '#faad14', f: 0.25 },
  ];
  const R = 26, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 70, height: 70 }}>
            <svg width="70" height="70">
              {parts.map((p2, i) => {
                const el = (
                  <circle key={i} cx="35" cy="35" r={R} fill="none" stroke={p2.c} strokeWidth="11"
                    strokeDasharray={`${p2.f * C} ${C}`} strokeDashoffset={-off * C} transform="rotate(-90 35 35)" />
                );
                off += p2.f;
                return el;
              })}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, color: T.text }}>86</div>
          </div>
          <div style={{ fontSize: 11 }}>
            {[['赢单', '45%', T.primary], ['跟进', '30%', '#52c41a'], ['流失', '25%', '#faad14']].map(([l, v, c], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c as string }} />
                <span style={{ color: T.sub }}>{l}</span>
                <b style={{ color: T.text }}>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
};

const CalendarHeatmapPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const colors = [T.card, '#c9eccd', '#8fd694', '#4caf50', '#1b7a2f'];
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {Array.from({ length: 14 }).map((_, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 7 }).map((_, ri) => {
                const v = (ci * 7 + ri * 3) % 5;
                return <span key={ri} style={{ width: 9, height: 9, borderRadius: 2, background: colors[v] }} />;
              })}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: T.sub, marginTop: 6 }}>last 14 weeks</div>
      </div>
    </Frame>
  );
};

const CommentFeedPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const items: [string, string, string, string][] = [
    ['王', T.primary, '王建国 · 2h ago', '客户确认下周到访,准备演示环境'],
    ['李', '#52c41a', '李娜 · 1d ago', '报价单已发,等待回复'],
  ];
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: '8px 10px 1px' }}>
        {items.map(([a, c, meta, txt], i) => (
          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{a}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: T.sub }}>{meta}</div>
              <div style={{ background: T.card, borderRadius: '2px 8px 8px 8px', padding: '4px 8px', fontSize: 11, marginTop: 2, color: T.text }}>{txt}</div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const PhonePreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const P = PHONE_PLATFORMS[params?.platform || 'x'] || PHONE_PLATFORMS.x;
  const tagColor = P.color === '#000000' ? '#0a66c2' : P.color;
  return (
    <Frame>
      <div style={{ width: 158, margin: '0 auto', background: '#000', borderRadius: 22, padding: 5 }}>
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', position: 'relative', paddingBottom: 4 }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 56, height: 11, background: '#000', borderRadius: '0 0 8px 8px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '15px 8px 5px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: T.gradient, color: '#fff', fontSize: 9, fontWeight: 700, display: 'grid', placeItems: 'center', flexShrink: 0 }}>N</span>
            <span style={{ fontSize: 8.5, fontWeight: 700, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Northbeam</span>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: P.color, color: '#fff', fontSize: 5, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{P.glyph}</span>
          </div>
          <div style={{ padding: '5px 8px', fontSize: 8, lineHeight: 1.45, color: 'rgba(0,0,0,0.8)' }}>
            Golden hour at the studio 🌇 <span style={{ color: tagColor, fontWeight: 600 }}>#design</span>
            <div style={{ marginTop: 4, borderRadius: 5, height: 34, background: 'linear-gradient(135deg,#fdeff5,#e6f0ff)', display: 'grid', placeItems: 'center', fontSize: 11, color: '#c0c8d4' }}>🖼️</div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '4px 8px 2px', borderTop: '1px solid #f0f0f0', color: 'rgba(0,0,0,0.45)', fontSize: 6.5 }}>
            {P.acts.slice(0, 3).map((a, i) => <span key={i}>{a}</span>)}
          </div>
        </div>
      </div>
    </Frame>
  );
};

// ── linkage + filter blocks ─────────────────────────────────────────────────

const LinkedListPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, overflow: 'hidden' }}>
          {[['ACME', true], ['Globex', false], ['Initech', false]].map(([n, a], i) => (
            <div key={i} style={{ padding: '4px 8px', fontSize: 11, borderLeft: a ? '3px solid ' + T.primary : '3px solid transparent', background: a ? T.card : 'transparent', color: a ? T.primary : T.text, fontWeight: a ? 700 : 400 }}>
              {n as string}{a ? ' ✓' : ''}
            </div>
          ))}
        </div>
        <div style={{ flex: 1.2, background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: 6 }}>
          <div style={{ fontSize: 9, color: T.sub, marginBottom: 4 }}>orders · filtered → ACME</div>
          {[1, 2].map((i) => (
            <div key={i} style={{ height: 10, background: T.card, borderRadius: 3, marginBottom: 4 }} />
          ))}
        </div>
      </div>
    </Frame>
  );
};

const ClickDistributionPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const pills = params?.display === 'pills';
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: 8 }}>
        {pills ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['Won · 12', true], ['Open · 28', false], ['Lost · 7', false]].map(([t, a], i) => (
              <span key={i} style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 12, background: a ? T.primary : T.card, color: a ? '#fff' : T.text, border: '1px solid ' + (a ? T.primary : T.border), fontWeight: a ? 600 : 400 }}>{t as string}</span>
            ))}
          </div>
        ) : (
          [['Won ✓', 12, 1], ['Open', 28, 0.45], ['Lost', 7, 0.45]].map(([l, n, op], i) => (
            <div key={i} style={{ marginBottom: 5, opacity: op as number }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                <span style={{ color: i === 0 ? T.primary : T.sub, fontWeight: i === 0 ? 700 : 400 }}>{l as string}</span>
                <b style={{ color: T.text }}>{n as number}</b>
              </div>
              <div style={{ background: T.card, borderRadius: 3, height: 6 }}>
                <div style={{ width: ((n as number) / 28) * 100 + '%', height: '100%', background: T.primary, borderRadius: 3 }} />
              </div>
            </div>
          ))
        )}
        <div style={{ fontSize: 9, color: T.sub, marginTop: 4 }}>🎯 click → target blocks filter</div>
      </div>
    </Frame>
  );
};

const FacetFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  const box = (on: boolean) => (
    <span style={{ width: 11, height: 11, borderRadius: 3, display: 'inline-grid', placeItems: 'center', border: '1.5px solid ' + (on ? T.primary : T.border), background: on ? T.primary : T.bg, color: '#fff', fontSize: 7, fontWeight: 800, marginRight: 5 }}>{on ? '✓' : ''}</span>
  );
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: 8, fontSize: 10.5 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, color: T.sub, marginBottom: 3 }}>STATUS</div>
        <div style={{ color: T.text, fontWeight: 600 }}>{box(true)}Active · 24</div>
        <div style={{ color: T.sub }}>{box(false)}Paused · 9</div>
        <div style={{ fontSize: 8.5, fontWeight: 700, color: T.sub, margin: '6px 0 3px' }}>LEVEL</div>
        <div style={{ color: T.text, fontWeight: 600 }}>{box(true)}A · 11</div>
        <div style={{ color: T.sub }}>{box(false)}B · 17</div>
      </div>
    </Frame>
  );
};

const SegmentedFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ display: 'inline-flex', padding: 3, background: T.card, borderRadius: 8, border: '1px solid ' + T.border, gap: 2 }}>
        {[['All', false], ['Open', true], ['Won', false], ['Lost', false]].map(([t, a], i) => (
          <span key={i} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, background: a ? T.bg : 'transparent', color: a ? T.primary : T.sub, fontWeight: a ? 700 : 400, boxShadow: a ? '0 1px 3px rgba(0,0,0,0.12)' : 'none' }}>{t as string}</span>
        ))}
      </div>
    </Frame>
  );
};

const DateRangeFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['All', false], ['Today', false], ['7 days', true], ['30 days', false]].map(([t, a], i) => (
          <span key={i} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 12, border: '1px solid ' + (a ? T.primary : T.border), background: a ? T.primary : T.bg, color: a ? '#fff' : T.sub, fontWeight: a ? 600 : 400 }}>{t as string}</span>
        ))}
      </div>
    </Frame>
  );
};

const SearchFilterPreview: React.FC<PreviewProps> = ({ params }) => {
  const T = resolveThemeTokens(params?.theme);
  return (
    <Frame>
      <div style={{ background: T.bg, border: '1px solid ' + T.border, borderRadius: 6, padding: '5px 10px', fontSize: 11.5, color: T.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
        🔍 <span>install guide…</span>
      </div>
      <div style={{ fontSize: 9, color: T.sub, marginTop: 6 }}>matches name / title / notes on target blocks</div>
    </Frame>
  );
};

export const previews: Record<string, React.FC> = {
  // blocks (page)
  kpiStat: KpiPreview,
  card: CardPreview,
  distribution: DistributionPreview,
  progressGoal: ProgressGoalPreview,
  recentList: RecentListPreview,
  noticeBanner: NoticeBannerPreview,
  leaderboard: LeaderboardPreview,
  // blocks (popup)
  recordSummary: RecordSummaryPreview,
  relatedList: RelatedListPreview,
  relatedCount: RelatedCountPreview,
  // custom (SQL / JS)
  sqlBlock: SqlBlockPreview,
  jsFree: JsFreePreview,
  // style-rich
  heroBanner: HeroBannerPreview,
  donutChart: DonutChartPreview,
  calendarHeatmap: CalendarHeatmapPreview,
  phonePreview: PhonePreview,
  commentFeed: CommentFeedPreview,
  statusSteps: StatusStepsPreview,
  timelineFeed: TimelineFeedPreview,
  matrixHeatmap: MatrixHeatmapPreview,
  // form linkage + industry
  formToggleBlocks: FormToggleBlocksPreview,
  formDrivenFilter: FormDrivenFilterPreview,
  formAutoFill: FormAutoFillPreview,
  formSubtotal: FormSubtotalPreview,
  funnelStages: FunnelStagesPreview,
  dueSoon: DueSoonPreview,
  // filters
  pillFilter: PillFilterPreview,
  treeFilter: TreeFilterPreview,
  // actions
  linkedList: LinkedListPreview,
  clickDistribution: ClickDistributionPreview,
  facetFilter: FacetFilterPreview,
  segmentedFilter: SegmentedFilterPreview,
  dateRangeFilter: DateRangeFilterPreview,
  searchFilter: SearchFilterPreview,
  quickFilter: QuickFilterPreview,
  autoRefresh: AutoRefreshPreview,
  rowPrint: RowPrintPreview,
  rowOpenRelated: RowOpenRelatedPreview,
  exportCsv: ExportCsvPreview,
  // form items
  formCalc: FormCalcPreview,
  formConcat: FormConcatPreview,
  charCounter: CharCounterPreview,
  copyFromField: CopyFromFieldPreview,
  // columns
  comboText: ComboTextPreview,
  relativeTime: RelativeTimePreview,
  avatarText: AvatarTextPreview,
  highlightNumber: HighlightNumberPreview,
  progressBar: ProgressBarPreview,
  ratingDots: RatingDotsPreview,
};

/**
 * Template families can register / override their gallery previews from their
 * own files (side-effect import next to the template definition) — adding a
 * new family never touches this core file. Lookup is `previews[template.key]`
 * at render time, so late registration is fine.
 */
export function registerPreview(key: string, fc: React.FC<PreviewProps>) {
  previews[key] = fc as React.FC;
}

export const FallbackPreview: React.FC<{ icon?: string }> = ({ icon }) => (
  <Frame>
    <div style={{ textAlign: 'center', fontSize: 34 }}>{icon || '🧩'}</div>
  </Frame>
);
