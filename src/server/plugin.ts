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
export class PluginFlowTemplateLibraryServer extends Plugin {
  async load() {
    this.db.collection({
      name: 'jsTemplates',
      title: 'JS Templates',
      shared: true,
      fields: [
        { type: 'string', name: 'key', unique: true, allowNull: false },
        { type: 'string', name: 'label' },
        { type: 'text', name: 'description' },
        { type: 'string', name: 'icon' },
        { type: 'string', name: 'kind' }, // block | item | action | column
        { type: 'json', name: 'alsoKinds' },
        { type: 'string', name: 'scope' }, // record | collection | any
        { type: 'string', name: 'category' },
        { type: 'json', name: 'scenes' },
        { type: 'integer', name: 'sort' },
        { type: 'boolean', name: 'logicOnly' },
        { type: 'json', name: 'params' },
        { type: 'text', name: 'body' },
        { type: 'boolean', name: 'rawCode' },
        // false → hide this key from the gallery (works for built-ins too)
        { type: 'boolean', name: 'enabled' },
        // free-form note shown in the admin page (who added it / why)
        { type: 'text', name: 'note' },
      ],
    });

    // per-template usage counters — most-used templates rank first in the
    // gallery; counted when a UI configurer picks a template
    this.db.collection({
      name: 'jsTemplateUsage',
      title: 'JS Template Usage',
      shared: true,
      fields: [
        { type: 'string', name: 'key', unique: true, allowNull: false },
        { type: 'integer', name: 'count', defaultValue: 0 },
        { type: 'date', name: 'lastUsedAt' },
      ],
    });

    // the picker fetches the overlay list as whoever is configuring the UI
    this.app.acl.allow('jsTemplates', ['list', 'get'], 'loggedIn');
    // counters are written by whoever configures the UI
    this.app.acl.allow('jsTemplateUsage', ['list', 'get', 'updateOrCreate'], 'loggedIn');

    // retrofit: create the tables when the plugin was enabled before this
    // version (fresh installs get them via install() → collection.sync)
    this.app.on('afterStart', async () => {
      await this.syncTables();
    });
  }

  async install() {
    await this.syncTables();
  }

  private async syncTables() {
    for (const name of ['jsTemplates', 'jsTemplateUsage']) {
      const collection = this.db.getCollection(name);
      if (collection && !(await collection.existsInDb())) {
        await collection.sync();
      }
    }
  }
}

export default PluginFlowTemplateLibraryServer;
