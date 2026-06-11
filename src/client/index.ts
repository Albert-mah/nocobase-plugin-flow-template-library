import { Plugin, tval } from '@nocobase/client';
import { TemplateLibraryAdmin } from '../client-v2/core/AdminPage';
import { loadLibrary, setLibraryApi } from '../client-v2/core/templateLibrary';
import models from '../client-v2/models';

/**
 * v1-lane entry — the embedded (v1 shell + flow engine) deployment loads THIS
 * bundle for every enabled plugin: register the flow models AND the settings
 * page through the v1 pluginSettingsManager API. The client-v2 lane registers
 * the same things through the v2 API for the standalone v2 app.
 */
export class PluginFlowTemplateLibraryClient extends Plugin {
  async load() {
    this.flowEngine.registerModels(models);

    this.app.pluginSettingsManager.add('flow-template-library', {
      title: tval('JS Template Library', { ns: ['@albert/plugin-flow-template-library', 'client'] }),
      icon: 'AppstoreOutlined',
      Component: TemplateLibraryAdmin,
    });

    setLibraryApi(this.app.apiClient);
    loadLibrary(this.app.apiClient).catch(() => {});
  }
}

export default PluginFlowTemplateLibraryClient;
