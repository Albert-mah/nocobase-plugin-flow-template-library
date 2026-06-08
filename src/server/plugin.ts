import { Plugin } from '@nocobase/server';

/**
 * Phase 1: the template library lives entirely on the client (templates are
 * source-defined). The server plugin is a stub so the package loads.
 *
 * Phase 2 will add a `jsTemplates` collection + actions here so templates can be
 * authored as data without rebuilding the plugin.
 */
export class PluginFlowTemplateLibraryServer extends Plugin {
  async load() {}
}

export default PluginFlowTemplateLibraryServer;
