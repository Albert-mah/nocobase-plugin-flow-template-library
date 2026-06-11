/**
 * The template contract — shared between phase 1 (source-defined templates) and
 * phase 2 (DB-driven templates). Keep it stable.
 */
export type ParamType = 'field' | 'fields' | 'targetBlock' | 'collection' | 'record' | 'association' | 'popupView' | 'filterOptions' | 'enumOptions' | 'fieldValue' | 'text' | 'code' | 'color' | 'theme' | 'styleSelect' | 'number' | 'select' | 'boolean';
/** semantic filter for field pickers — match by native field type/interface */
export type FieldAccepts = 'numeric' | 'enum' | 'boolean' | 'text' | 'date' | 'any';
export interface ParamSpec {
    name: string;
    type: ParamType;
    /** i18n key, shown as the form label */
    label: string;
    required?: boolean;
    default?: any;
    /** options for `select` */
    options?: {
        label: string;
        value: any;
    }[];
    /**
     * For `field` / `fields`: where the collection comes from.
     *  - undefined        → the model's bound collection (ctx.collection)
     *  - "<paramName>"    → another param of type `collection` (its value = collection name)
     *  - "target:<name>"  → another param of type `targetBlock`; resolve that block's collection
     */
    collectionFrom?: string;
    /** for `field`/`fields`: only list fields matching this semantic type */
    accepts?: FieldAccepts;
    /** for `enumOptions`/`fieldValue`: the name of the `field` param they depend on */
    fieldFrom?: string;
    /** for `styleSelect`: thumbnail registry prefix — looks up `<thumbs>.<optionValue>` in core/styleThumbs */
    thumbs?: string;
    /** for `code`: render a ▶ Test button next to the editor that runs it once (sql → flowSql:run first cell; js → new Function) */
    testRun?: 'sql' | 'js';
    /** for `targetBlock`: allow picking several blocks */
    multiple?: boolean;
    /** short hint shown under the input */
    hint?: string;
    /** only show this field when the predicate over the current params is true */
    showWhen?: (params: Record<string, any>) => boolean;
}
export type TemplateKind = 'block' | 'action' | 'item' | 'column';
export interface Template {
    /** unique; becomes the model class name suffix (JsTpl_<key>) and filter-group key */
    key: string;
    /** primary host */
    kind: TemplateKind;
    /**
     * additional hosts this template also works in — e.g. a record-summary or KPI
     * is host-agnostic (only needs ctx.render/api), so it can appear in the form
     * item gallery too. The generated code must read the current record in a
     * host-compatible way (ctx.popup → ctx.record fallback).
     */
    alsoKinds?: TemplateKind[];
    /**
     * logic-bound template (relies on host-specific ctx like ctx.form events or
     * table actions) — stays restricted to its declared kinds. Display templates
     * (default) freely interoperate across block / item / column hosts.
     */
    logicOnly?: boolean;
    /** shown as the gallery card title */
    label: string;
    /** shown as the gallery card subtitle */
    description?: string;
    /** emoji/icon shown on the gallery card */
    icon?: string;
    /** @deprecated use category + scenes */
    tags?: string[];
    /** functional category (one): Data | Stats | Filter | Action | Style | Custom */
    category?: string;
    /** where it makes sense (many): Dashboard | Popup | Table | Form */
    scenes?: string[];
    /** data context: 'record' = single object, 'collection' = whole set, 'any' = neutral */
    scope?: 'record' | 'collection' | 'any';
    sort?: number;
    params: ParamSpec[];
    /** template JS, authored against the injected `$p` (params) and `ctx` */
    body: string;
    /**
     * when true, the generated code is `params.code` verbatim (no `$p` prefix,
     * `body` ignored) — for free-form JS templates.
     */
    rawCode?: boolean;
    /**
     * called when the config is saved; may perform API side effects (e.g.
     * register a SQL template via flowSql:save) and return extra params to merge
     * before code generation (e.g. the registered sqlUid).
     */
    onSave?: (ctx: any, params: Record<string, any>) => Promise<Record<string, any> | void>;
}
