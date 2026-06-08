import { Template } from '../core/types';
import { autoRefresh } from './autoRefresh';
import { card } from './card';
import { formCalc } from './formCalc';
import { kpiStat } from './kpiStat';
import { rowPrint } from './rowPrint';
import { tableRefresh } from './tableRefresh';

/**
 * The template library. To add a template, author it here and add it to this
 * array — the gallery for its `kind` picks it up automatically.
 *
 *   block  → add-block menu      (JSBlockModel)
 *   action → table/toolbar menu  (JSItemActionModel)
 *   item   → form add-item menu  (JSItemModel)
 */
export const templates: Template[] = [
  // blocks
  card,
  kpiStat,
  // actions
  tableRefresh,
  autoRefresh,
  rowPrint,
  // form items
  formCalc,
];
