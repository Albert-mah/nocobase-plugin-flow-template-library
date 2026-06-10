import { TemplateKind } from './types';
/**
 * User-saved template configurations ("presets"). A preset captures a chosen
 * template + its filled-in params under a friendly name, so a tuned component
 * (e.g. a KPI card already pointed at the right collection with a theme) can be
 * re-applied in one click.
 *
 * Phase 1 storage is the browser's localStorage — zero backend, per-browser.
 * Export / import (single config or the whole pack as JSON) is the migration
 * path across browsers/instances. Phase 2 can swap loadPresets/savePreset to a
 * `jsTemplates` collection without touching the picker UI.
 */
export interface TplPreset {
    id: string;
    name: string;
    icon?: string;
    templateKey: string;
    /** host the preset was saved from — used to hint compatibility on apply */
    kind: TemplateKind;
    params: Record<string, any>;
    createdAt: number;
}
/** the portable shape for a single exported config (no id/createdAt noise) */
export interface TplConfigDoc {
    __jsTpl: 'config';
    version: 1;
    templateKey: string;
    kind?: TemplateKind;
    name?: string;
    icon?: string;
    params: Record<string, any>;
}
export interface TplPackDoc {
    __jsTpl: 'pack';
    version: 1;
    presets: TplPreset[];
}
export declare function loadPresets(): TplPreset[];
export declare function savePreset(input: Omit<TplPreset, 'id' | 'createdAt'>): TplPreset;
export declare function deletePreset(id: string): void;
export declare function renamePreset(id: string, name: string): void;
export declare function configToDoc(cfg: {
    templateKey: string;
    kind?: TemplateKind;
    name?: string;
    icon?: string;
    params: Record<string, any>;
}): TplConfigDoc;
export declare function packToDoc(): TplPackDoc;
/** merge an imported pack into local presets (dedup by id), returns count added */
export declare function importPack(doc: any): number;
/** accept either a single-config doc or a pack; normalize to {config?} | {pack added} */
export declare function parseImport(text: string): {
    kind: 'config';
    doc: TplConfigDoc;
} | {
    kind: 'pack';
    doc: TplPackDoc;
};
/** trigger a browser download of a JSON document */
export declare function downloadJson(filename: string, obj: any): void;
