import fs from "node:fs";
import path from "node:path";

// name of the app below app/ that hosts the reuse components
export const HOST_APP = "landingpage";
export const APP_DIR = path.resolve(import.meta.dirname, "../../app");
export const CONFIG_FILE = path.join(APP_DIR, "component-router-config.json");

/**
 * Merges app/component-router-config.json into the content of the manifest.json of the host app:
 * - "componentUsages"  -> sap.ui5/componentUsages
 * - "reuseComponents"  -> sap.ui5/config/reuseComponents
 *
 * @param {string} sManifest Raw content of manifest.json
 * @param {string} sConfiguration Raw content of component-router-config.json
 * @returns {string} The merged manifest as JSON string
 */
export function mergeComponentConfiguration(sManifest, sConfiguration) {
	const oManifest = JSON.parse(sManifest);
	const oConfiguration = JSON.parse(sConfiguration);
	const oUi5 = (oManifest["sap.ui5"] = oManifest["sap.ui5"] || {});

	if (oConfiguration.componentUsages) {
		oUi5.componentUsages = Object.assign({}, oUi5.componentUsages, oConfiguration.componentUsages);
	}
	if (oConfiguration.reuseComponents) {
		oUi5.config = Object.assign({}, oUi5.config, { reuseComponents: oConfiguration.reuseComponents });
	}

	return JSON.stringify(oManifest, null, 2);
}

/**
 * CAP bootstrap handler (server.js): cds serves app/<name>/webapp statically, so the merge has to
 * be done here. Both files are read on every request, so changes are picked up with a browser reload.
 *
 * @param {object} app The express app provided by the cds "bootstrap" event
 */
export function cdsMiddleware(app) {
	const sManifest = path.join(APP_DIR, HOST_APP, "webapp", "manifest.json");

	app.get(`/${HOST_APP}/webapp/manifest.json`, (req, res, next) => {
		if (!fs.existsSync(sManifest) || !fs.existsSync(CONFIG_FILE)) {
			return next();
		}

		try {
			const sMerged = mergeComponentConfiguration(
				fs.readFileSync(sManifest, "utf8"),
				fs.readFileSync(CONFIG_FILE, "utf8")
			);
			res.set({ "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-cache" });
			res.send(sMerged);
		} catch (oError) {
			next(oError);
		}
	});
}

/**
 * Dev server middleware of "ui5 serve" / "fiori run": answers every request for /manifest.json
 * with the merged manifest.
 */
function ui5Middleware({ resources }) {
	return async function (req, res, next) {
		const sPath = req.path || (req.url || "").split("?")[0];
		if (sPath !== "/manifest.json") {
			return next();
		}

		try {
			const oManifest = await resources.rootProject.byPath("/manifest.json");
			if (!oManifest || !fs.existsSync(CONFIG_FILE)) {
				return next();
			}

			const sMerged = mergeComponentConfiguration(await oManifest.getString(), fs.readFileSync(CONFIG_FILE, "utf8"));
			res.setHeader("Content-Type", "application/json; charset=UTF-8");
			res.setHeader("Cache-Control", "no-cache");
			res.end(sMerged);
		} catch (oError) {
			next(oError);
		}
	};
}

/**
 * Build task of "ui5 build": writes the merged manifest into the build result, so that the
 * deployed app contains the complete manifest.
 */
async function ui5Task({ workspace, options }) {
	const oManifest = await workspace.byPath(`/resources/${options.projectNamespace}/manifest.json`);
	if (!oManifest || !fs.existsSync(CONFIG_FILE)) {
		return;
	}

	oManifest.setString(mergeComponentConfiguration(await oManifest.getString(), fs.readFileSync(CONFIG_FILE, "utf8")));
	await workspace.write(oManifest);
}

/**
 * Default export used by ui5.yaml for both the custom middleware and the custom task, as UI5
 * loads only the default export of an extension module. A task is called with a "workspace".
 */
export default function (oParameters) {
	return oParameters.workspace ? ui5Task(oParameters) : ui5Middleware(oParameters);
}
