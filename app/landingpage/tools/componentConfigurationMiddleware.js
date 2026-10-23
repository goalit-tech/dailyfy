"use strict";

const mergeComponentConfiguration = require("./mergeComponentConfiguration");

/**
 * Dev server middleware: answers every request for /manifest.json of the app with the
 * manifest merged with component-router-config.json. The configuration is read on every
 * request, so changes are picked up with a simple browser reload.
 */
module.exports = function ({ resources }) {
	return async function (req, res, next) {
		const sPath = req.path || (req.url || "").split("?")[0];
		if (sPath !== "/manifest.json") {
			return next();
		}

		try {
			const oManifest = await resources.rootProject.byPath("/manifest.json");
			const oConfiguration = await resources.rootProject.byPath("/component-router-config.json");
			if (!oManifest || !oConfiguration) {
				return next();
			}

			const sMerged = mergeComponentConfiguration(await oManifest.getString(), await oConfiguration.getString());
			res.setHeader("Content-Type", "application/json; charset=UTF-8");
			res.setHeader("Cache-Control", "no-cache");
			res.end(sMerged);
		} catch (oError) {
			next(oError);
		}
	};
};
