import { Plugin, tval } from '@nocobase/client';
import { TemplateLibraryAdmin } from './core/AdminPage';
import { loadLibrary } from './core/templateLibrary';
import { NS } from './locale';
import models from './models';

export class PluginFlowTemplateLibraryClient extends Plugin {
  async load() {
    // Register every template as its own FlowModel subclass so it shows up in
    // the native "Add block / action / item" menus alongside the built-ins.
    this.flowEngine.registerModels(models);

    // template management (import / export / overrides) in admin settings
    this.app.pluginSettingsManager.add('flow-template-library', {
      title: tval('JS Template Library', { ns: NS }),
      icon: 'AppstoreOutlined',
      Component: TemplateLibraryAdmin,
    });

    // warm the overlay (jsTemplates rows merged over code built-ins); the
    // picker also refreshes on open, this just removes first-open lag
    loadLibrary(this.app.apiClient).catch(() => {});
  }
}

export default PluginFlowTemplateLibraryClient;
