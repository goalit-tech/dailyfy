"use strict";

/**
 * Merges webapp/component-router-config.json into the content of webapp/manifest.json:
 * - "componentUsages"  -> sap.ui5/componentUsages
 * - "reuseComponents"  -> sap.ui5/config/reuseComponents
 *
 * @param {string} sManifest Raw content of manifest.json
 * @param {string} sConfiguration Raw content of component-router-config.json
 * @returns {string} The merged manifest as JSON string
 */
module.exports = function mergeComponentConfiguration(sManifest, sConfiguration) {
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
};
