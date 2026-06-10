import { ModelConstructor } from '@nocobase/flow-engine';
import { TemplateKind } from './types';
/**
 * One catalog entry per menu type (block / action / item). Picking it opens a
 * preset dialog that shows a template gallery; choosing a template reveals its
 * options inline. On save we generate the code and write it into the native JS
 * slot (`stepParams.jsSettings.runJs.code`), so it renders like any JS block.
 */
export declare function defineGalleryModel(kind: TemplateKind): {
    name: string;
    model: ModelConstructor;
} | null;
