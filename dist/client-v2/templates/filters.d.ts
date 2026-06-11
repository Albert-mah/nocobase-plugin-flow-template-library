import { Template } from '../core/types';
/**
 * 自定义筛选组 — inline bar (item / block): every option is a USER-BUILT
 * condition set (native Data Scope / SQL / JS). Clicking an option filters the
 * chosen TARGET blocks. Six visual variants + theme.
 */
export declare const customFilter: Template;
/**
 * 条件统计卡片组 — block: one card per condition set with a LIVE record count;
 * clicking a card filters the target blocks. Six visual variants + theme.
 */
export declare const conditionCards: Template;
/**
 * 条件侧边菜单 — block: a vertical menu of condition sets with count badges;
 * clicking an entry filters the target blocks. Six visual variants + theme.
 */
export declare const conditionMenu: Template;
/**
 * 按钮筛选组 — toolbar action: pill buttons (from the field's own options)
 * that filter THIS table. Selection survives remounts via ctx.model.
 */
export declare const pillFilter: Template;
/**
 * 树筛选 — standalone block: a tree of a field's options (of a TARGET block's
 * collection); clicking a node filters that target block.
 */
export declare const treeFilter: Template;
