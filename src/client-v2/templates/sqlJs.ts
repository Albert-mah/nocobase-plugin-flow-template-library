import { Template } from '../core/types';

/**
 * SQL 区块 — write SQL, see live results while configuring (flowSql:run), and
 * on save the SQL is registered via flowSql:save so the generated code runs it
 * with ctx.sql.runById — which is allowed for any logged-in user (plain
 * flowSql:run would 403 for non-admins).
 */
export const sqlBlock: Template = {
  key: 'sqlBlock',
  scope: 'any',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'SQL block',
  description: 'Write SQL, render the result as a table or a single value',
  icon: '🗄️',
  category: 'Custom',
  scenes: ['Dashboard'],
  sort: 950,
  params: [
    {
      name: 'sql',
      type: 'code',
      label: 'SQL (SELECT only)',
      required: true,
      default: 'SELECT 1 AS hello',
      hint: 'e.g. SELECT status, count(*) AS total FROM orders GROUP BY status',
    },
    {
      name: 'display',
      type: 'select',
      label: 'Display as',
      default: 'table',
      options: [
        { label: 'Table', value: 'table' },
        { label: 'Single value (first cell)', value: 'value' },
      ],
    },
    { name: 'label', type: 'text', label: 'Title' },
  ],
  onSave: async (ctx: any, params: Record<string, any>) => {
    // auto-wrap: register the SQL template so the page code can use runById
    const sqlUid = 'jstpl_' + ctx.model.uid;
    await ctx.api.request({
      url: 'flowSql:save',
      method: 'post',
      data: { uid: sqlUid, sql: params.sql, dataSourceKey: 'main' },
    });
    return { sqlUid };
  },
  body: `
const { Statistic, Empty, Spin } = ctx.antd;
const { useState, useEffect } = ctx.React;

function SqlBlock() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        // configurators keep the registered SQL in sync after manual edits
        if (ctx.flowSettingsEnabled && ctx.sql && ctx.sql.save) {
          try { await ctx.sql.save({ uid: $p.sqlUid, sql: $p.sql, dataSourceKey: 'main' }); } catch (e) {}
        }
        const data = await ctx.sql.runById($p.sqlUid, { type: 'selectRows' });
        setRows(Array.isArray(data) ? data : (data ? [data] : []));
      } catch (e) {
        setErr((e && e.message) || 'SQL failed');
      }
    })();
  }, []);

  if (err) return <div style={{ padding: 12, color: '#cf1322', fontSize: 12 }}>{err}</div>;
  if (rows == null) return <div style={{ padding: 12 }}><Spin /></div>;
  if (!rows.length) return <Empty description="No rows" />;

  if ($p.display === 'value') {
    const first = rows[0] || {};
    const k = Object.keys(first)[0];
    return (
      <div style={{ padding: '8px 12px' }}>
        <Statistic title={$p.label || k} value={first[k]} valueStyle={{ fontSize: 26 }} />
      </div>
    );
  }

  const cols = Object.keys(rows[0]);
  return (
    <div style={{ padding: '8px 12px', overflowX: 'auto' }}>
      {$p.label ? <div style={{ fontWeight: 600, marginBottom: 8 }}>{$p.label}</div> : null}
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(function (c) {
              return <th key={c} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #f0f0f0', color: '#888', fontWeight: 500 }}>{c}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(function (r, i) {
            return (
              <tr key={i}>
                {cols.map(function (c) {
                  const v = r[c];
                  return <td key={c} style={{ padding: '6px 10px', borderBottom: '1px solid #f5f5f5' }}>{v == null ? '—' : String(v)}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

ctx.render(<SqlBlock />);
`,
};

/**
 * JS 自由区块 — start from a working skeleton, code is inserted verbatim into
 * the native JS slot (editable later via the gear menu's JavaScript settings).
 * No live preview in the drawer (the sandbox only exists on the page).
 */
export const jsFree: Template = {
  key: 'jsFree',
  scope: 'any',
  kind: 'block',
  alsoKinds: ['item'],
  label: 'Custom JS',
  description: 'Free-form JavaScript — starts from a working skeleton',
  icon: '✨',
  category: 'Custom',
  scenes: ['Dashboard', 'Popup'],
  sort: 960,
  rawCode: true,
  params: [
    {
      name: 'code',
      type: 'code',
      label: 'JavaScript (JSX supported)',
      required: true,
      default: `const { Card } = ctx.antd;
const { useState, useEffect } = ctx.React;

function MyBlock() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      // ctx.initResource('MultiRecordResource');
      // ctx.resource.setResourceName('your_collection');
      // await ctx.resource.refresh();
      // setRows(ctx.resource.getData() || []);
    })();
  }, []);

  return (
    <Card size="small" title="Custom JS block">
      Edit me — {rows.length} rows loaded.
    </Card>
  );
}

ctx.render(<MyBlock />);`,
      hint: 'Runs in the page sandbox: ctx.api / ctx.resource / ctx.render / ctx.antd / ctx.React',
    },
  ],
  body: '/* unused — rawCode */',
};
