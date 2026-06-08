import { JSBlockModel, JSItemActionModel, JSItemModel } from '@nocobase/client';
import { ModelConstructor } from '@nocobase/flow-engine';
import { tExpr } from '../locale';
import { templates } from '../templates';
import { generateCode } from './generateCode';
import { makeTemplatePicker } from './TemplatePicker';
import { TemplateKind } from './types';

function baseModelFor(kind: TemplateKind): any {
  if (kind === 'action') return JSItemActionModel;
  if (kind === 'item') return JSItemModel;
  return JSBlockModel;
}

const LABELS: Record<TemplateKind, string> = {
  block: 'JS Template',
  action: 'JS Template (action)',
  item: 'JS Template (item)',
};

/**
 * One catalog entry per menu type (block / action / item). Picking it opens a
 * preset dialog that shows a template gallery; choosing a template reveals its
 * options inline. On save we generate the code and write it into the native JS
 * slot (`stepParams.jsSettings.runJs.code`), so it renders like any JS block.
 */
export function defineGalleryModel(kind: TemplateKind): { name: string; model: ModelConstructor } | null {
  // skip a menu type that has no templates yet
  if (!templates.some((t) => t.kind === kind)) return null;

  const Base = baseModelFor(kind);
  class GalleryModel extends Base {}
  const className = `JsTemplate_${kind}`;
  Object.defineProperty(GalleryModel, 'name', { value: className });

  const TemplatePicker = makeTemplatePicker(kind);

  (GalleryModel as any).define({
    label: tExpr(LABELS[kind]),
    sort: 700,
    createModelOptions: { use: className },
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
        uiMode: { type: 'drawer', props: { width: 720 } },
        defaultParams: (ctx: any) => {
          const saved = ctx.model.getStepParams?.('tplSettings', 'config');
          return { config: saved?.config };
        },
        handler(ctx: any, params: any) {
          const value = params?.config;
          if (!value || !value.templateKey) return;
          ctx.model.setStepParams('tplSettings', 'config', { config: value });
          const tpl = templates.find((t) => t.key === value.templateKey);
          if (!tpl) return;
          const code = generateCode(tpl, value.params || {});
          const current = ctx.model.getStepParams?.('jsSettings', 'runJs')?.code;
          if (current !== code) {
            ctx.model.setStepParams('jsSettings', 'runJs', { version: 'v2', code });
          }
        },
      },
    },
  });

  return { name: className, model: GalleryModel as ModelConstructor };
}
