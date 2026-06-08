import { Plugin } from '@nocobase/client';
import models from './models';

export class PluginFlowTemplateLibraryClient extends Plugin {
  async load() {
    // Register every template as its own FlowModel subclass so it shows up in
    // the native "Add block / action / item" menus alongside the built-ins.
    this.flowEngine.registerModels(models);
  }
}

export default PluginFlowTemplateLibraryClient;
