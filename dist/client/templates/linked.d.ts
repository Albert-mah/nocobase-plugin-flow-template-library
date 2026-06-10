import { Template } from '../core/types';
/**
 * Cross-block linkage family — clicking INSIDE these components filters other
 * data blocks on the page (master→detail, click-a-segment-to-drill…).
 * appslib pattern: addFilterGroup per source + "All" to clear.
 */
/** 点选列表联动 — a master list; clicking a row filters target blocks to it */
export declare const linkedList: Template;
/** 点击分布联动 — enum counts as bars/pills; clicking toggles a filter on targets */
export declare const clickDistribution: Template;
