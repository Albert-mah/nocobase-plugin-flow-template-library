import { Plugin } from '@nocobase/server';
/**
 * Phase 2 (overlay model): the 52 built-in templates stay source-defined in the
 * client bundle; the `jsTemplates` collection stores USER rows only — new
 * custom templates, per-field overrides of built-ins (row fields left null
 * fall back to the built-in value), or `enabled:false` rows that hide a
 * built-in. The client merges code built-ins + rows by `key` at load time, so
 * there is no seed/upgrade-sync problem and built-ins survive plugin updates.
 *
 * Security: the `body` field is JS that runs in OTHER admins' browsers (RunJS
 * sandbox, caller token). Reads are open to logged-in users (the picker needs
 * the list); writes stay admin-only (no ACL grant — root / configure-ui roles).
 */
export declare class PluginFlowTemplateLibraryServer extends Plugin {
    load(): Promise<void>;
    install(): Promise<void>;
    private syncTables;
}
export default PluginFlowTemplateLibraryServer;
