import { Template } from '../core/types';

/**
 * 表单实时计算 — a form item that live-computes from other number fields in the
 * same form (sum / product / subtract / average) and re-renders on every input
 * change. Uses the documented formValuesChange subscription with de-dup.
 */
export const formCalc: Template = {
  key: 'formCalc',
  kind: 'item',
  label: 'Form calculator',
  description: 'Live sum/product of other form fields',
  icon: '🧮',
  sort: 850,
  params: [
    { name: 'fields', type: 'fields', label: 'Number fields to combine' },
    {
      name: 'op',
      type: 'select',
      label: 'Operation',
      default: 'sum',
      options: [
        { label: 'sum (+)', value: 'sum' },
        { label: 'product (×)', value: 'product' },
        { label: 'subtract (−)', value: 'subtract' },
        { label: 'average', value: 'avg' },
      ],
    },
    { name: 'label', type: 'text', label: 'Label', default: 'Result' },
    { name: 'prefix', type: 'text', label: 'Prefix (e.g. ¥)' },
    { name: 'suffix', type: 'text', label: 'Suffix' },
  ],
  body: `
function compute() {
  const vals = (ctx.form && ctx.form.getFieldsValue) ? ctx.form.getFieldsValue() : {};
  const nums = ($p.fields || []).map(function (f) { return Number(vals[f]); }).filter(function (n) { return !isNaN(n); });
  if (!nums.length) return 0;
  if ($p.op === 'product') return nums.reduce(function (a, b) { return a * b; }, 1);
  if ($p.op === 'subtract') return nums.reduce(function (a, b) { return a - b; });
  if ($p.op === 'avg') return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  return nums.reduce(function (a, b) { return a + b; }, 0); // sum
}

function render() {
  const r = Math.round(compute() * 100) / 100;
  ctx.render(
    <div style={{ padding: '4px 0' }}>
      <span style={{ color: '#888', marginRight: 8 }}>{$p.label || 'Result'}</span>
      <b style={{ fontSize: 16 }}>{($p.prefix || '') + r + ($p.suffix || '')}</b>
    </div>
  );
}

render();

// live-update on form input change (de-dup the listener across re-runs)
const bm = ctx.blockModel;
if (bm && bm.on) {
  if (bm.__jsTplCalc && bm.off) bm.off('formValuesChange', bm.__jsTplCalc);
  bm.__jsTplCalc = render;
  bm.on('formValuesChange', render);
}
`,
};
