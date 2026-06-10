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

    // the picker fetches the overlay list as whoever is configuring the UI
    this.app.acl.allow('jsTemplates', ['list', 'get'], 'loggedIn');

    // retrofit: create the table when the plugin was enabled before this
    // version (fresh installs get it via install() → collection.sync)
    this.app.on('afterStart', async () => {
      const collection = this.db.getCollection('jsTemplates');
      if (collection && !(await collection.existsInDb())) {
        await collection.sync();
      }
    });
  }

  async install() {
    const collection = this.db.getCollection('jsTemplates');
    if (collection && !(await collection.existsInDb())) {
      await collection.sync();
    }
  }
}

export default PluginFlowTemplateLibraryServer;
