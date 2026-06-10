import { Template } from '../core/types';
/**
 * Style-rich templates distilled from appslib (14220) visual patterns —
 * business logic stripped, only the visual structure kept and parameterized.
 *
 * Each family carries a `variant` styleSelect; the original appearance is kept
 * as one variant value (default) so already-deployed blocks never change. The
 * variant thumbnails + variant-aware gallery previews are registered at the
 * bottom of this file via registerStyleThumbs / registerPreview.
 */
/** 状态步骤条 — a record's enum field rendered as progress steps */
export declare const statusSteps: Template;
/** 活动时间线 — icon-dot timeline of records (relation of current record, or a collection) */
export declare const timelineFeed: Template;
/** 矩阵热图 — row × column counts (or avg of a number field) as gradient cells */
export declare const matrixHeatmap: Template;
/** 渐变横幅 — gradient hero banner with title + optional live count */
export declare const heroBanner: Template;
/** 环形占比图 — SVG donut of a field's value distribution (option colors) */
export declare const donutChart: Template;
/** 日历热图 — GitHub-style activity density by a date field */
export declare const calendarHeatmap: Template;
/** 评论流 — avatar + bubble feed (relation of current record, or a collection) */
export declare const commentFeed: Template;
