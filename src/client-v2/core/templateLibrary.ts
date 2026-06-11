import { templates as builtinTemplates } from '../templates';
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

const OVERRIDABLE: (keyof JsTemplateRow & keyof Template)[] = [
  'label', 'description', 'icon', 'kind', 'alsoKinds', 'scope', 'category',
  'scenes', 'sort', 'logicOnly', 'params', 'body', 'rawCode',
];

export type LibrarySource = 'builtin' | 'override' | 'custom';

function applyRow(base: Template | undefined, row: JsTemplateRow): Template | null {
  const merged: any = base ? { ...base } : { key: row.key, scope: 'any', category: 'Custom', params: [] };
  for (const f of OVERRIDABLE) {
    const v = (row as any)[f];
    if (v !== null && v !== undefined) merged[f] = v;
  }
  // a usable template needs at least these
  if (!merged.label || !merged.kind || (!merged.body && !merged.rawCode)) return null;
  return merged as Template;
}

// the plugin entry hands us the app's APIClient so UI (admin page) doesn't
// depend on v1/v2-specific hooks
let libApi: any = null;
export function setLibraryApi(api: any) {
  libApi = api;
}
export function getLibraryApi() {
  return libApi;
}

let rowsCache: JsTemplateRow[] = [];
let merged: Template[] = [...builtinTemplates];
const listeners = new Set<() => void>();

function rebuild() {
  const map = new Map<string, Template>(builtinTemplates.map((t) => [t.key, t]));
  for (const row of rowsCache) {
    if (!row?.key) continue;
    if (row.enabled === false) {
      map.delete(row.key);
      continue;
    }
    const t = applyRow(map.get(row.key), row);
    if (t) map.set(row.key, t);
  }
  merged = [...map.values()];
  listeners.forEach((fn) => fn());
}

/** current merged library (sync — built-ins until rows arrive) */
export function getLibrary(): Template[] {
  return merged;
}

export function getRows(): JsTemplateRow[] {
  return rowsCache;
}

export function sourceOf(key: string): LibrarySource {
  const hasRow = rowsCache.some((r) => r.key === key);
  const isBuiltin = builtinTemplates.some((t) => t.key === key);
  if (hasRow && isBuiltin) return 'override';
  if (hasRow) return 'custom';
  return 'builtin';
}

export function isBuiltin(key: string): boolean {
  return builtinTemplates.some((t) => t.key === key);
}

export function onLibraryChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** fetch overlay rows and rebuild the merged list; safe to call repeatedly */
export async function loadLibrary(api: any): Promise<Template[]> {
  if (!api) return merged;
  try {
    const [res, usageRes] = await Promise.all([
      api.request({ url: 'jsTemplates:list', params: { pageSize: 500, sort: ['key'] } }),
      api.request({ url: 'jsTemplateUsage:list', params: { pageSize: 1000 } }).catch(() => null),
    ]);
    rowsCache = res?.data?.data || [];
    usage = {};
    for (const u of usageRes?.data?.data || []) {
      if (u?.key) usage[u.key] = u.count || 0;
    }
    rebuild();
  } catch (e) {
    // table missing / no permission → built-ins only
  }
  return merged;
}

// ---- usage ranking ------------------------------------------------------------
// most-used templates rank first in the gallery (usage desc, then curated sort)

let usage: Record<string, number> = {};

export function getUsage(): Record<string, number> {
  return usage;
}

export function usageOf(key: string): number {
  return usage[key] || 0;
}

/** bump locally (live re-rank) and persist best-effort */
export function bumpUsage(api: any, key: string) {
  if (!key) return;
  usage[key] = (usage[key] || 0) + 1;
  listeners.forEach((fn) => fn());
  if (!api) return;
  api
    .request({
      url: 'jsTemplateUsage:updateOrCreate',
      method: 'post',
      params: { filterKeys: ['key'] },
      data: { key, count: usage[key], lastUsedAt: new Date().toISOString() },
    })
    .catch(() => {});
}

// ---- import / export packs ---------------------------------------------------

export const TEMPLATE_PACK_MAGIC = 'templates';

export function exportPack(rows: JsTemplateRow[]) {
  return {
    __jsTpl: TEMPLATE_PACK_MAGIC,
    version: 1,
    exportedAt: new Date().toISOString(),
    templates: rows.map((r) => {
      const { id, updatedAt, ...rest } = r as any;
      return rest;
    }),
  };
}

/** full library snapshot (built-ins materialized) — for sharing across instances */
export function exportLibrarySnapshot() {
  return {
    __jsTpl: TEMPLATE_PACK_MAGIC,
    version: 1,
    exportedAt: new Date().toISOString(),
    templates: merged.map((t) => ({
      key: t.key, label: t.label, description: t.description, icon: t.icon,
      kind: t.kind, alsoKinds: t.alsoKinds, scope: t.scope, category: t.category,
      scenes: t.scenes, sort: t.sort, logicOnly: t.logicOnly, params: t.params,
      body: t.body, rawCode: t.rawCode,
    })),
  };
}

export function parseTemplatePack(text: string): JsTemplateRow[] {
  const doc = JSON.parse(text);
  let list: any[];
  if (doc && doc.__jsTpl === TEMPLATE_PACK_MAGIC && Array.isArray(doc.templates)) list = doc.templates;
  else if (Array.isArray(doc)) list = doc;
  else if (doc && typeof doc === 'object' && doc.key) list = [doc];
  else throw new Error('Not a template pack (expect {__jsTpl:"templates", templates:[...]} or a template object)');
  const rows = list.filter((r) => r && typeof r.key === 'string' && r.key.trim());
  if (!rows.length) throw new Error('No templates with a valid "key" found');
  return rows;
}

/** upsert pack rows into jsTemplates by key */
export async function importRows(api: any, rows: JsTemplateRow[]) {
  let ok = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      await api.request({
        url: 'jsTemplates:updateOrCreate',
        method: 'post',
        params: { filterKeys: ['key'] },
        data: row,
      });
      ok++;
    } catch (e: any) {
      errors.push(row.key + ': ' + (e?.response?.data?.errors?.[0]?.message || e?.message || 'failed'));
    }
  }
  await loadLibrary(api);
  return { ok, errors };
}
