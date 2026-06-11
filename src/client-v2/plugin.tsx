import { Plugin } from '@nocobase/client-v2';
import { loadLibrary, setLibraryApi } from './core/templateLibrary';
import models from './models';

export class PluginFlowTemplateLibraryClient extends Plugin {
  async load() {
    // Register every template as its own FlowModel subclass so it shows up in
    // the native "Add block / action / item" menus alongside the built-ins.
    this.flowEngine.registerModels(models);

    // template management (import / export / overrides) in admin settings
    const title = 'JS Template Library';
    this.pluginSettingsManager.addMenuItem({
      key: 'flow-template-library',
      title,
      icon: 'AppstoreOutlined',
    });
    this.pluginSettingsManager.addPageTabItem({
      menuKey: 'flow-template-library',
      key: 'index',
      title,
      componentLoader: () => import('./core/AdminPage'),
    });

    // warm the overlay (jsTemplates rows merged over code built-ins); the
    // picker also refreshes on open, this just removes first-open lag
    setLibraryApi(this.app.apiClient);
    loadLibrary(this.app.apiClient).catch(() => {});
  }
}

export default PluginFlowTemplateLibraryClient;
