import { Template } from '../core/types';
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
export declare const templates: Template[];
