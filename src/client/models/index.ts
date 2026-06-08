import { ModelConstructor } from '@nocobase/flow-engine';
import { defineGalleryModel } from '../core/defineGalleryModel';
import { TemplateKind } from '../core/types';

const models: Record<string, ModelConstructor> = {};

// one gallery entry per menu type that has templates (block / action / item)
(['block', 'action', 'item'] as TemplateKind[]).forEach((kind) => {
  const def = defineGalleryModel(kind);
  if (def) models[def.name] = def.model;
});

export default models;
