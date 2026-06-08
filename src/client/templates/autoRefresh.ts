import { Template } from '../core/types';

/**
 * 自动刷新开关 — a Switch in the toolbar that periodically refreshes a table
 * block. The timer lives on ctx.engine so it survives remounts (SES-safe).
 */
export const autoRefresh: Template = {
  key: 'autoRefresh',
  kind: 'action',
  label: 'Auto-refresh toggle',
  description: 'A switch that periodically refreshes a table block',
  icon: '⏱️',
  sort: 815,
  params: [
    { name: 'targetUid', type: 'targetBlock', label: 'Table block to refresh (optional)' },
    { name: 'intervalSeconds', type: 'number', label: 'Interval (seconds)', default: 10 },
    { name: 'label', type: 'text', label: 'Label', default: 'Auto refresh' },
  ],
  body: `
const { Switch } = ctx.antd;
const { useState } = ctx.React;
const KEY = '__jsTplAutoRefresh_' + (ctx.model && ctx.model.uid);

function targetResource() {
  const t = $p.targetUid ? ctx.getModel($p.targetUid) : null;
  return (t && t.resource) || ctx.resource;
}

function Toggle() {
  const [on, setOn] = useState(!!(ctx.engine && ctx.engine[KEY]));
  const flip = function (checked) {
    if (ctx.engine && ctx.engine[KEY]) { clearInterval(ctx.engine[KEY]); ctx.engine[KEY] = null; }
    if (checked) {
      const ms = Math.max(2, Number($p.intervalSeconds) || 10) * 1000;
      ctx.engine[KEY] = setInterval(function () {
        const r = targetResource();
        if (r && r.refresh) r.refresh();
      }, ms);
    }
    setOn(checked);
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Switch size="small" checked={on} onChange={flip} />
      <span>{$p.label || 'Auto refresh'}</span>
    </span>
  );
}

ctx.render(<Toggle />);
`,
};
