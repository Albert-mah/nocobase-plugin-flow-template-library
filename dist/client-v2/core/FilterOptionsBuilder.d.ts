import React from 'react';
/**
 * Build named filter options for the "Custom filter group" component. Each
 * option = a label + ONE of three condition modes, compiled / resolved to a
 * native NocoBase filter JSON applied at runtime via resource.addFilterGroup:
 *
 *  - builder : the NATIVE Data Scope editor (FilterGroup + VariableFilterItem)
 *              — field tree with relation paths, per-interface operators,
 *              variables ({{ ctx.user.x }} …), nested AND/OR groups. Stored in
 *              the native { logic, items } shape and compiled with
 *              transformFilter + pruneFilter (variables resolved at runtime
 *              via ctx.resolveJsonTemplate).
 *  - sql     : a SELECT returning the matching rows' id column. ▶ Test registers
 *              it (flowSql:save, per-option stable uid) and previews; runtime
 *              uses ctx.sql.runById → ids → { <idField>: { $in: ids } }.
 *  - js      : JS that returns a native filter JSON (or an id array); evaluated
 *              at runtime with `new Function('ctx', …)`.
 *
 * value shape (per option):
 *   { label, mode, group, sql, sqlUid, idField, js, filter }
 *   legacy options carry `nodes`/`conditions` (the old hand-rolled tree) —
 *   migrated to the native `group` shape on edit and still honored at runtime
 *   via the previously-compiled `filter`.
 */
type LegacyCond = {
    field?: string;
    op?: string;
    value?: any;
};
type LegacyNode = {
    t: 'c';
    c: LegacyCond;
} | {
    t: 'g';
    conj: '$and' | '$or';
    nodes: LegacyNode[];
};
export type FilterGroupValue = {
    logic: '$and' | '$or';
    items: any[];
};
export type FilterOption = {
    label: string;
    mode?: 'builder' | 'sql' | 'js';
    group?: FilterGroupValue;
    conj?: '$and' | '$or';
    nodes?: LegacyNode[];
    conditions?: LegacyCond[];
    sql?: string;
    sqlUid?: string;
    idField?: string;
    js?: string;
    filter?: any;
};
export declare function groupOf(opt: FilterOption): FilterGroupValue;
export declare function compileFilter(opt: FilterOption): any;
export declare function FilterOptionsBuilder(props: {
    value?: FilterOption[];
    onChange?: (v: FilterOption[]) => void;
    ctx: any;
    collectionName?: string;
    api: any;
}): React.JSX.Element;
export {};
