import { Template } from '../core/types';

/**
 * KPI 统计卡片 — a big-number card aggregating a collection
 * (count / sum / avg / max / min over a chosen field).
 */
export const kpiStat: Template = {
  key: 'kpiStat',
  kind: 'block',
  label: 'KPI stat card',
  description: 'A big-number card: count / sum / avg of a collection',
  icon: '📊',
  sort: 805,
  params: [
    { name: 'collection', type: 'collection', label: 'Data collection', required: true },
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
    },
    { name: 'field', type: 'field', label: 'Number field (for sum/avg/max/min)', collectionFrom: 'collection' },
    { name: 'label', type: 'text', label: 'Card title' },
    { name: 'prefix', type: 'text', label: 'Prefix (e.g. ¥)' },
    { name: 'suffix', type: 'text', label: 'Suffix (e.g. items)' },
  ],
  body: `
const { Statistic } = ctx.antd;
const { useState, useEffect } = ctx.React;

function Kpi() {
  const [val, setVal] = useState(null);
  useEffect(function () {
    (async function () {
      try {
        ctx.initResource('MultiRecordResource');
        ctx.resource.setResourceName($p.collection);
        ctx.resource.setPageSize($p.fn === 'count' ? 1 : 500); // sum/avg over up to 500 rows
        await ctx.resource.refresh();
        const meta = ctx.resource.getMeta ? ctx.resource.getMeta() : {};
        const rows = ctx.resource.getData() || [];
        let v = 0;
        if ($p.fn === 'count') {
          v = meta && meta.count != null ? meta.count : rows.length;
        } else {
          const nums = rows.map(function (r) { return Number(r[$p.field]); }).filter(function (n) { return !isNaN(n); });
          if ($p.fn === 'sum') v = nums.reduce(function (a, b) { return a + b; }, 0);
          else if ($p.fn === 'avg') v = nums.length ? nums.reduce(function (a, b) { return a + b; }, 0) / nums.length : 0;
          else if ($p.fn === 'max') v = nums.length ? Math.max.apply(null, nums) : 0;
          else if ($p.fn === 'min') v = nums.length ? Math.min.apply(null, nums) : 0;
        }
        setVal(v);
      } catch (e) { setVal(0); }
    })();
  }, []);

  return (
    <div style={{ padding: '8px 12px' }}>
      <Statistic
        title={$p.label || $p.collection}
        value={val == null ? '—' : val}
        precision={$p.fn === 'avg' ? 2 : 0}
        prefix={$p.prefix || ''}
        suffix={$p.suffix || ''}
      />
    </div>
  );
}

ctx.render(<Kpi />);
`,
};
