import { ModelConstructor } from '@nocobase/flow-engine';
import { Template } from './types';
/**
 * Turn a Template into a registered FlowModel subclass.
 *
 * The subclass inherits the native JS model (sandbox + rendering), so the result
 * is indistinguishable from a hand-written JS block/action/item. On top of that
 * it adds a `tplSettings.config` step that:
 *   - is `preset: true`, so it auto-opens when the user inserts the template;
 *   - has a dynamic uiSchema (field / target-block / collection pickers);
 *   - on save, persists the raw params AND writes the generated code into the
 *     native `jsSettings.runJs` slot.
 * Because the step has a uiSchema, it also shows in the gear menu for re-editing.
 */
export declare function defineTemplateModel(tpl: Template): {
    name: string;
    model: ModelConstructor;
};
