# NocoBase Plugin: JS Template Library

Turn "write JS on a page" into "browse a gallery and pick a component" — this plugin registers a **JS Template** entry in NocoBase's native add menus (add block / form item / table action / table column). Picking it opens a visual gallery of 50+ templates; configure with native metadata-driven forms (collections, fields, relations, target blocks) and the choices are injected as `$p.*` variables into generated JS written into the native RunJS slot.

> Target line: **NocoBase 2.x v2 UI (flow engine)** — built against `v2.1.0-alpha.47`. Main client code lives in `src/client-v2`; `src/client` is the v1-lane entry the embedded deployment loads (registers the same models + settings page through the v1 API).

## Highlights

- **52 built-in templates** across four hosts: KPI cards, distribution bars, progress goals, leaderboards, timelines, heatmaps, donut charts, phone-mock post previews, record summaries, cross-block linked filters, form-linkage tools (auto-fill / subtotal / drive filters), table column renderers, and more
- **Multi-condition filter family** — options built with the native Data Scope editor (relation paths, variables, nested AND/OR), or SQL (id set), or JS (filter JSON); inline pills/segmented/tabs, stat cards with live counts, side menu with badges
- **18 visual themes + per-template style variants**, all picked from thumbnail walls that re-skin live
- **Templates as data** — a `jsTemplates` collection overlays the built-ins by `key`: add custom templates, override built-ins field-by-field, or hide them. Built-ins ship in code, so plugin upgrades never fight your data
- **Admin page** (Settings → JS Template Library): full CRUD, JSON import/export (single pack or full library snapshot), usage-count column
- **Usage-based ranking** — most-used templates rise to the top of the gallery
- Hand-edit detection with one-click **detach** (keep your edited JS, drop the template binding)

## Install

Build the tgz inside a NocoBase source tree of the matching version line:

```bash
yarn build @albert/plugin-flow-template-library --tar
# → storage/tar/@albert/plugin-flow-template-library-<version>.tgz
```

Upload via plugin manager (`pm:add` with the tgz), enable, and restart the app (server collections register at install/start).

⚠️ The `jsTemplates.body` field is JavaScript executed in the browser of whoever uses a template — keep write access to that collection admin-only (the plugin grants only `list`/`get` to logged-in users by default).

## License

MIT
