sap.ui.define([
	"goalittech/ui/base/BaseComponent"
], function(BaseComponent) {
	"use strict";

	return BaseComponent.extend("goalittech.ui.reuse.milkcalendar.Component", {
		metadata: {
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"]
		}
	});
});
