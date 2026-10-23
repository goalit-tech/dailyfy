# UI code generation

Run from the `dailyfy` folder:

```
npm run createuiapp                                    # asks for the project name, then the prefix
npm run createuiapp -- orders ord                      # no questions: project name, prefix
npm run createuiapp -- --projectname=orders --prefix=ord
```

The **prefix is mandatory**: exactly 3 characters (a letter, then letters or digits), unique among the
`reuseComponents` of the host. It is the prefix of the nested router of the component. Invalid input is asked again.

The SAP Fiori generator (`yo` and `@sap/generator-fiori`) is a **devDependency** of this project, so nothing is
installed globally. After a fresh checkout run `npm install`.

## What the script does

1. Generates the app with `yo @sap/fiori:headless` into a temporary folder (no questions of the generator).
2. Namespace = `namespace` from `config.json` + `.` + project name, e.g. `goalittech.ui.reuse.orders`.
3. Changes the generated `webapp` as configured in `config.json` > `webapp`:
   - **remove**: files/folders that are deleted (`remove`, relative to `webapp`).
   - **add / overwrite**: every file in `templateDir` is copied into the webapp (`__NAMESPACE__`, `__NAME__`,
     `__TITLE__`, `__HOST_PATH__` are replaced). Default: `Component.js` that extends the host `BaseComponent`.
   - The generated `manifest.json` is **not** changed (the generator already sets `sap.app.id` to the namespace).
4. Copies the result to `<targetDir>/<project name>` (e.g. `app/landingpage/webapp/reuse/orders`).
5. Registers the app in the host `component-router-config.json`: adds `componentUsages.<name>Component` and a
   `reuseComponents` entry (key, text, description, icon, usage, the prefix you entered, `eventMappings`). An existing
   entry with the same name is replaced. The dev server/build merge this file into the host manifest.

## config.json

| Key | Meaning |
|---|---|
| `namespace` | Base namespace of generated apps |
| `hostNamespace` | Namespace of the landing page (used for `BaseComponent`) |
| `targetDir` | Folder (relative to `dailyfy`) in which the project folder is created |
| `prefixLength` | Required length of the prefix (3) |
| `hostConfig` | Host file in which the app is registered (`component-router-config.json`) |
| `generator` | `floorplan`, `ui5Version`, `ui5Theme`, `enableTypeScript` passed to the generator |
| `webapp` | `remove` (files/folders to delete) and `templateDir` (files to add/overwrite) |
