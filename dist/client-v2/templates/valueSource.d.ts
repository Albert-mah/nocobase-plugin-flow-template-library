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
export declare const valueSourceParams: (opts?: {
    optional?: boolean;
}) => ParamSpec[];
/** registers SQL-sourced values via flowSql:save so runtime can use runById */
export declare function valueSourceOnSave(ctx: any, params: Record<string, any>): Promise<{
    sqlUid: string;
} | {
    sqlUid?: undefined;
}>;
/** body snippet: async __resolveValue() → number | null, honoring $p.valueSource */
export declare const RESOLVE_VALUE_SNIPPET = "\nasync function __resolveValue() {\n  const src = $p.valueSource || 'aggregate';\n  if (src === 'none') return null;\n  if (src === 'sql') {\n    if (!$p.sqlUid) return null;\n    // configurators keep the registered SQL in sync after manual edits\n    if (ctx.flowSettingsEnabled && ctx.sql && ctx.sql.save) {\n      try { await ctx.sql.save({ uid: $p.sqlUid, sql: $p.sql, dataSourceKey: 'main' }); } catch (e) {}\n    }\n    const data = await ctx.sql.runById($p.sqlUid, { type: 'selectRows' });\n    const row = Array.isArray(data) ? data[0] : data;\n    if (row && typeof row === 'object') { const k = Object.keys(row)[0]; return Number(row[k]); }\n    return row == null ? null : Number(row);\n  }\n  if (src === 'js') {\n    const fn = new Function('ctx', 'return (async function () {\\n' + ($p.jsExpr || 'return null;') + '\\n})()');\n    const v = await fn(ctx);\n    return v == null ? null : Number(v);\n  }\n  // aggregate\n  if (!$p.collection) return null;\n  ctx.initResource('MultiRecordResource');\n  ctx.resource.setResourceName($p.collection);\n  ctx.resource.setPageSize(!$p.fn || $p.fn === 'count' ? 1 : 500); // sum/avg over up to 500 rows\n  await ctx.resource.refresh();\n  const meta = ctx.resource.getMeta ? ctx.resource.getMeta() : {};\n  const rows = ctx.resource.getData() || [];\n  if (!$p.fn || $p.fn === 'count') return meta && meta.count != null ? meta.count : rows.length;\n  const nums = rows.map(function (r) { return Number(r[$p.field]); }).filter(function (n) { return !isNaN(n); });\n  if (!nums.length) return 0;\n  if ($p.fn === 'sum') return nums.reduce(function (a, b) { return a + b; }, 0);\n  if ($p.fn === 'avg') return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;\n  if ($p.fn === 'max') return Math.max.apply(null, nums);\n  if ($p.fn === 'min') return Math.min.apply(null, nums);\n  return null;\n}\n";
