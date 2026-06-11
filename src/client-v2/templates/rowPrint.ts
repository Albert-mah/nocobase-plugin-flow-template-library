import { Template } from '../core/types';

/**
 * 行级打印 — a row-action button that prints the current record as a simple
 * sheet, using the ctx.element.ownerDocument backdoor (the sandbox blocks
 * window.print / document.body directly).
 */
export const rowPrint: Template = {
  key: 'rowPrint',
  scope: 'record',
  kind: 'action',
  label: 'Print row',
  description: 'A row button that prints the current record',
  icon: '🖨️',
  category: 'Action',
  scenes: ['Table'],
  sort: 818,
  params: [
    { name: 'fields', type: 'fields', label: 'Fields to print (blank = all)' },
    { name: 'title', type: 'text', label: 'Print title', default: 'Record' },
    { name: 'label', type: 'text', label: 'Button text', default: 'Print' },
  ],
  body: `
const { Button } = ctx.antd;

function doPrint() {
  const rec = ctx.record || {};
  const realDoc = ctx.element && ctx.element.ownerDocument;
  if (!realDoc) { ctx.message && ctx.message.warning('Print not available in this context'); return; }
  const realWin = realDoc.defaultView;
  const fields = ($p.fields && $p.fields.length) ? $p.fields : Object.keys(rec).filter(function (k) { return k !== '__index'; });

  const esc = function (s) { return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); };
  const rowsHtml = fields.map(function (f) {
    return '<tr><td style="padding:6px 12px;color:#666;border:1px solid #eee">' + esc(f) +
      '</td><td style="padding:6px 12px;border:1px solid #eee">' + esc(rec[f]) + '</td></tr>';
  }).join('');

  const style = realDoc.createElement('style');
  style.textContent = '@media print{body.jsTplPrinting>*{display:none!important}body.jsTplPrinting>.jsTplPrintHost{display:block!important}@page{margin:14mm}}.jsTplPrintHost{display:none}';
  realDoc.head.appendChild(style);

  const host = realDoc.createElement('div');
  host.className = 'jsTplPrintHost';
  host.innerHTML = '<h2 style="font-family:sans-serif">' + esc($p.title || 'Record') +
    '</h2><table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">' + rowsHtml + '</table>';
  realDoc.body.appendChild(host);

  const cleanup = function () {
    try { realDoc.body.classList.remove('jsTplPrinting'); host.remove(); style.remove(); } catch (e) {}
  };
  realDoc.body.classList.add('jsTplPrinting');
  realWin.addEventListener('afterprint', cleanup, { once: true });
  realWin.print();
}

ctx.render(<Button type="link" onClick={doPrint}>{$p.label || 'Print'}</Button>);
`,
};
