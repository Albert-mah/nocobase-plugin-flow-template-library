import { Template } from '../core/types';

/**
 * 通用表格刷新 — a toolbar/row action button that refreshes a table block.
 * No required params: defaults to refreshing the resource of its own context;
 * optionally targets another table block on the page by uid.
 */
export const tableRefresh: Template = {
  key: 'tableRefresh',
  kind: 'action',
  label: 'Table refresh',
  description: 'A button that refreshes a table block',
  icon: '🔄',
  sort: 810,
  params: [
    { name: 'targetUid', type: 'targetBlock', label: 'Target table block (optional)' },
    { name: 'label', type: 'text', label: 'Button text', default: 'Refresh' },
  ],
  body: `
const { Button } = ctx.antd;

async function doRefresh() {
  const target = $p.targetUid ? ctx.getModel($p.targetUid) : null;
  const resource = (target && target.resource) || ctx.resource;
  if (resource && typeof resource.refresh === 'function') {
    await resource.refresh();
    ctx.message && ctx.message.success(($p.label || 'Refresh') + ' ✓');
  } else {
    ctx.message && ctx.message.warning('No table resource found to refresh');
  }
}

ctx.render(<Button type="link" onClick={doRefresh}>{$p.label || 'Refresh'}</Button>);
`,
};
