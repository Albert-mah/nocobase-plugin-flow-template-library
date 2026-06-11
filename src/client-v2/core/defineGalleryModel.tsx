import { JSBlockModel, JSColumnModel, JSItemActionModel, JSItemModel } from '@nocobase/client-v2';
import { ModelConstructor } from '@nocobase/flow-engine';
import { tExpr } from '../locale';
import { templates } from '../templates';
import { getLibrary } from './templateLibrary';
import { generateCode, hashCode } from './generateCode';
import { resolveThemeTokens } from './themes';
import { makeTemplatePicker } from './TemplatePicker';
import { TemplateKind } from './types';

function baseModelFor(kind: TemplateKind): any {
  if (kind === 'action') return JSItemActionModel;
  if (kind === 'item') return JSItemModel;
  if (kind === 'column') return JSColumnModel;
  return JSBlockModel;
}

const LABELS: Record<TemplateKind, string> = {
  block: 'JS Template',
  action: 'JS Template (action)',
  item: 'JS Template (item)',
  column: 'JS Template (column)',
};

/**
 * One catalog entry per menu type (block / action / item). Picking it opens a
 * preset dialog that shows a template gallery; choosing a template reveals its
 * options inline. On save we generate the code and write it into the native JS
 * slot (`stepParams.jsSettings.runJs.code`), so it renders like any JS block.
 */
export function defineGalleryModel(kind: TemplateKind): { name: string; model: ModelConstructor } | null {
  // skip a menu type that has no templates yet
  if (!templates.some((t) => t.kind === kind || (t.alsoKinds || []).includes(kind))) return null;

  const Base = baseModelFor(kind);
  class GalleryModel extends Base {}
  const className = `JsTemplate_${kind}`;
  Object.defineProperty(GalleryModel, 'name', { value: className });

  const TemplatePicker = makeTemplatePicker(kind);

  (GalleryModel as any).define({
    label: tExpr(LABELS[kind]),
    sort: 700,
    createModelOptions:
      kind === 'column'
        ? // a custom column needs a header title seed
          { use: className, stepParams: { tableColumnSettings: { title: { title: 'JS' } } } }
        : { use: className },
  });

  (GalleryModel as any).registerFlow({
    key: 'tplSettings',
    title: tExpr('JS Template'),
    sort: 0,
    steps: {
      config: {
        title: tExpr('Choose a template'),
        preset: true,
        // NOTE: uiSchema is the *properties map* directly (one field "config"),
        // not a JSON-schema { type, properties } wrapper.
        uiSchema: {
          config: {
            type: 'object',
            'x-component': TemplatePicker,
          },
        },
        uiMode: { type: 'drawer', props: { width: 1000 } },
        defaultParams: (ctx: any) => {
          const saved = ctx.model.getStepParams?.('tplSettings', 'config');
          return { config: saved?.config };
        },
        async handler(ctx: any, params: any) {
          const value = params?.config;
          // explicit detach: drop the template binding, keep the JS untouched —
          // the block degrades to a plain native JS block from here on
          if (value && value.detached) {
            ctx.model.setStepParams('tplSettings', 'config', { config: {} });
            return;
          }
          if (!value || !value.templateKey) return;
          const tpl = getLibrary().find((t) => t.key === value.templateKey);
          if (!tpl) return;
          let finalParams = value.params || {};
          // template save hook — e.g. register the SQL via flowSql:save and get back the runById uid
          if (tpl.onSave) {
            try {
              const extra = await tpl.onSave(ctx, finalParams);
              if (extra) finalParams = { ...finalParams, ...extra };
            } catch (e) {
              // surface but don't block insertion
              // eslint-disable-next-line no-console
              console.error('[js-template-library] onSave failed:', e);
            }
          }
          // inject resolved theme design-tokens so bodies can style via $p.__theme
          if (finalParams.theme !== undefined || tpl.params.some((sp) => sp.type === 'theme')) {
            finalParams = { ...finalParams, __theme: resolveThemeTokens(finalParams.theme) };
          }
          const code = generateCode(tpl, finalParams);
          const newHash = hashCode(code);
          const prevHash = ctx.model.getStepParams?.('tplSettings', 'config')?.config?.codeHash;
          const current = ctx.model.getStepParams?.('jsSettings', 'runJs')?.code;
          // this flow ALSO auto-runs on every render — when the live JS was
          // hand-edited (≠ last generated fingerprint) and the config didn't
          // change (same fingerprint), keep the manual code; only an explicit
          // reconfigure that yields different code may overwrite it
          const handEdited = !!current && prevHash != null && hashCode(current) !== prevHash;
          if (current !== code && !(handEdited && newHash === prevHash)) {
            ctx.model.setStepParams('jsSettings', 'runJs', { version: 'v2', code });
          }
          // persist config + a fingerprint of the generated code → manual JS
          // edits are detected as drift the next time the dialog opens
          ctx.model.setStepParams('tplSettings', 'config', { config: { ...value, codeHash: newHash } });
          // the block badge / designer shows the component name, not "JS Template"
          try {
            if (typeof ctx.model.setTitle === 'function') ctx.model.setTitle(tpl.label);
          } catch (e) { /* title is cosmetic — never block the save */ }
          // give a custom column a sensible header = the template label
          if (kind === 'column') {
            ctx.model.setStepParams('tableColumnSettings', 'title', { title: tpl.label });
          }
        },
      },
    },
  });

  return { name: className, model: GalleryModel as ModelConstructor };
}
