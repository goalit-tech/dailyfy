# UI code generation

Scripts (run from the `dailyfy` folder):

| Command | What it does |
|---|---|
| `npm run createuiapp -- <name>` | Creates `app/landingpage/webapp/reuse/<name>` (namespace `goalittech.ui.reuse.<name>`). Without a name it asks for it. `npm run createuiapp --projectname=<name>` works as well. |
| `npm run updateuiversions` | Updates `ui/versions.json` (latest SAPUI5, matching manifest `_version`). |
| `npm run updateversions` | Same, and additionally updates the UI5 version in the existing `ui5*.yaml` / `minUI5Version` and the `package.json` dependencies of the project. Add `-- --dry-run` to only show the changes. |

- `ui/config.json` - base namespace, target folder and UI5 libraries of generated apps.
- `ui/versions.json` - UI5 / manifest versions used by every generated app.
- `ui/templates/reuse-app` - files of a generated app; `__NAMESPACE__`, `__TITLE__`, ... are replaced, the
  namespace, versions and libraries are written into the generated `manifest.json`.

The script prints the entries to add to the host `webapp/manifest.json` (`componentUsages`, `reuseComponents`);
the host is not changed automatically.
