import { Template } from '../core/types';
/**
 * Form-linkage family — JS items that LISTEN to form value changes and drive
 * other parts of the page: hide/show blocks, filter a target block (the
 * "knowledge-base search" pattern), auto-fill sibling fields, or roll up a
 * sub-table column into a live total (the crmv2 expense-claim pattern).
 *
 * Hard-won rules baked in (zheneng/appslib lessons):
 * - de-dup the formValuesChange listener across re-runs (ctx.model.__h)
 * - GATE on the watched field actually changing (ctx.model.__last) so
 *   setFieldsValue / refresh loops can't feed back into themselves
 * - hide blocks via a rendered <style> on [data-grid-item-uid] — no DOM pokes
 */
/** 表单驱动显隐 — watch a form field, hide/show a target block */
export declare const formToggleBlocks: Template;
/** 表单值驱动过滤 — the knowledge-base search pattern: form input filters a target block */
export declare const formDrivenFilter: Template;
/** 表单自动填充 — when a trigger field changes, look up a record and fill sibling fields */
export declare const formAutoFill: Template;
/** 子表字段汇总 — roll up a sub-table column into a live total (crmv2 pattern) */
export declare const formSubtotal: Template;
