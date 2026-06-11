/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var plugin_exports = {};
__export(plugin_exports, {
  PluginFlowTemplateLibraryServer: () => PluginFlowTemplateLibraryServer,
  default: () => plugin_default
});
module.exports = __toCommonJS(plugin_exports);
var import_server = require("@nocobase/server");
class PluginFlowTemplateLibraryServer extends import_server.Plugin {
  async load() {
    this.db.collection({
      name: "jsTemplates",
      title: "JS Templates",
      shared: true,
      fields: [
        { type: "string", name: "key", unique: true, allowNull: false },
        { type: "string", name: "label" },
        { type: "text", name: "description" },
        { type: "string", name: "icon" },
        { type: "string", name: "kind" },
        // block | item | action | column
        { type: "json", name: "alsoKinds" },
        { type: "string", name: "scope" },
        // record | collection | any
        { type: "string", name: "category" },
        { type: "json", name: "scenes" },
        { type: "integer", name: "sort" },
        { type: "boolean", name: "logicOnly" },
        { type: "json", name: "params" },
        { type: "text", name: "body" },
        { type: "boolean", name: "rawCode" },
        // false → hide this key from the gallery (works for built-ins too)
        { type: "boolean", name: "enabled" },
        // free-form note shown in the admin page (who added it / why)
        { type: "text", name: "note" }
      ]
    });
    this.db.collection({
      name: "jsTemplateUsage",
      title: "JS Template Usage",
      shared: true,
      fields: [
        { type: "string", name: "key", unique: true, allowNull: false },
        { type: "integer", name: "count", defaultValue: 0 },
        { type: "date", name: "lastUsedAt" }
      ]
    });
    this.app.acl.allow("jsTemplates", ["list", "get"], "loggedIn");
    this.app.acl.allow("jsTemplateUsage", ["list", "get", "updateOrCreate"], "loggedIn");
    this.app.on("afterStart", async () => {
      await this.syncTables();
    });
  }
  async install() {
    await this.syncTables();
  }
  async syncTables() {
    for (const name of ["jsTemplates", "jsTemplateUsage"]) {
      const collection = this.db.getCollection(name);
      if (collection && !await collection.existsInDb()) {
        await collection.sync();
      }
    }
  }
}
var plugin_default = PluginFlowTemplateLibraryServer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PluginFlowTemplateLibraryServer
});
