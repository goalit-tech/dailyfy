sap.ui.define([
	"__HOST_PATH__/base/BaseComponent"
], function(BaseComponent) {
	"use strict";

	return BaseComponent.extend("__NAMESPACE__.Component", {
		metadata: {
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"]
		}
	});
});
