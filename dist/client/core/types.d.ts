/**
 * The template contract — shared between phase 1 (source-defined templates) and
 * phase 2 (DB-driven templates). Keep it stable.
 */
export type ParamType = 'field' | 'fields' | 'targetBlock' | 'collection' | 'text' | 'number' | 'select' | 'boolean';
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
}
export type TemplateKind = 'block' | 'action' | 'item';
export interface Template {
    /** unique; becomes the model class name suffix (JsTpl_<key>) and filter-group key */
    key: string;
    kind: TemplateKind;
    /** i18n key, shown as the menu entry label */
    label: string;
    /** menu group label (i18n key) */
    group?: string;
    sort?: number;
    params: ParamSpec[];
    /** template JS, authored against the injected `$p` (params) and `ctx` */
    body: string;
}
