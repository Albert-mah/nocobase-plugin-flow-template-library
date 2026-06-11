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

const KEY = 'jstpl:presets:v1';

function store(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadPresets(): TplPreset[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((p) => p && p.templateKey) : [];
  } catch {
    return [];
  }
}

function persist(list: TplPreset[]) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — silently ignore, presets are best-effort */
  }
}

function uid(): string {
  return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function savePreset(input: Omit<TplPreset, 'id' | 'createdAt'>): TplPreset {
  const list = loadPresets();
  const rec: TplPreset = { ...input, id: uid(), createdAt: Date.now() };
  list.unshift(rec);
  persist(list);
  return rec;
}

export function deletePreset(id: string) {
  persist(loadPresets().filter((p) => p.id !== id));
}

export function renamePreset(id: string, name: string) {
  persist(loadPresets().map((p) => (p.id === id ? { ...p, name } : p)));
}

// ---- single-config export / import ----------------------------------------

export function configToDoc(cfg: { templateKey: string; kind?: TemplateKind; name?: string; icon?: string; params: Record<string, any> }): TplConfigDoc {
  return {
    __jsTpl: 'config',
    version: 1,
    templateKey: cfg.templateKey,
    kind: cfg.kind,
    name: cfg.name,
    icon: cfg.icon,
    params: cfg.params || {},
  };
}

// ---- whole-pack export / import (migration) -------------------------------

export function packToDoc(): TplPackDoc {
  return { __jsTpl: 'pack', version: 1, presets: loadPresets() };
}

/** merge an imported pack into local presets (dedup by id), returns count added */
export function importPack(doc: any): number {
  if (!doc || doc.__jsTpl !== 'pack' || !Array.isArray(doc.presets)) {
    throw new Error('Not a valid preset pack');
  }
  const list = loadPresets();
  const seen = new Set(list.map((p) => p.id));
  let added = 0;
  doc.presets.forEach((p: any) => {
    if (!p || !p.templateKey) return;
    const rec: TplPreset =
      p.id && !seen.has(p.id)
        ? p
        : { ...p, id: uid(), createdAt: p.createdAt || Date.now() };
    if (!seen.has(rec.id)) {
      list.push(rec);
      seen.add(rec.id);
      added++;
    }
  });
  persist(list);
  return added;
}

/** accept either a single-config doc or a pack; normalize to {config?} | {pack added} */
export function parseImport(text: string): { kind: 'config'; doc: TplConfigDoc } | { kind: 'pack'; doc: TplPackDoc } {
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }
  if (obj && obj.__jsTpl === 'config' && obj.templateKey) return { kind: 'config', doc: obj };
  if (obj && obj.__jsTpl === 'pack' && Array.isArray(obj.presets)) return { kind: 'pack', doc: obj };
  // tolerate a bare {templateKey, params} too
  if (obj && obj.templateKey) {
    return { kind: 'config', doc: configToDoc(obj) };
  }
  throw new Error('Unrecognized JSON — expected an exported config or preset pack');
}

/** trigger a browser download of a JSON document */
export function downloadJson(filename: string, obj: any) {
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* non-browser env — ignore */
  }
}
