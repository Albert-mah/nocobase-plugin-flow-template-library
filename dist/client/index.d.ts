import { Plugin } from '@nocobase/client';
/**
 * v1-lane entry — the embedded (v1 shell + flow engine) deployment loads THIS
 * bundle for every enabled plugin: register the flow models AND the settings
 * page through the v1 pluginSettingsManager API. The client-v2 lane registers
 * the same things through the v2 API for the standalone v2 app.
 */
export declare class PluginFlowTemplateLibraryClient extends Plugin {
    load(): Promise<void>;
}
export default PluginFlowTemplateLibraryClient;
