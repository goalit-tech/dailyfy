# landingpage (`goalittech.ui`)

UI5 host application that embeds reusable UI5 components (nested components with their own routers).
It only contains the UI - no backend/service is needed.

```
npm install
npm start        # http://localhost:8080/index.html
npm run build
```

## Structure

```
webapp/
  Component.js, manifest.json     host component + THE configuration
  base/BaseComponent.js           registers routes/targets/event mappings from the manifest
  base/BaseController.js
  view/, controller/              shell (side navigation) and home page (tiles)
  reuse/<name>/                   one folder per reuse component (see reuse/sample)
```

## Shared landingpage model

The host declares the `landingpage` JSON model in `webapp/manifest.json`,
with initial data in `webapp/model/landingpage.json`. Reuse component targets
enable model propagation, so their views can bind to the same model:

```xml
<Title text="{landingpage>/appTitle}" />
```

The shell's `App.controller.js` updates `/appTitle` centrally when a host
route matches. Reuse routes show the `text` from the runtime manifest's
`sap.ui5/config/reuseComponents` entry (via `getReuseComponents()`), without
reading `component-router-config.json` directly. The home page and
unknown routes restore the initial title from `landingpage.json`. This works
for tile clicks, side navigation, direct links, reloads, and browser Back/Forward.
The update waits for the initial JSON data to load so it cannot overwrite the
route-specific title afterward. Click handlers only need to navigate.

Do not declare a separate `landingpage` model in reuse components; it would
override the inherited model.

## Adding a new reuse component

1. Copy `webapp/reuse/sample` to `webapp/reuse/<name>` and replace `goalittech.ui.reuse.sample`
   with `goalittech.ui.reuse.<name>` in the copied files (`manifest.json`, `Component.js`, views, controllers, i18n).
   Adjust the views/controllers/model as needed. `Component.js` only extends `goalittech/ui/base/BaseComponent`.
2. In `webapp/manifest.json` add a usage under `sap.ui5/componentUsages`:

   ```json
   "<name>Component": { "name": "goalittech.ui.reuse.<name>", "settings": {}, "componentData": {}, "lazy": true }
   ```

3. In `webapp/manifest.json` add an entry to `sap.ui5/config/reuseComponents`:

   ```json
   {
     "key": "<name>",
     "text": "My Component",
     "description": "Shown on the home page tile",
     "icon": "sap-icon://product",
     "usage": "<name>Component",
     "prefix": "n",
     "eventMappings": []
   }
   ```

That is all - no changes to `Component.js`, views or controllers of the host. The route (`#/<key>`),
the component target, the side navigation item and the home page tile are created from this entry.

| Property | Description |
|---|---|
| `key` | route name, URL hash pattern and navigation key |
| `text`, `description`, `icon` | side navigation item and home page tile |
| `usage` | name of the entry in `componentUsages` |
| `prefix` | prefix for the nested router hash, must be unique per component |
| `title` | (optional) page title, defaults to `text` |
| `eventMappings` | (optional) navigation triggered by events of the reuse component |

## Cross-component navigation (`eventMappings`)

A reuse component can fire an event via `this.getOwnerComponent().fireEvent("toOther", { otherId: "1" })`.
The host maps it to a route in another reuse component:

```json
"eventMappings": [{
  "name": "toOther",
  "route": "other",
  "componentTargetInfo": {
    "other": { "route": "detail", "parameters": { "id": "otherId" } }
  }
}]
```

`parameters` maps a route parameter name (`id`) to the name of the event parameter (`otherId`).
Use `"forward": "eventName"` instead of `route` to pass the event on to the parent component.
Navigation inside a single reuse component needs no mapping, use its own router (`navTo`) as in `reuse/sample`.
