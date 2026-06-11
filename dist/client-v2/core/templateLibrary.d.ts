import { Template } from './types';
/**
 * The template LIBRARY = code built-ins overlaid with `jsTemplates` rows:
 *
 *   - row key matches a built-in → per-field override (row fields that are
 *     null/undefined keep the built-in value); `enabled:false` hides it
 *   - row key is new → custom template (needs at least label/kind/body)
 *
 * One mutable module-level registry feeds the picker, the gallery model's
 * preset handler and the admin page, so all of them see the same merged list.
 * Built-ins are always available synchronously; rows arrive on first fetch.
 */
export type JsTemplateRow = {
    id?: number;
    key: string;
    label?: string | null;
    description?: string | null;
    icon?: string | null;
    kind?: string | null;
    alsoKinds?: string[] | null;
    scope?: string | null;
    category?: string | null;
    scenes?: string[] | null;
    sort?: number | null;
    logicOnly?: boolean | null;
    params?: any[] | null;
    body?: string | null;
    rawCode?: boolean | null;
    enabled?: boolean | null;
    note?: string | null;
    updatedAt?: string;
};
export type LibrarySource = 'builtin' | 'override' | 'custom';
export declare function setLibraryApi(api: any): void;
export declare function getLibraryApi(): any;
/** current merged library (sync — built-ins until rows arrive) */
export declare function getLibrary(): Template[];
export declare function getRows(): JsTemplateRow[];
export declare function sourceOf(key: string): LibrarySource;
export declare function isBuiltin(key: string): boolean;
export declare function onLibraryChange(fn: () => void): () => void;
/** fetch overlay rows and rebuild the merged list; safe to call repeatedly */
export declare function loadLibrary(api: any): Promise<Template[]>;
export declare function getUsage(): Record<string, number>;
export declare function usageOf(key: string): number;
/** bump locally (live re-rank) and persist best-effort */
export declare function bumpUsage(api: any, key: string): void;
export declare const TEMPLATE_PACK_MAGIC = "templates";
export declare function exportPack(rows: JsTemplateRow[]): {
    __jsTpl: string;
    version: number;
    exportedAt: string;
    templates: any[];
};
/** full library snapshot (built-ins materialized) — for sharing across instances */
export declare function exportLibrarySnapshot(): {
    __jsTpl: string;
    version: number;
    exportedAt: string;
    templates: {
        key: string;
        label: string;
        description: string;
        icon: string;
        kind: import("./types").TemplateKind;
        alsoKinds: import("./types").TemplateKind[];
        scope: "collection" | "record" | "any";
        category: string;
        scenes: string[];
        sort: number;
        logicOnly: boolean;
        params: import("./types").ParamSpec[];
        body: string;
        rawCode: boolean;
    }[];
};
export declare function parseTemplatePack(text: string): JsTemplateRow[];
/** upsert pack rows into jsTemplates by key */
export declare function importRows(api: any, rows: JsTemplateRow[]): Promise<{
    ok: number;
    errors: string[];
}>;
