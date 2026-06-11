import { Template } from '../core/types';
// existing single-file templates
import { autoRefresh } from './autoRefresh';
import { card } from './card';
import { formCalc } from './formCalc';
import { kpiStat } from './kpiStat';
import { rowPrint } from './rowPrint';
// page-level data blocks
import { distribution, leaderboard, noticeBanner, progressGoal, recentList } from './pageBlocks';
// popup-context blocks
import { recordSummary, relatedCount, relatedList } from './popupBlocks';
// row/toolbar actions + form items
import { charCounter, copyFromField, exportCsv, formConcat, quickFilter, rowOpenRelated } from './formAndActions';
// filter family
import { conditionCards, conditionMenu, customFilter, pillFilter, treeFilter } from './filters';

import { dateRangeFilter, facetFilter, searchFilter, segmentedFilter } from './filterBlocks';

import { clickDistribution, linkedList } from './linked';
// form linkage (watch form values → drive other parts)
import { formAutoFill, formDrivenFilter, formSubtotal, formToggleBlocks } from './formLinkage';
// style-rich (distilled from appslib visual patterns)
import { calendarHeatmap, commentFeed, donutChart, heroBanner, matrixHeatmap, statusSteps, timelineFeed } from './styled';
// industry mini-tools
import { dueSoon, funnelStages } from './industry';

import { phonePreview } from './phone';
// free-form SQL / JS
import { jsFree, sqlBlock } from './sqlJs';
// table column renderers
import { avatarText, comboText, highlightNumber, progressBar, ratingDots, relativeTime } from './columns';

/**
 * The template library. To add a template: author it (anywhere under templates/)
 * and add it to this array — the gallery for its `kind` picks it up automatically.
 *
 *   block  → add-block menu (page + popup)   (JSBlockModel)
 *   action → table row / toolbar menu         (JSItemActionModel)
 *   item   → form add-item menu               (JSItemModel)
 *   column → table add-column menu            (JSColumnModel)
 *
 * Curation rule: only ship templates that beat the native equivalent — e.g. no
 * plain "refresh" button (the native toolbar has one) and no "update record"
 * action (native Update record action covers it).
 */
export const templates: Template[] = [
  // ── blocks (page · Dashboard) ──
  card,
  kpiStat,
  distribution,
  progressGoal,
  recentList,
  noticeBanner,
  leaderboard,
  // ── blocks (popup · Detail, read current record) ──
  recordSummary,
  relatedList,
  relatedCount,
  // ── filters ──
  quickFilter,
  pillFilter,
  customFilter,
  conditionCards,
  conditionMenu,
  treeFilter,
  facetFilter,
  segmentedFilter,
  dateRangeFilter,
  searchFilter,
  // ── cross-block linkage ──
  linkedList,
  clickDistribution,
  // ── custom (SQL / JS) ──
  sqlBlock,
  jsFree,
  // ── actions (row + toolbar · List) ──
  autoRefresh,
  rowPrint,
  rowOpenRelated,
  exportCsv,
  // ── style-rich (appslib-distilled) ──
  heroBanner,
  statusSteps,
  timelineFeed,
  commentFeed,
  matrixHeatmap,
  donutChart,
  calendarHeatmap,
  phonePreview,
  // ── industry mini-tools ──
  funnelStages,
  dueSoon,
  // ── form linkage ──
  formToggleBlocks,
  formDrivenFilter,
  formAutoFill,
  formSubtotal,
  // ── form items (Form) ──
  formCalc,
  formConcat,
  charCounter,
  copyFromField,
  // ── table columns ──
  comboText,
  relativeTime,
  avatarText,
  highlightNumber,
  progressBar,
  ratingDots,
];
