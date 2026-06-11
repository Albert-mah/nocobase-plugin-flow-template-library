import { ParamSpec } from '../core/types';

/**
 * Shared "where does the number come from" machinery for every template that
 * displays a computed value (KPI card, banner badge, progress-goal current…).
 *
 * Three sources:
 *  - aggregate — collection + count/sum/avg/max/min over a numeric field
 *  - sql       — SELECT whose first cell is the value; registered via
 *                flowSql:save on save → runtime uses ctx.sql.runById (works
 *                for any logged-in user); preview has a manual ▶ Test
 *  - js        — async JS snippet that `return`s the number (ctx available)
 */

export const valueSourceParams = (opts?: { optional?: boolean }): ParamSpec[] => [
  {
    name: 'valueSource',
    type: 'select',
    label: 'Value source',
    default: opts?.optional ? 'none' : 'aggregate',
    options: [
      ...(opts?.optional ? [{ label: 'None', value: 'none' }] : []),
      { label: 'Aggregate a collection', value: 'aggregate' },
      { label: 'SQL (first cell of the result)', value: 'sql' },
      { label: 'JS (return a number)', value: 'js' },
    ],
  },
  {
    name: 'collection',
    type: 'collection',
    label: 'Data collection',
    showWhen: (p) => (p.valueSource || 'aggregate') === 'aggregate',
  },
  {
    name: 'fn',
    type: 'select',
    label: 'Aggregate',
    default: 'count',
    options: [
      { label: 'count (rows)', value: 'count' },
      { label: 'sum', value: 'sum' },
      { label: 'average', value: 'avg' },
      { label: 'max', value: 'max' },
      { label: 'min', value: 'min' },
    ],
    showWhen: (p) => (p.valueSource || 'aggregate') === 'aggregate',
  },
  {
    name: 'field',
    type: 'field',
    label: 'Number field',
    collectionFrom: 'collection',
    accepts: 'numeric',
    hint: 'The numeric field to aggregate.',
    showWhen: (p) => (p.valueSource || 'aggregate') === 'aggregate' && p.fn && p.fn !== 'count',
  },
  {
    name: 'sql',
    type: 'code',
    testRun: 'sql',
    label: 'SQL (SELECT only)',
    default: 'SELECT count(*) AS value FROM users',
    hint: 'First cell of the first row is the value',
    showWhen: (p) => p.valueSource === 'sql',
  },
  {
    name: 'jsExpr',
    type: 'code',
    testRun: 'js',
    label: 'JS (must return the value)',
    default:
      "const res = await ctx.api.request({ url: 'users:list', params: { pageSize: 1 } });\nreturn res.data.meta.count;",
    hint: 'Async JS with ctx available (ctx.api / ctx.sql …) — return the number',
    showWhen: (p) => p.valueSource === 'js',
  },
];

/** registers SQL-sourced values via flowSql:save so runtime can use runById */
export async function valueSourceOnSave(ctx: any, params: Record<string, any>) {
  if (params.valueSource === 'sql' && params.sql) {
    const sqlUid = 'jstpl_' + ctx.model.uid;
    await ctx.api.request({
      url: 'flowSql:save',
      method: 'post',
      data: { uid: sqlUid, sql: params.sql, dataSourceKey: 'main' },
    });
    return { sqlUid };
  }
  return {};
}

/** body snippet: async __resolveValue() → number | null, honoring $p.valueSource */
export const RESOLVE_VALUE_SNIPPET = `
async function __resolveValue() {
  const src = $p.valueSource || 'aggregate';
  if (src === 'none') return null;
  if (src === 'sql') {
    if (!$p.sqlUid) return null;
    // configurators keep the registered SQL in sync after manual edits
    if (ctx.flowSettingsEnabled && ctx.sql && ctx.sql.save) {
      try { await ctx.sql.save({ uid: $p.sqlUid, sql: $p.sql, dataSourceKey: 'main' }); } catch (e) {}
    }
    const data = await ctx.sql.runById($p.sqlUid, { type: 'selectRows' });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && typeof row === 'object') { const k = Object.keys(row)[0]; return Number(row[k]); }
    return row == null ? null : Number(row);
  }
  if (src === 'js') {
    const fn = new Function('ctx', 'return (async function () {\\n' + ($p.jsExpr || 'return null;') + '\\n})()');
    const v = await fn(ctx);
    return v == null ? null : Number(v);
  }
  // aggregate
  if (!$p.collection) return null;
  ctx.initResource('MultiRecordResource');
  ctx.resource.setResourceName($p.collection);
  ctx.resource.setPageSize(!$p.fn || $p.fn === 'count' ? 1 : 500); // sum/avg over up to 500 rows
  await ctx.resource.refresh();
  const meta = ctx.resource.getMeta ? ctx.resource.getMeta() : {};
  const rows = ctx.resource.getData() || [];
  if (!$p.fn || $p.fn === 'count') return meta && meta.count != null ? meta.count : rows.length;
  const nums = rows.map(function (r) { return Number(r[$p.field]); }).filter(function (n) { return !isNaN(n); });
  if (!nums.length) return 0;
  if ($p.fn === 'sum') return nums.reduce(function (a, b) { return a + b; }, 0);
  if ($p.fn === 'avg') return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  if ($p.fn === 'max') return Math.max.apply(null, nums);
  if ($p.fn === 'min') return Math.min.apply(null, nums);
  return null;
}
`;
