import { Template } from '../core/types';
/**
 * SQL 区块 — write SQL, see live results while configuring (flowSql:run), and
 * on save the SQL is registered via flowSql:save so the generated code runs it
 * with ctx.sql.runById — which is allowed for any logged-in user (plain
 * flowSql:run would 403 for non-admins).
 */
export declare const sqlBlock: Template;
/**
 * JS 自由区块 — start from a working skeleton, code is inserted verbatim into
 * the native JS slot (editable later via the gear menu's JavaScript settings).
 * No live preview in the drawer (the sandbox only exists on the page).
 */
export declare const jsFree: Template;
