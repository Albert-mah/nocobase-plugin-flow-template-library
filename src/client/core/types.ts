/**
 * The template contract — shared between phase 1 (source-defined templates) and
 * phase 2 (DB-driven templates). Keep it stable.
 */

export type ParamType =
  | 'field' // single field of a collection
  | 'fields' // multiple fields of a collection
  | 'targetBlock' // pick a sibling data block on the page by uid
  | 'collection' // pick a collection by name
  | 'text'
  | 'number'
  | 'select'
  | 'boolean';

export interface ParamSpec {
  name: string;
  type: ParamType;
  /** i18n key, shown as the form label */
  label: string;
  required?: boolean;
  default?: any;
  /** options for `select` */
  options?: { label: string; value: any }[];
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
  /** shown as the gallery card title */
  label: string;
  /** shown as the gallery card subtitle */
  description?: string;
  /** emoji/icon shown on the gallery card */
  icon?: string;
  sort?: number;
  params: ParamSpec[];
  /** template JS, authored against the injected `$p` (params) and `ctx` */
  body: string;
}
