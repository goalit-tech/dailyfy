"use strict";

const mergeComponentConfiguration = require("./mergeComponentConfiguration");

/**
 * Build task: writes the manifest merged with component-router-config.json into the
 * build result, so that the deployed app contains the complete manifest.
 */
module.exports = async function ({ workspace, options }) {
	const sRoot = `/resources/${options.projectNamespace}`;
	const [oManifest, oConfiguration] = await Promise.all([
		workspace.byPath(`${sRoot}/manifest.json`),
		workspace.byPath(`${sRoot}/component-router-config.json`)
	]);
	if (!oManifest || !oConfiguration) {
		return;
	}

	oManifest.setString(mergeComponentConfiguration(await oManifest.getString(), await oConfiguration.getString()));
	await workspace.write(oManifest);
};
